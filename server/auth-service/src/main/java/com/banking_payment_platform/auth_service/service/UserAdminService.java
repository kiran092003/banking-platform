package com.banking_payment_platform.auth_service.service;

import com.banking_payment_platform.auth_service.dto.UserPageResponseDto;
import com.banking_payment_platform.auth_service.dto.UserSummaryDto;
import com.banking_payment_platform.auth_service.entity.Role;
import com.banking_payment_platform.auth_service.entity.User;
import com.banking_payment_platform.auth_service.exception.InvalidPasswordChangeException;
import com.banking_payment_platform.auth_service.exception.InvalidRoleChangeException;
import com.banking_payment_platform.auth_service.exception.UserNotFoundException;
import com.banking_payment_platform.auth_service.repository.RefreshTokenRepository;
import com.banking_payment_platform.auth_service.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Administrative user directory and role assignment.
 *
 * Granting ADMIN is the most privileged action on the platform, so it lives
 * behind its own ADMIN-only endpoints rather than being a field that any
 * anonymous caller can post to /register. These invariants are enforced here
 * rather than in the UI, because the UI is not a security boundary:
 *
 *   1. Nobody changes their own role. Otherwise an admin can demote themselves
 *      out of the console with no way back in through the API, and a hijacked
 *      admin session could quietly reassign roles to cover its tracks.
 *   2. No admin may act on another admin: neither their role nor their
 *      password. Administrators are peers, not a hierarchy, so one compromised
 *      admin account cannot demote the others or seize their credentials and
 *      take sole control of the platform. Promotion is unaffected — raising a
 *      USER to ADMIN is still how administrators are made.
 *   3. The last remaining ADMIN cannot be demoted, which would leave the
 *      platform with nobody able to administer it. Rule 2 now subsumes this,
 *      since no admin can be demoted at all; it is kept as a backstop so the
 *      invariant still holds if rule 2 is ever relaxed.
 *
 * Note the consequence of rule 2: ADMIN is not revocable through this API.
 * Demoting an administrator is a deliberate database operation.
 */
@Service
@Slf4j
public class UserAdminService {

    /** Matches the cap the transaction and notification services apply. */
    private static final int MAX_PAGE_SIZE = 50;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    public UserAdminService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserPageResponseDto listUsers(
            int page,
            int size,
            String search,
            Role role
    ) {

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);

        String term = search == null ? "" : search.trim();

