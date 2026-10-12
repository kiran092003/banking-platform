package com.banking_payment_platform.auth_service.repository;

import com.banking_payment_platform.auth_service.entity.RefreshToken;
import com.banking_payment_platform.auth_service.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository
        extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    Optional<RefreshToken> findByUserId(Long userId);

    void deleteByUser(User user);
}