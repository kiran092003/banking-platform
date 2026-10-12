package com.banking_payment_platform.api_gateway.websocket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Proxies a browser's notification WebSocket through to notification-service.
 *
 * The browser only ever connects to the gateway (:8080); the upstream service
 * port is never exposed to it. The gateway has already authenticated the
 * handshake, and passes the resolved userId upstream alongside the internal
 * service key — the same trust model as the existing internal REST endpoints.
 */
@Component
public class NotificationProxyHandler extends TextWebSocketHandler {

    private static final Logger log =
            LoggerFactory.getLogger(NotificationProxyHandler.class);

    /** Browser session id -> upstream session. */
    private final Map<String, WebSocketSession> upstreamSessions =
            new ConcurrentHashMap<>();

    private final StandardWebSocketClient upstreamClient =
            new StandardWebSocketClient();

    @Value("${notification.service.ws-url:ws://localhost:8084/internal/ws/notifications}")
    private String notificationWsUrl;

    @Value("${internal.service.key}")
    private String internalServiceKey;

    @Override
    public void afterConnectionEstablished(WebSocketSession clientSession)
            throws Exception {

        Long userId = (Long) clientSession
                .getAttributes()
                .get(TicketHandshakeInterceptor.USER_ID_ATTRIBUTE);

        if (userId == null) {
            clientSession.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        WebSocketHttpHeaders headers = new WebSocketHttpHeaders();
        headers.add("X-Internal-Service-Key", internalServiceKey);
        headers.add("X-User-Id", String.valueOf(userId));

        try {

            WebSocketSession upstream = upstreamClient
                    .execute(
                            new UpstreamHandler(clientSession),
                            headers,
                            URI.create(notificationWsUrl)
                    )
                    .get();

            upstreamSessions.put(clientSession.getId(), upstream);

        } catch (Exception exception) {

            log.error(
                    "Could not open upstream notification socket. userId={}, reason={}",
                    userId,
                    exception.getMessage()
            );

            // SERVICE_RESTARTED tells the client this is retryable.
            clientSession.close(CloseStatus.SERVICE_RESTARTED);
        }
    }

    /** Client -> upstream. Only heartbeats are expected. */
    @Override
    protected void handleTextMessage(
            WebSocketSession clientSession,
            TextMessage message
    ) throws Exception {

        WebSocketSession upstream = upstreamSessions.get(clientSession.getId());

        if (upstream != null && upstream.isOpen()) {
            synchronized (upstream) {
                upstream.sendMessage(message);
            }
        }
    }

    @Override
    public void afterConnectionClosed(
            WebSocketSession clientSession,
            CloseStatus status
    ) throws Exception {

        WebSocketSession upstream =
                upstreamSessions.remove(clientSession.getId());

        if (upstream != null && upstream.isOpen()) {
            upstream.close();
        }
    }

    @Override
    public void handleTransportError(
            WebSocketSession clientSession,
            Throwable exception
    ) throws Exception {

        log.warn("WebSocket proxy transport error: {}", exception.getMessage());

        WebSocketSession upstream =
                upstreamSessions.remove(clientSession.getId());

        if (upstream != null && upstream.isOpen()) {
            upstream.close();
        }
    }

    /** Upstream -> client. */
    private static class UpstreamHandler extends TextWebSocketHandler {

        private final WebSocketSession clientSession;

        UpstreamHandler(WebSocketSession clientSession) {
            this.clientSession = clientSession;
        }

        @Override
        protected void handleTextMessage(
                WebSocketSession upstream,
                TextMessage message
        ) throws Exception {

            if (clientSession.isOpen()) {
                synchronized (clientSession) {
                    clientSession.sendMessage(message);
                }
            }
        }

        @Override
        public void afterConnectionClosed(
                WebSocketSession upstream,
                CloseStatus status
        ) throws Exception {

            // Propagate the close so the browser reconnects rather than hanging.
            if (clientSession.isOpen()) {
                clientSession.close(CloseStatus.SERVICE_RESTARTED);
            }
        }
    }
}
