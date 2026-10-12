package com.example.notification_service.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record TransactionEvent(
        UUID eventId,
        Long transactionId,
        Long userId,
        Long senderAccountId,
        Long receiverAccountId,
        BigDecimal amount,
        String transactionType,
        String status,
        LocalDateTime occurredAt
) {
}