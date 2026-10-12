package banking_platform.transaction_service.dto;

import banking_platform.transaction_service.entity.AccountStatus;

import java.math.BigDecimal;

public record AccountDetailsResponse(
        Long id,
        String accountNumber,
        Long userId,
        BigDecimal balance,
        AccountStatus status
) {
}