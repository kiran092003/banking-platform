package com.banking_payment_platform.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * An admin resetting another user's password.
 *
 * Carries no current password: the point of the endpoint is to recover an
 * account whose password nobody knows. The authorisation is the ADMIN role on
 * the controller, and the reset is logged with the acting admin's username.
 */
@Getter
@Setter
public class ResetPasswordDto {

    @NotBlank(message = "New password is required")
    @Size(min = 8, max = 100,
            message = "Password must be between 8 and 100 characters")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).+$",
            message = "Password must contain uppercase, lowercase, number and special character"
    )
    private String newPassword;
}
