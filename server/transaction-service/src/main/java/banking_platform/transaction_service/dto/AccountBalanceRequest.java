package banking_platform.transaction_service.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record AccountBalanceRequest(

        @NotNull(message = "Account ID is required")
        @Positive(message = "Account ID must be greater than 0")
        Long accountId,

        @NotNull(message = "Amount is required")
        @DecimalMin(
                value = "0.01",
                message = "Amount must be at least 0.01"
        )
        @Digits(
                integer = 17,
                fraction = 2,
                message = "Amount can have maximum 17 integer digits and 2 decimal places"
        )
        BigDecimal amount,

        String operationId
) {
}