        Pageable pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by("username").ascending()
        );

        Page<User> result = (role == null)
                ? userRepository
                .findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(
                        term,
                        term,
                        pageable
                )
                : userRepository
                .findByRoleAndUsernameContainingIgnoreCaseOrRoleAndEmailContainingIgnoreCase(
                        role,
                        term,
                        role,
                        term,
                        pageable
                );

        return new UserPageResponseDto(
                result.getContent()
                        .stream()
                        .map(UserAdminService::toSummary)
                        .toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.isFirst(),
                result.isLast()
        );
    }

    @Transactional
    public UserSummaryDto updateRole(
            Long targetUserId,
            Role newRole,
            String actingUsername
    ) {

        log.info(
                "Role change requested. targetUserId={}, newRole={}, actor={}",
                targetUserId,
                newRole,
                actingUsername
        );

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> {

                    log.warn(
                            "Role change rejected because the user does not exist. targetUserId={}",
                            targetUserId
                    );

                    return new UserNotFoundException("User not found");
                });

        User actor = userRepository.findByUsername(actingUsername);

        if (actor != null && actor.getId().equals(target.getId())) {

            log.warn(
                    "Role change rejected because an admin tried to change their own role. userId={}",
                    target.getId()
            );

            throw new InvalidRoleChangeException(
                    "You cannot change your own role"
            );
        }

        Role currentRole = target.getRole();

        // Idempotent: re-applying the role a user already has is not an error.
        if (currentRole == newRole) {

            log.info(
                    "Role change was a no-op. userId={}, role={}",
                    target.getId(),
                    currentRole
            );

            return toSummary(target);
        }

        /*
         * Administrators are peers. Changing another admin's role is refused
         * outright, so a single compromised admin account cannot demote the
         * others and leave itself in sole control.
         *
         * This sits after the no-op check above, so re-applying ADMIN to an
         * existing admin is still a harmless no-op rather than an error.
         */
        if (currentRole == Role.ADMIN) {

            log.warn(
                    "Role change rejected because the target is an administrator. "
                            + "targetUserId={}, actor={}",
                    target.getId(),
                    actingUsername
            );

            throw new InvalidRoleChangeException(
                    "An administrator's role cannot be changed by another administrator"
            );
        }

        /*
         * Unreachable while the rule above stands, which refuses every demotion
         * of an admin and not just the last one. Kept deliberately: if that
         * rule is ever relaxed, this is what still stops the platform being
         * left with nobody able to administer it.
         */
        if (currentRole == Role.ADMIN
                && userRepository.countByRole(Role.ADMIN) <= 1) {

            log.warn(
                    "Role change rejected because it would remove the last administrator. userId={}",
                    target.getId()
            );

            throw new InvalidRoleChangeException(
                    "The last administrator cannot be demoted"
            );
        }

        target.setRole(newRole);

        User saved = userRepository.save(target);

        log.info(
                "Role changed. userId={}, username={}, previousRole={}, newRole={}, actor={}",
                saved.getId(),
                saved.getUsername(),
                currentRole,
                saved.getRole(),
                actingUsername
        );

        return toSummary(saved);
    }

    /**
     * Sets a new password for another user, for account recovery.
     *
     * This is the platform's answer to a forgotten password: there is no email
     * channel, so recovery is a deliberate administrative act rather than a
     * self-service link. The new password is chosen by the admin and has to be
     * handed to the user out of band, and they can change it themselves
     * afterwards through AuthService#changePassword.
     *
     * No current password is required — nobody knows it, which is the point.
     * The authorisation is the ADMIN role on the controller, and the acting
     * admin is named in the log so the reset is attributable.
     *
     * An admin cannot reset their own password here. Not a security rule but a
     * correctness one: a reset revokes the target's refresh token, so turning
     * it on yourself would quietly kill your own session. Changing your own
     * password is what #changePassword is for, and it asks for the current one.
     */
    @Transactional
    public UserSummaryDto resetPassword(
            Long targetUserId,
            String newPassword,
            String actingUsername
    ) {

        log.info(
                "Password reset requested. targetUserId={}, actor={}",
                targetUserId,
                actingUsername
        );

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> {

                    log.warn(
                            "Password reset rejected because the user does not exist. targetUserId={}",
                            targetUserId
                    );

                    return new UserNotFoundException("User not found");
                });

        User actor = userRepository.findByUsername(actingUsername);

        if (actor != null && actor.getId().equals(target.getId())) {

            log.warn(
                    "Password reset rejected because an admin targeted their own account. userId={}",
                    target.getId()
            );

            throw new InvalidPasswordChangeException(
                    "Use the change-password form to set your own password"
            );
        }

        /*
         * Administrators are peers, so one cannot seize another's credentials.
         * Without this an admin could reset a peer's password, sign in as them
         * and act with their identity — the audit log would name the wrong
         * person. An admin who is locked out is recovered through the database,
         * which leaves a trace this endpoint cannot.
         */
        if (target.getRole() == Role.ADMIN) {

            log.warn(
                    "Password reset rejected because the target is an administrator. "
                            + "targetUserId={}, actor={}",
                    target.getId(),
                    actingUsername
            );

            throw new InvalidPasswordChangeException(
                    "An administrator's password cannot be reset by another administrator"
            );
        }

        target.setPassword(
                passwordEncoder.encode(newPassword)
        );

        User saved = userRepository.save(target);

        /*
         * The user's existing session must not outlive the reset: an account
         * being recovered may be one somebody else has hold of.
         */
        refreshTokenRepository
                .findByUserId(saved.getId())
                .ifPresent(storedToken -> {

                    storedToken.setRevoked(true);

                    refreshTokenRepository.save(storedToken);

                    log.info(
                            "Refresh token revoked after an administrative password reset. userId={}",
                            saved.getId()
                    );
                });

        log.info(
                "Password reset completed. userId={}, username={}, actor={}",
                saved.getId(),
                saved.getUsername(),
                actingUsername
        );

        return toSummary(saved);
    }

    private static UserSummaryDto toSummary(User user) {

        return new UserSummaryDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole()
        );
    }
}
