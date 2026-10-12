package banking_platform.transaction_service.dto;

import banking_platform.transaction_service.entity.TransactionType;

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

        TransactionType transactionType,

        String status,

        LocalDateTime occurredAt

) {
}