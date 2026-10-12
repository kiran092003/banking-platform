package com.banking_payment_platform.auth_service.service;

import com.banking_payment_platform.auth_service.dto.UserPageResponseDto;
import com.banking_payment_platform.auth_service.dto.UserSummaryDto;
import com.banking_payment_platform.auth_service.entity.Role;
import com.banking_payment_platform.auth_service.entity.User;
import com.banking_payment_platform.auth_service.exception.InvalidRoleChangeException;
import com.banking_payment_platform.auth_service.exception.UserNotFoundException;
import com.banking_payment_platform.auth_service.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Administrative user directory and role assignment.
 *
 * Granting ADMIN is the most privileged action on the platform, so it lives
 * behind its own ADMIN-only endpoints rather than being a field that any
 * anonymous caller can post to /register. Two invariants are enforced here
 * rather than in the UI, because the UI is not a security boundary:
 *
 *   1. Nobody changes their own role. Otherwise an admin can demote themselves
 *      out of the console with no way back in through the API, and a hijacked
 *      admin session could quietly reassign roles to cover its tracks.
 *   2. The last remaining ADMIN cannot be demoted, which would leave the
 *      platform with nobody able to administer it.
 */
@Service
@Slf4j
public class UserAdminService {

    /** Matches the cap the transaction and notification services apply. */
    private static final int MAX_PAGE_SIZE = 50;

    private final UserRepository userRepository;

    public UserAdminService(UserRepository userRepository) {
        this.userRepository = userRepository;
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

    private static UserSummaryDto toSummary(User user) {

        return new UserSummaryDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole()
        );
    }
}
