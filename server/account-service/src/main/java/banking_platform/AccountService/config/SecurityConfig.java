package banking_platform.AccountService.config;

import banking_platform.AccountService.filter.InternalServiceFilter;
import banking_platform.AccountService.filter.JwtFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final InternalServiceFilter internalServiceFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http
    ) throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> auth

                        .requestMatchers(
                                "/actuator/**",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()

                        .requestMatchers("/actuator/**").permitAll()

                        // =====================================
                        // INTERNAL SERVICE
                        // =====================================

                        .requestMatchers(
                                "/accounts/internal/transfer",
                                "/accounts/internal/deposit",
                                "/accounts/internal/withdraw",
                                "/accounts/internal/user/**"
                        ).hasRole("INTERNAL_SERVICE")

                        // =====================================
                        // ALL OTHER ENDPOINTS
                        // =====================================

                        .anyRequest().authenticated()
                )

                .formLogin(form -> form.disable())

                .httpBasic(basic -> basic.disable())

                // Internal service authentication
                .addFilterBefore(
                        internalServiceFilter,
                        UsernamePasswordAuthenticationFilter.class
                )

                // JWT authentication
                .addFilterBefore(
                        jwtFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}