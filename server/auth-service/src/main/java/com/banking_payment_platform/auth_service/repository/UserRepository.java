package com.banking_payment_platform.auth_service.repository;

import com.banking_payment_platform.auth_service.entity.Role;
import com.banking_payment_platform.auth_service.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    User findByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    /** Guards the last-administrator rule in UserAdminService. */
    long countByRole(Role role);

    /**
     * Admin console search. An empty term matches every row, because a LIKE
     * against a pattern of two percent signs is always true, so the caller does
     * not need to special-case a blank search box.
     */
    Page<User> findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(
            String username,
            String email,
            Pageable pageable
    );

    /**
     * The same search narrowed to one role. Spring Data reads this as
     * (role AND username LIKE) OR (role AND email LIKE), so the role filter
     * applies regardless of which field produced the match.
     */
    Page<User> findByRoleAndUsernameContainingIgnoreCaseOrRoleAndEmailContainingIgnoreCase(
            Role roleForUsername,
            String username,
            Role roleForEmail,
            String email,
            Pageable pageable
    );
}
