package com.example.notification_service.websocket;

import com.example.notification_service.repository.NotificationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;

/**
 * Upstream WebSocket endpoint, reached only by the API Gateway's proxy.
 *
 * The gateway has already authenticated the user and passes the resolved userId
 * as an attribute set during the handshake. Nothing the browser sends can
 * influence which user a session is bound to.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationWebSocketHandler extends TextWebSocketHandler {

    static final String USER_ID_ATTRIBUTE = "userId";

    private final NotificationSessionRegistry sessionRegistry;
    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;

    private Long userIdOf(WebSocketSession session) {
        Object value = session.getAttributes().get(USER_ID_ATTRIBUTE);
        return value instanceof Long userId ? userId : null;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session)
            throws Exception {

        Long userId = userIdOf(session);

        if (userId == null) {
            // Should be impossible: the handshake interceptor rejects these.
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        sessionRegistry.register(userId, session);

        // Greet with the current unread count so the badge is correct instantly.
        long unreadCount =
                notificationRepository.countByUserIdAndRead(userId, false);

        session.sendMessage(new TextMessage(
                objectMapper.writeValueAsString(Map.of(
                        "type", "CONNECTED",
                        "unreadCount", unreadCount
                ))
        ));
    }

    @Override
    protected void handleTextMessage(
            WebSocketSession session,
            TextMessage message
    ) throws Exception {

        /*
         * This channel is server-to-client only. The sole accepted client
         * message is a heartbeat; anything else is ignored rather than parsed,
         * which keeps the inbound attack surface at zero.
         */
        if ("ping".equals(message.getPayload())) {
            session.sendMessage(new TextMessage("{\"type\":\"PONG\"}"));
        }
    }

    @Override
    public void afterConnectionClosed(
            WebSocketSession session,
            CloseStatus status
    ) {
        Long userId = userIdOf(session);
        if (userId != null) {
            sessionRegistry.unregister(userId, session);
        }
    }

    @Override
    public void handleTransportError(
            WebSocketSession session,
            Throwable exception
    ) {
        log.warn("WebSocket transport error: {}", exception.getMessage());
        Long userId = userIdOf(session);
        if (userId != null) {
            sessionRegistry.unregister(userId, session);
        }
    }
}
