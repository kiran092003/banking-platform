package com.banking_payment_platform.api_gateway.websocket;

import com.banking_payment_platform.api_gateway.service.WebSocketTicketService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Authenticates a browser's WebSocket handshake.
 *
 * Two independent checks:
 *
 * 1. Origin allow-list. The same-origin policy does NOT apply to WebSockets, so
 *    without this any website could open a socket against this gateway from a
 *    visitor's browser (Cross-Site WebSocket Hijacking). Because we authenticate
 *    with a ticket rather than a cookie an attacker could not obtain credentials
 *    anyway, but rejecting foreign origins removes the class of attack outright.
 *
 * 2. Single-use ticket, redeemed atomically. This both authenticates the caller
 *    and tells us which user the stream belongs to.
 */
@Component
public class TicketHandshakeInterceptor implements HandshakeInterceptor {

    private static final Logger log =
            LoggerFactory.getLogger(TicketHandshakeInterceptor.class);

    public static final String USER_ID_ATTRIBUTE = "userId";

    private final WebSocketTicketService ticketService;

    public TicketHandshakeInterceptor(WebSocketTicketService ticketService) {
        this.ticketService = ticketService;
    }

    @Value("${websocket.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}")
    private String allowedOrigins;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {

        String origin = request.getHeaders().getOrigin();

        if (!isOriginAllowed(origin)) {
            log.warn("Rejected WebSocket handshake from origin: {}", origin);
            response.setStatusCode(HttpStatus.FORBIDDEN);
            return false;
        }

        String ticket = UriComponentsBuilder
                .fromUri(request.getURI())
                .build()
                .getQueryParams()
                .getFirst("ticket");

        Long userId = ticketService.redeemTicket(ticket);

        if (userId == null) {
            // Expired, unknown, or already spent.
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }

        attributes.put(USER_ID_ATTRIBUTE, userId);
        return true;
    }

    private boolean isOriginAllowed(String origin) {

        if (origin == null || origin.isBlank()) {
            /*
             * Non-browser clients omit Origin. Rejecting is the safe default:
             * the only intended client here is the web app.
             */
            return false;
        }

        List<String> allowed = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();

        return allowed.contains(origin);
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
