package com.example.notification_service.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Binds an upstream WebSocket session to a user.
 *
 * The gateway sends the authenticated userId as a header on the handshake. That
 * header is trusted only because InternalServiceFilter has already rejected any
 * handshake lacking the shared service key, and /internal/** is not routed
 * through the gateway's public paths.
 */
@Component
@Slf4j
public class InternalHandshakeInterceptor implements HandshakeInterceptor {

    private static final String USER_ID_HEADER = "X-User-Id";

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {

        String rawUserId = request.getHeaders().getFirst(USER_ID_HEADER);

        if (rawUserId == null || rawUserId.isBlank()) {
            response.setStatusCode(HttpStatus.BAD_REQUEST);
            return false;
        }

        try {

            long userId = Long.parseLong(rawUserId.trim());

            if (userId <= 0) {
                response.setStatusCode(HttpStatus.BAD_REQUEST);
                return false;
            }

            attributes.put(
                    NotificationWebSocketHandler.USER_ID_ATTRIBUTE,
                    userId
            );

            return true;

        } catch (NumberFormatException exception) {
            response.setStatusCode(HttpStatus.BAD_REQUEST);
            return false;
        }
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception
    ) {
        // Nothing to do.
    }
}
