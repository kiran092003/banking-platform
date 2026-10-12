package com.example.notification_service.websocket;

import com.example.notification_service.dto.NotificationResponse;
import com.example.notification_service.entity.Notification;
import com.example.notification_service.event.NotificationCreatedEvent;
import com.example.notification_service.repository.NotificationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;

/**
 * Pushes a newly stored notification to that user's live WebSocket sessions.
 *
 * Runs AFTER_COMMIT so the row is already durable and readable. A push failure
 * is never propagated: the notification is safely persisted either way and the
 * client will see it on its next fetch.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationPushListener {

    private final NotificationSessionRegistry sessionRegistry;
    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onNotificationCreated(NotificationCreatedEvent event) {

        Notification notification = event.notification();
        Long userId = notification.getUserId();

        if (userId == null) {
            return;
        }

        try {

            long unreadCount =
                    notificationRepository.countByUserIdAndRead(userId, false);

            String payload = objectMapper.writeValueAsString(Map.of(
                    "type", "NOTIFICATION",
                    "unreadCount", unreadCount,
                    "notification", NotificationResponse.from(notification)
            ));

            sessionRegistry.sendToUser(userId, payload);

        } catch (Exception exception) {
            log.warn(
                    "Could not push notification over WebSocket. userId={}, reason={}",
                    userId,
                    exception.getMessage()
            );
        }
    }
}
