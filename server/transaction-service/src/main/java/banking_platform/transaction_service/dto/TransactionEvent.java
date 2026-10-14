package banking_platform.transaction_service.dto;

import banking_platform.transaction_service.entity.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record TransactionEvent(

        UUID eventId,

        Long transactionId,

        Long userId,

        /**
         * User who owns the receiving account, when that is somebody other
         * than {@code userId}. Null for deposits, withdrawals and self
         * transfers, where there is no second party to notify.
         */
        Long receiverUserId,

        Long senderAccountId,

        Long receiverAccountId,

        BigDecimal amount,

        TransactionType transactionType,

        String status,

        LocalDateTime occurredAt

) {
}