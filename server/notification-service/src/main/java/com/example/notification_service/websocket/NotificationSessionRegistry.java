package com.example.notification_service.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks live WebSocket sessions per user.
 *
 * A user may have several sessions open (multiple tabs or devices), so each
 * userId maps to a set. Sends are serialised per session because a
 * WebSocketSession is not safe for concurrent writes.
 */
@Component
@Slf4j
public class NotificationSessionRegistry {

    private final Map<Long, Set<WebSocketSession>> sessionsByUser =
            new ConcurrentHashMap<>();

    public void register(Long userId, WebSocketSession session) {

        sessionsByUser
                .computeIfAbsent(userId, key -> ConcurrentHashMap.newKeySet())
                .add(session);

        log.debug(
                "WebSocket registered. userId={}, openSessions={}",
                userId,
                sessionsByUser.get(userId).size()
        );
    }

    public void unregister(Long userId, WebSocketSession session) {

        sessionsByUser.computeIfPresent(userId, (key, sessions) -> {
            sessions.remove(session);
            return sessions.isEmpty() ? null : sessions;
        });

        log.debug("WebSocket unregistered. userId={}", userId);
    }

    /**
     * Delivers a payload to every live session owned by this user.
     *
     * Delivery is best-effort: a notification is already durably stored before
     * this is called, so a failed push only means the client picks it up on its
     * next fetch rather than losing it.
     */
    public void sendToUser(Long userId, String payload) {

        Set<WebSocketSession> sessions = sessionsByUser.get(userId);

        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        for (WebSocketSession session : sessions) {

            if (!session.isOpen()) {
                unregister(userId, session);
                continue;
            }

            try {
                // A session must not be written to from two threads at once.
                synchronized (session) {
                    session.sendMessage(new TextMessage(payload));
                }
            } catch (IOException | IllegalStateException exception) {
                log.warn(
                        "Failed to push notification over WebSocket. userId={}, reason={}",
                        userId,
                        exception.getMessage()
                );
                unregister(userId, session);
            }
        }
    }

    public int openSessionCount() {
        return sessionsByUser.values().stream().mapToInt(Set::size).sum();
    }
}
