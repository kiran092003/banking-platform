package com.banking_payment_platform.auth_service.dto;

import com.banking_payment_platform.auth_service.entity.Role;

/**
 * A user as the admin console sees them.
 *
 * Deliberately excludes the password hash: this DTO is the only shape in which
 * a User ever leaves the service.
 */
public record UserSummaryDto(
        Long id,
        String username,
        String email,
        Role role
) {
}
