package com.example.notification_service.config;

import com.example.notification_service.websocket.InternalHandshakeInterceptor;
import com.example.notification_service.websocket.NotificationWebSocketHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final NotificationWebSocketHandler notificationWebSocketHandler;
    private final InternalHandshakeInterceptor internalHandshakeInterceptor;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {

        registry
                .addHandler(
                        notificationWebSocketHandler,
                        "/internal/ws/notifications"
                )
                .addInterceptors(internalHandshakeInterceptor);

        /*
         * No setAllowedOrigins here on purpose.
         *
         * This endpoint is reachable only by the gateway (service key required),
         * never by a browser, so there is no browser Origin to allow. Origin
         * checking for real clients happens at the gateway, which is where the
         * browser actually connects.
         */
    }
}
