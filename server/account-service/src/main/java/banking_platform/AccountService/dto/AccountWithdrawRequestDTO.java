package banking_platform.AccountService.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record AccountWithdrawRequestDTO(

        @NotNull(message = "Account ID is required")
        @Positive(message = "Account ID must be greater than 0")
        Long accountId,

        @NotNull(message = "Withdrawal amount is required")
        @DecimalMin(
                value = "0.01",
                message = "Withdrawal amount must be at least 0.01"
        )
        @Digits(
                integer = 17,
                fraction = 2,
                message = "Withdrawal amount can have maximum 17 integer digits and 2 decimal places"
        )
        BigDecimal amount,

        @NotBlank(message = "Operation ID is required")
        String operationId
) {
}