package banking_platform.transaction_service.dto;

import banking_platform.transaction_service.entity.TransactionType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record CreateTransactionRequest(

        @Positive(message = "Sender account ID must be greater than 0")
        Long senderAccountId,

        @Positive(message = "Receiver account ID must be greater than 0")
        Long receiverAccountId,

        @NotNull(message = "Transaction amount is required")
        @DecimalMin(
                value = "0.01",
                message = "Transaction amount must be at least 0.01"
        )
        @Digits(
                integer = 17,
                fraction = 2,
                message = "Transaction amount can have maximum 17 integer digits and 2 decimal places"
        )
        BigDecimal amount,

        @NotNull(message = "Transaction type is required")
        TransactionType transactionType,

        @NotBlank(message = "Idempotency key is required")
        @Size(
                min = 16,
                max = 100,
                message = "Idempotency key must be between 16 and 100 characters"
        )
        String idempotencyKey

) {
}