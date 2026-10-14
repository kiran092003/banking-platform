package banking_platform.AccountService.filter;

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
import java.util.List;

@Component
public class InternalServiceFilter extends OncePerRequestFilter {

    private static final String INTERNAL_KEY_HEADER =
            "X-Internal-Service-Key";

    private static final String INTERNAL_TRANSFER_PATH =
            "/accounts/internal/transfer";

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

        String requestUri = request.getRequestURI();

        // Only handle the internal transfer endpoint
        boolean internalEndpoint =
                requestUri.equals("/accounts/internal/transfer")
                        || requestUri.equals("/accounts/internal/deposit")
                        || requestUri.equals("/accounts/internal/withdraw")
                        || requestUri.startsWith("/accounts/internal/user/")
                        || requestUri.startsWith("/accounts/internal/id/");

        if (!internalEndpoint) {
            filterChain.doFilter(request, response);
            return;
        }

        String providedKey =
                request.getHeader(INTERNAL_KEY_HEADER);

        // =====================================================
        // VALIDATE INTERNAL SERVICE KEY
        // =====================================================

        if (providedKey == null
                || !providedKey.equals(internalServiceKey)) {

            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType("application/json");

            response.getWriter().write(
                    """
                    {
                        "error": "Internal service access denied"
                    }
                    """
            );

            return;
        }

        // =====================================================
        // CREATE INTERNAL SERVICE AUTHENTICATION
        // =====================================================

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        "transaction-service",
                        null,
                        List.of(
                                new SimpleGrantedAuthority(
                                        "ROLE_INTERNAL_SERVICE"
                                )
                        )
                );

        SecurityContextHolder
                .getContext()
                .setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }
}