package com.example.notification_service.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Guards the internal WebSocket endpoint that the API Gateway connects to.
 *
 * Mirrors account-service's InternalServiceFilter: only a caller presenting the
 * shared service key may reach /internal/**, which is never exposed through the
 * gateway's public routes and is therefore unreachable from a browser.
 */
@Component
public class InternalServiceFilter extends OncePerRequestFilter {

    private static final String INTERNAL_KEY_HEADER = "X-Internal-Service-Key";

    private final String internalServiceKey;

    public InternalServiceFilter(
            @Value("${internal.service.key}") String internalServiceKey
    ) {
        this.internalServiceKey = internalServiceKey;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        if (!request.getRequestURI().startsWith("/internal/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String providedKey = request.getHeader(INTERNAL_KEY_HEADER);

        if (!matches(providedKey)) {

            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"Internal service access denied\"}"
            );
            return;
        }

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        "internal-service",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_INTERNAL_SERVICE"))
                );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }

    /**
     * Constant-time comparison so the key cannot be recovered by timing the
     * rejection of progressively-closer guesses.
     */
    private boolean matches(String providedKey) {

        if (providedKey == null) {
            return false;
        }

        return MessageDigest.isEqual(
                providedKey.getBytes(StandardCharsets.UTF_8),
                internalServiceKey.getBytes(StandardCharsets.UTF_8)
        );
    }
}
