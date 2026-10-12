package com.banking_payment_platform.api_gateway.config;

import com.banking_payment_platform.api_gateway.websocket.NotificationProxyHandler;
import com.banking_payment_platform.api_gateway.websocket.TicketHandshakeInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;

/**
 * The browser's single WebSocket entry point, alongside the HTTP routes.
 *
 * Spring Cloud Gateway Server WebMVC cannot route WebSocket upgrades — that
 * filter only exists in the reactive gateway — so the gateway terminates the
 * connection here and proxies it on. Keeps the rule that a browser talks to
 * :8080 and nothing else.
 */
@Configuration
@EnableWebSocket
public class WebSocketProxyConfig implements WebSocketConfigurer {

    private final NotificationProxyHandler notificationProxyHandler;
    private final TicketHandshakeInterceptor ticketHandshakeInterceptor;

    /** Same list TicketHandshakeInterceptor checks against. */
    @Value("${websocket.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}")
    private String allowedOrigins;

    public WebSocketProxyConfig(
            NotificationProxyHandler notificationProxyHandler,
            TicketHandshakeInterceptor ticketHandshakeInterceptor
    ) {
        this.notificationProxyHandler = notificationProxyHandler;
        this.ticketHandshakeInterceptor = ticketHandshakeInterceptor;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {

        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toArray(String[]::new);

        registry
                .addHandler(notificationProxyHandler, "/ws/notifications")
                .addInterceptors(ticketHandshakeInterceptor)
                /*
                 * setAllowedOrigins is REQUIRED, even though
                 * TicketHandshakeInterceptor checks the Origin itself.
                 *
                 * Spring appends its own OriginHandshakeInterceptor after ours,
                 * and when no origins are configured its policy is same-origin
                 * only — Origin must equal the request's Host. The browser runs
                 * on :5173 while this gateway's Host is :8080, so every real
                 * handshake was rejected with 403 *after* our interceptor had
                 * already spent the single-use ticket.
                 *
                 * Configuring the same allow-list here makes both checks agree.
                 */
                .setAllowedOrigins(origins);
    }
}
