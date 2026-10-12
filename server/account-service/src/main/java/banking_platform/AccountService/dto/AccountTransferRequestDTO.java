package banking_platform.AccountService.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record AccountTransferRequestDTO(

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

        @NotBlank(message = "Operation ID is required")
        String operationId
) {

    @AssertTrue(message = "Sender and receiver accounts must be different")
    public boolean isDifferentAccounts() {

        if (senderAccountId == null || receiverAccountId == null) {
            return true;
        }

        return !senderAccountId.equals(receiverAccountId);
    }
}