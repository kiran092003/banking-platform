package com.example.notification_service.dto;

import com.example.notification_service.entity.Notification;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Notification as returned to the client.
 *
 * Deliberately omits eventId: it is a Kafka de-duplication key and carries no
 * meaning for the user.
 */
public record NotificationResponse(

        Long id,
        Long transactionId,
        Long userId,
        Long senderAccountId,
        Long receiverAccountId,
        BigDecimal amount,
        String transactionType,
        String transactionStatus,
        String message,
        boolean read,
        LocalDateTime readAt,
        LocalDateTime createdAt

) {

    public static NotificationResponse from(Notification notification) {

        return new NotificationResponse(
                notification.getId(),
                notification.getTransactionId(),
                notification.getUserId(),
                notification.getSenderAccountId(),
                notification.getReceiverAccountId(),
                notification.getAmount(),
                notification.getTransactionType(),
                notification.getTransactionStatus(),
                notification.getMessage(),
                notification.isRead(),
                notification.getReadAt(),
                notification.getCreatedAt()
        );
    }
}
