package com.banking_payment_platform.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * A user changing their own password.
 *
 * There is no username field: the account is taken from the authenticated
 * principal, so one signed-in user cannot change another's password by posting
 * a different name.
 *
 * The current password is required even though the caller is already
 * authenticated — an access token lives for 15 minutes, so proving possession
 * of the password is what stops a borrowed browser from taking over an account.
 */
@Getter
@Setter
public class ChangePasswordDto {

    @NotBlank(message = "Current password is required")
    private String currentPassword;

    // Same constraints as RegisterDto, so a password that could not have been
    // registered cannot be arrived at by changing one either.
    @NotBlank(message = "New password is required")
    @Size(min = 8, max = 100,
            message = "Password must be between 8 and 100 characters")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).+$",
            message = "Password must contain uppercase, lowercase, number and special character"
    )
    private String newPassword;
}
