package com.banking_payment_platform.auth_service.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Public self-registration.
 *
 * There is deliberately no role field. Registration always creates a USER;
 * granting ADMIN or SUPPORT is an ADMIN-only action through
 * PATCH /users/{userId}/role. A role sent here is ignored rather than
 * rejected, so older clients that still post one keep working.
 */
@Getter
@Setter
public class RegisterDto {

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 100,
            message = "Password must be between 8 and 100 characters")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&]).+$",
            message = "Password must contain uppercase, lowercase, number and special character"
    )
    private String password;
}
