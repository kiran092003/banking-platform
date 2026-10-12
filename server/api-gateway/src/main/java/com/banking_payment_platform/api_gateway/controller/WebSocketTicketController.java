package com.banking_payment_platform.api_gateway.controller;

import com.banking_payment_platform.api_gateway.service.JWTService;
import com.banking_payment_platform.api_gateway.service.WebSocketTicketService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Exchanges a valid access token for a short-lived WebSocket ticket.
 *
 * Reaching this endpoint already requires a valid Bearer token: JwtFilter
 * rejects the request otherwise, so by the time this runs the caller is
 * authenticated. The userId is taken from the token, never from the request.
 */
@RestController
public class WebSocketTicketController {

    private final WebSocketTicketService ticketService;
    private final JWTService jwtService;

    public WebSocketTicketController(
            WebSocketTicketService ticketService,
            JWTService jwtService
    ) {
        this.ticketService = ticketService;
        this.jwtService = jwtService;
    }

    @PostMapping("/ws-ticket")
    public ResponseEntity<?> issueTicket(HttpServletRequest request) {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Missing or invalid Authorization header"));
        }

        String token = authHeader.substring(7);

        if (!jwtService.validateToken(token)) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid or expired token"));
        }

        Long userId = jwtService.extractUserId(token);

        if (userId == null || userId <= 0) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token does not identify a user"));
        }

        String ticket = ticketService.issueTicket(userId);

        return ResponseEntity.ok(Map.of(
                "ticket", ticket,
                "expiresIn", ticketService.ticketTtlSeconds()
        ));
    }
}
