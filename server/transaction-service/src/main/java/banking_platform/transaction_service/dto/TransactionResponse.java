package banking_platform.transaction_service.dto;

import banking_platform.transaction_service.entity.TransactionStatus;
import banking_platform.transaction_service.entity.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionResponse(
        Long id,
        Long userId,
        Long senderAccountId,
        Long receiverAccountId,
        BigDecimal amount,
        TransactionType transactionType,
        TransactionStatus status,
        String failureReason,
        LocalDateTime createdAt,
        String idempotencyKey
) {
}