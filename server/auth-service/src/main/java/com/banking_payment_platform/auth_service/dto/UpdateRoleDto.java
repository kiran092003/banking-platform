package com.banking_payment_platform.auth_service.dto;

import com.banking_payment_platform.auth_service.entity.Role;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateRoleDto {

    @NotNull(message = "Role is required")
    private Role role;
}
