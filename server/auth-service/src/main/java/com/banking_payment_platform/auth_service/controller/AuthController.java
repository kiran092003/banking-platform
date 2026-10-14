package com.banking_payment_platform.auth_service.controller;

import com.banking_payment_platform.auth_service.dto.*;
import com.banking_payment_platform.auth_service.entity.User;
import com.banking_payment_platform.auth_service.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(
        name = "Authentication",
        description = "User registration, authentication, token refresh and logout APIs"
)
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @Operation(
            summary = "Register a new user",
            description = "Creates a new user account and returns the registered user details."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "User registered successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid registration data or validation failure"
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "Username or email already exists"
            )
    })
    public ResponseEntity<RegisterResponseDto> register(
            @Valid @RequestBody RegisterDto registerDto) {

        User user = authService.register(registerDto);

        RegisterResponseDto response = new RegisterResponseDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().name()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @PostMapping("/login")
    @Operation(
            summary = "Authenticate user",
            description = "Authenticates a user using username and password and returns access and refresh tokens."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Authentication successful"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid login request"
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Invalid username or password"
            )
    })
    public ResponseEntity<LoginResponseDto> login(
            @Valid @RequestBody LoginDto loginDto) {

        LoginResponseDto response = authService.verify(loginDto);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    @Operation(
            summary = "Refresh access token",
            description = "Generates a new access token using a valid refresh token."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Access token refreshed successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid refresh token request"
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Refresh token is invalid, expired or revoked"
            )
    })
    public ResponseEntity<LoginResponseDto> refresh(
            @Valid @RequestBody RefreshTokenRequestDto request) {

        LoginResponseDto response =
                authService.refreshToken(
                        request.getRefreshToken()
                );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    @Operation(
            summary = "Logout user",
            description = "Revokes the supplied refresh token and logs the user out."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "User logged out successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid logout request"
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Invalid or expired refresh token"
            )
    })
    public ResponseEntity<String> logout(
            @Valid @RequestBody RefreshTokenRequestDto request) {

        authService.logout(
                request.getRefreshToken()
        );

        return ResponseEntity.ok(
                "Logged out successfully"
        );
    }

    @PostMapping("/password")
    @Operation(
            summary = "Change your own password",
            description = "Changes the signed-in user's password. The account is taken "
                    + "from the access token, so this can only ever act on the caller's "
                    + "own account, and the current password must be supplied even "
                    + "though the caller is already authenticated. On success the "
                    + "user's refresh token is revoked, so every session has to sign "
                    + "in again with the new password."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Password changed; sign in again"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Current password is wrong, the new password repeats "
                            + "the old one, or it fails the password rules"
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Missing or invalid access token"
            )
    })
    public ResponseEntity<String> changePassword(
            @Valid @RequestBody ChangePasswordDto request,
            Authentication authentication) {

        /*
         * The principal name is the username the JwtFilter read out of a
         * verified token. Taking the account from here rather than from the
         * body is what keeps one user from changing another's password.
         */
        authService.changePassword(
                authentication.getName(),
                request
        );

        return ResponseEntity.ok(
                "Password changed successfully"
        );
    }

}