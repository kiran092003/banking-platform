package banking_platform.AccountService.dto;

import banking_platform.AccountService.entity.AccountType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountUpdateRequestDTO {

    @NotNull(message = "Account type is required")
    private AccountType accountType;
}