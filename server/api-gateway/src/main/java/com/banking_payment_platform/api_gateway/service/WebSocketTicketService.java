package com.banking_payment_platform.api_gateway.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;

/**
 * Issues short-lived, single-use tickets for opening a WebSocket.
 *
 * Why a ticket rather than the access token:
 *
 * A browser's WebSocket API cannot set an Authorization header, so the only
 * ways to carry a JWT are the query string or a subprotocol. A query string is
 * written to access logs, proxy logs and browser history, which is a poor place
 * for a 15-minute bearer token.
 *
 * Instead the client exchanges its token for a ticket over an ordinary
 * authenticated POST, then presents the ticket on the WebSocket URL. The ticket
 * lives 30 seconds, is valid exactly once, and grants nothing beyond opening a
 * notification stream for the user it was minted for. Leaking it from a log is
 * close to worthless.
 *
 * Tickets are kept in Redis (already used by the rate limiter) rather than in
 * memory, so this stays correct if the gateway is scaled to several instances.
 */
@Service
public class WebSocketTicketService {

    private static final String KEY_PREFIX = "ws:ticket:";
    private static final Duration TICKET_TTL = Duration.ofSeconds(30);
    private static final int TICKET_BYTES = 32;

    private final StringRedisTemplate redisTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    public WebSocketTicketService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public String issueTicket(Long userId) {

        byte[] raw = new byte[TICKET_BYTES];
        secureRandom.nextBytes(raw);

        String ticket = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(raw);

        redisTemplate.opsForValue().set(
                KEY_PREFIX + ticket,
                String.valueOf(userId),
                TICKET_TTL
        );

        return ticket;
    }

    public long ticketTtlSeconds() {
        return TICKET_TTL.toSeconds();
    }

    /**
     * Redeems a ticket, returning the userId it was minted for.
     *
     * GETDEL is atomic, so a ticket cannot be redeemed twice even if two
     * handshakes race — the second gets null and is rejected.
     *
     * @return the userId, or null if the ticket is unknown, expired or spent
     */
    public Long redeemTicket(String ticket) {

        if (ticket == null || ticket.isBlank()) {
            return null;
        }

        String userId = redisTemplate.opsForValue()
                .getAndDelete(KEY_PREFIX + ticket);

        if (userId == null) {
            return null;
        }

        try {
            return Long.parseLong(userId);
        } catch (NumberFormatException exception) {
            return null;
        }
    }
}
