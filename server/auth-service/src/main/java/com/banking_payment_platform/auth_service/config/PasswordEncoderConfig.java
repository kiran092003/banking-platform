package com.banking_payment_platform.auth_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * The one password encoder in the service.
 *
 * Three places now hash or verify a password — sign-in, a user changing their
 * own, and an admin resetting someone else's — and they have to agree on the
 * algorithm and cost factor or a hash written by one is unverifiable by
 * another. Keeping it a single bean makes that impossible to get wrong, and
 * leaves one line to change if the cost factor is ever raised.
 *
 * It lives in its own @Configuration rather than in SecurityConfig: the
 * authentication provider there consumes this bean, and defining it alongside
 * AuthenticationConfiguration invites a bean-initialisation cycle.
 */
@Configuration
public class PasswordEncoderConfig {

    /** Cost 10, matching every hash already stored by this service. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }
}
