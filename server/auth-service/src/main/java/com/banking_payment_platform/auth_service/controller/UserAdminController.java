package com.banking_payment_platform.auth_service.controller;

import com.banking_payment_platform.auth_service.dto.ResetPasswordDto;
import com.banking_payment_platform.auth_service.dto.UpdateRoleDto;
import com.banking_payment_platform.auth_service.dto.UserPageResponseDto;
import com.banking_payment_platform.auth_service.dto.UserSummaryDto;
import com.banking_payment_platform.auth_service.entity.Role;
import com.banking_payment_platform.auth_service.service.UserAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The user directory and role administration, reachable only by an ADMIN.
 *
 * The class-level @PreAuthorize is the authorisation boundary. Note that the
 * granted authorities come from MyUserDetailsService, which reads the user row
 * on every request, so a demoted admin loses access here immediately rather
 * than when their access token happens to expire.
 */
@RestController
@RequestMapping("/users")
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "User administration",
        description = "ADMIN-only user directory and role assignment"
)
public class UserAdminController {

    private final UserAdminService userAdminService;

    public UserAdminController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    @GetMapping
    @Operation(
            summary = "List users",
            description = "Returns a paginated user directory. Supports a free-text "
                    + "search across username and email, and an optional role filter. "
                    + "Page size is capped at 50."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Users returned"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid access token"),
            @ApiResponse(responseCode = "403", description = "Caller is not an ADMIN")
    })
    public ResponseEntity<UserPageResponseDto> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role role
    ) {

        return ResponseEntity.ok(
                userAdminService.listUsers(page, size, search, role)
        );
    }

    @PatchMapping("/{userId}/role")
    @Operation(
            summary = "Change a user role",
            description = "Assigns USER, ADMIN or SUPPORT to the given user. This is the "
                    + "only way to grant ADMIN: registration always creates a USER. "
                    + "An admin cannot change their own role, and the last remaining "
                    + "admin cannot be demoted."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Role updated"),
            @ApiResponse(responseCode = "400", description = "Role missing or not a known role"),
            @ApiResponse(responseCode = "401", description = "Missing or invalid access token"),
            @ApiResponse(responseCode = "403", description = "Caller is not an ADMIN"),
            @ApiResponse(responseCode = "404", description = "No such user"),
            @ApiResponse(
                    responseCode = "409",
                    description = "Changing your own role, or demoting the last administrator"
            )
    })
    public ResponseEntity<UserSummaryDto> updateRole(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateRoleDto request,
            Authentication authentication
    ) {

        return ResponseEntity.ok(
                userAdminService.updateRole(
                        userId,
                        request.getRole(),
                        authentication == null ? null : authentication.getName()
                )
        );
    }

    @PatchMapping("/{userId}/password")
    @Operation(
            summary = "Reset a user password",
            description = "Sets a new password for the given user, for account "
                    + "recovery. This is how a forgotten password is dealt with: the "
                    + "platform has no email channel, so there is no self-service "
                    + "reset link. The new password is chosen here and must be handed "
                    + "to the user out of band; they can then change it themselves via "
                    + "POST /password. The target's refresh token is revoked, so their "
                    + "existing session cannot outlive the reset. An admin cannot reset "
                    + "their own password here."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Password reset"),
            @ApiResponse(
                    responseCode = "400",
                    description = "Password fails the password rules, or the admin "
                            + "targeted their own account"
            ),
            @ApiResponse(responseCode = "401", description = "Missing or invalid access token"),
            @ApiResponse(responseCode = "403", description = "Caller is not an ADMIN"),
            @ApiResponse(responseCode = "404", description = "No such user")
    })
    public ResponseEntity<UserSummaryDto> resetPassword(
            @PathVariable Long userId,
            @Valid @RequestBody ResetPasswordDto request,
            Authentication authentication
    ) {

        return ResponseEntity.ok(
                userAdminService.resetPassword(
                        userId,
                        request.getNewPassword(),
                        authentication == null ? null : authentication.getName()
                )
        );
    }
}
