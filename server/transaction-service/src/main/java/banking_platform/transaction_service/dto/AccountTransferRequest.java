package banking_platform.transaction_service.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record AccountTransferRequest(

        @NotNull(message = "Sender account ID is required")
        @Positive(message = "Sender account ID must be greater than 0")
        Long senderAccountId,

        @NotNull(message = "Receiver account ID is required")
        @Positive(message = "Receiver account ID must be greater than 0")
        Long receiverAccountId,

        @NotNull(message = "Transfer amount is required")
        @DecimalMin(
                value = "0.01",
                message = "Transfer amount must be at least 0.01"
        )
        @Digits(
                integer = 17,
                fraction = 2,
                message = "Transfer amount can have maximum 17 integer digits and 2 decimal places"
        )
        BigDecimal amount,

        String operationId
) {
}