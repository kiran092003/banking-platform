package com.banking_payment_platform.auth_service.service;

import com.banking_payment_platform.auth_service.dto.ChangePasswordDto;
import com.banking_payment_platform.auth_service.dto.LoginDto;
import com.banking_payment_platform.auth_service.dto.LoginResponseDto;
import com.banking_payment_platform.auth_service.dto.RegisterDto;
import com.banking_payment_platform.auth_service.entity.RefreshToken;
import com.banking_payment_platform.auth_service.entity.Role;
import com.banking_payment_platform.auth_service.entity.User;
import com.banking_payment_platform.auth_service.exception.InvalidCredentialsException;
import com.banking_payment_platform.auth_service.exception.InvalidPasswordChangeException;
import com.banking_payment_platform.auth_service.exception.ResourceAlreadyExistsException;
import com.banking_payment_platform.auth_service.metrics.AuthBusinessMetrics;
import com.banking_payment_platform.auth_service.repository.RefreshTokenRepository;
import com.banking_payment_platform.auth_service.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final MyUserDetailsService myUserDetailsService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuthBusinessMetrics authBusinessMetrics;

    @Autowired
    private JWTService jwtService;

    @Autowired
    private AuthenticationManager authenticationManage;

    private final PasswordEncoder passwordEncoder;

    public AuthService(
            UserRepository userRepository,
            MyUserDetailsService myUserDetailsService,
            RefreshTokenRepository refreshTokenRepository,
            AuthBusinessMetrics authBusinessMetrics,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.myUserDetailsService = myUserDetailsService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.authBusinessMetrics = authBusinessMetrics;
        this.passwordEncoder = passwordEncoder;
    }

    // REGISTER
    public User register(RegisterDto registerDto) {

        log.info(
                "User registration request received. username={}",
                registerDto.getUsername()
        );

        try {

            if (userRepository.existsByEmail(registerDto.getEmail())) {

                log.warn(
                        "User registration rejected because email already exists. username={}",
                        registerDto.getUsername()
                );

                throw new ResourceAlreadyExistsException(
                        "Email already exists"
                );
            }

            if (userRepository.existsByUsername(registerDto.getUsername())) {

                log.warn(
                        "User registration rejected because username already exists. username={}",
                        registerDto.getUsername()
                );

                throw new ResourceAlreadyExistsException(
                        "Username already exists"
                );
            }

            User user = User.builder()
                    .username(registerDto.getUsername())
                    .email(registerDto.getEmail())
                    .password(
                            passwordEncoder.encode(
                                    registerDto.getPassword()
                            )
                    )
                    // Always USER. Granting ADMIN or SUPPORT is an ADMIN-only action
                    // via PATCH /users/{userId}/role, so a public caller cannot
                    // self-grant privilege by posting a role to this endpoint.
                    .role(Role.USER)
                    .build();

            User savedUser = userRepository.save(user);

            authBusinessMetrics.recordRegistrationSuccess();

            log.info(
                    "User registered successfully. userId={}, username={}, role={}",
                    savedUser.getId(),
                    savedUser.getUsername(),
                    savedUser.getRole()
            );

            return savedUser;

        } catch (RuntimeException exception) {

            authBusinessMetrics.recordRegistrationFailure();

            throw exception;
        }
    }

    // LOGIN
    public LoginResponseDto verify(LoginDto loginDto) {

        log.info(
                "User login attempt received. username={}",
                loginDto.getUsername()
        );

        try {

            Authentication authentication;

            try {

                authentication =
                        authenticationManage.authenticate(
                                new UsernamePasswordAuthenticationToken(
                                        loginDto.getUsername(),
                                        loginDto.getPassword()
                                )
                        );

            } catch (BadCredentialsException exception) {

                log.warn(
                        "User login failed due to invalid credentials. username={}",
                        loginDto.getUsername()
                );

                throw new InvalidCredentialsException(
                        "Invalid username or password"
                );
            }

            if (!authentication.isAuthenticated()) {

                log.warn(
                        "User login failed because authentication was not successful. username={}",
                        loginDto.getUsername()
                );

                throw new InvalidCredentialsException(
                        "Invalid username or password"
                );
            }

            String username = authentication.getName();

            User user =
                    userRepository.findByUsername(username);

            if (user == null) {

                log.error(
                        "Authenticated user could not be found in database. username={}",
                        username
                );

                throw new InvalidCredentialsException(
                        "Invalid username or password"
                );
            }

            UserDetails userDetails =
                    (UserDetails) authentication.getPrincipal();

            String accessToken =
                    jwtService.generateAccessToken(
                            userDetails,
                            user.getId(),
                            user.getRole().name()
                    );

            String refreshToken =
                    jwtService.generateRefreshToken(username);

            refreshTokenRepository
                    .findByUserId(user.getId())
                    .ifPresent(existingToken -> {

                        log.debug(
                                "Existing refresh token replaced during login. userId={}",
                                user.getId()
                        );

                        refreshTokenRepository.delete(existingToken);
                    });

            RefreshToken refreshTokenEntity =
                    new RefreshToken(
                            refreshToken,
                            Instant.now().plus(7, ChronoUnit.DAYS),
                            user
                    );

            refreshTokenRepository.save(
                    refreshTokenEntity
            );

            authBusinessMetrics.recordLoginSuccess();

            log.info(
                    "User login successful. userId={}, username={}, role={}",
                    user.getId(),
                    username,
                    user.getRole()
            );

            return new LoginResponseDto(
                    accessToken,
                    refreshToken,
                    "Bearer",
                    900
            );

        } catch (RuntimeException exception) {

            authBusinessMetrics.recordLoginFailure();

            throw exception;
        }
    }

    // REFRESH ACCESS TOKEN
    public LoginResponseDto refreshToken(String refreshToken) {

        log.info(
                "Access token refresh request received."
        );

        try {

            RefreshToken storedToken;

            try {

                storedToken =
                        refreshTokenRepository
                                .findByToken(refreshToken)
                                .orElseThrow(() ->
                                        new InvalidCredentialsException(
                                                "Invalid refresh token"
                                        )
                                );

            } catch (RuntimeException exception) {

                log.warn(
                        "Access token refresh failed because refresh token is invalid."
                );

                throw exception;
            }

            if (storedToken.isRevoked()) {

                log.warn(
                        "Access token refresh rejected because refresh token is revoked. userId={}",
                        storedToken.getUser().getId()
                );

                /*
                 * Revoked by a sign-out, or by a password change or admin reset
                 * withdrawing every session. An expected outcome, so it is
                 * reported as a 401: the catch-all would otherwise turn it into
                 * a 500, and the client reads a failed refresh as "sign in
                 * again" rather than as a server fault.
                 */
                throw new InvalidCredentialsException(
                        "Refresh token has been revoked"
                );
            }

            if (storedToken.getExpiryDate()
                    .isBefore(Instant.now())) {

                log.warn(
                        "Access token refresh rejected because refresh token has expired. userId={}",
                        storedToken.getUser().getId()
                );

                throw new InvalidCredentialsException(
                        "Refresh token has expired"
                );
            }

            User user =
                    storedToken.getUser();

            String username =
                    user.getUsername();

            UserDetails userDetails =
                    myUserDetailsService
                            .loadUserByUsername(username);

            String newAccessToken =
                    jwtService.generateAccessToken(
                            userDetails,
                            user.getId(),
                            user.getRole().name()
                    );

            authBusinessMetrics.recordRefreshSuccess();

            log.info(
                    "Access token refreshed successfully. userId={}, username={}, role={}",
                    user.getId(),
                    username,
                    user.getRole()
            );

            return new LoginResponseDto(
                    newAccessToken,
                    refreshToken,
                    "Bearer",
                    900
            );

        } catch (RuntimeException exception) {

            authBusinessMetrics.recordRefreshFailure();

            throw exception;
        }
    }

    // LOGOUT
    public void logout(String refreshToken) {

        log.info(
                "User logout request received."
        );

        try {

            RefreshToken storedToken =
                    refreshTokenRepository
                            .findByToken(refreshToken)
                            .orElseThrow(() ->
                                    new RuntimeException(
                                            "Invalid refresh token"
                                    )
                            );

            storedToken.setRevoked(true);

            refreshTokenRepository.save(
                    storedToken
            );

            authBusinessMetrics.recordLogoutSuccess();

            log.info(
                    "User logout successful. userId={}",
                    storedToken.getUser().getId()
            );

        } catch (RuntimeException exception) {

            authBusinessMetrics.recordLogoutFailure();

            throw exception;
        }
    }

    // CHANGE OWN PASSWORD
    /**
     * Changes the password of the signed-in user.
     *
     * {@code username} comes from the verified access token, never from the
     * request body, so this can only ever act on the caller's own account.
     *
     * Transactional because the password update and the refresh-token
     * revocation below have to land together: a committed new password with a
     * still-valid refresh token would leave the old session able to mint access
     * tokens, which is the opposite of what changing a password is for.
     */
    @Transactional
    public void changePassword(
            String username,
            ChangePasswordDto changePasswordDto
    ) {

        log.info(
                "Password change request received. username={}",
                username
        );

        try {

            User user = userRepository.findByUsername(username);

            if (user == null) {

                /*
                 * The token verified but the row is gone — deleted mid-session.
                 * Not a client error worth describing, so it is reported as a
                 * failed authentication.
                 */
                log.error(
                        "Password change failed because the authenticated user no longer exists. username={}",
                        username
                );

                throw new InvalidCredentialsException(
                        "Invalid username or password"
                );
            }

            if (!passwordEncoder.matches(
                    changePasswordDto.getCurrentPassword(),
                    user.getPassword()
            )) {

                log.warn(
                        "Password change rejected because the current password did not match. userId={}",
                        user.getId()
                );

                throw new InvalidPasswordChangeException(
                        "Current password is incorrect"
                );
            }

            if (passwordEncoder.matches(
                    changePasswordDto.getNewPassword(),
                    user.getPassword()
            )) {

                log.warn(
                        "Password change rejected because the new password matches the current one. userId={}",
                        user.getId()
                );

                throw new InvalidPasswordChangeException(
                        "New password must be different from the current password"
                );
            }

            user.setPassword(
                    passwordEncoder.encode(
                            changePasswordDto.getNewPassword()
                    )
            );

            userRepository.save(user);

            revokeRefreshToken(user.getId());

            authBusinessMetrics.recordPasswordChangeSuccess();

            log.info(
                    "Password changed successfully. userId={}, username={}",
                    user.getId(),
                    username
            );

        } catch (RuntimeException exception) {

            authBusinessMetrics.recordPasswordChangeFailure();

            throw exception;
        }
    }

    /**
     * Revokes the stored refresh token of a user whose password just changed,
     * so sessions opened with the old password cannot refresh themselves.
     *
     * Login keeps a single refresh token per user — it deletes any previous one
     * — so there is at most one row to revoke. It is revoked rather than
     * deleted, matching logout, which keeps the row as a record that the token
     * existed and was withdrawn.
     */
    private void revokeRefreshToken(Long userId) {

        refreshTokenRepository
                .findByUserId(userId)
                .ifPresent(storedToken -> {

                    storedToken.setRevoked(true);

                    refreshTokenRepository.save(storedToken);

                    log.info(
                            "Refresh token revoked after a password change. userId={}",
                            userId
                    );
                });
    }
}