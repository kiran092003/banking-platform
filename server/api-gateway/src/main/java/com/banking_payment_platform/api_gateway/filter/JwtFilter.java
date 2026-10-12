package com.banking_payment_platform.api_gateway.filter;

import com.banking_payment_platform.api_gateway.service.JWTService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JWTService jwtService;

    public JwtFilter(JWTService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        // Public Actuator endpoints
        if (path.startsWith("/actuator/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Public Swagger / OpenAPI endpoints
        if (path.startsWith("/v3/api-docs")
                || path.startsWith("/swagger-ui/")
                || path.startsWith("/swagger/")
                || path.equals("/swagger-ui.html")
                || path.equals("/auth/v3/api-docs")
                || path.equals("/account/v3/api-docs")
                || path.equals("/transaction/v3/api-docs")) {

            filterChain.doFilter(request, response);
            return;
        }

        // Public authentication endpoints
        if (path.equals("/auth/login")
                || path.equals("/auth/register")
                || path.equals("/auth/refresh")
                || path.equals("/auth/logout")) {

            filterChain.doFilter(request, response);
            return;
        }

        /*
         * WebSocket handshake.
         *
         * A browser cannot set an Authorization header on a WebSocket, so this
         * path is authenticated by the single-use ticket in the query string
         * instead — see TicketHandshakeInterceptor, which rejects the handshake
         * unless the ticket redeems and the Origin is allowed. Note that
         * /ws-ticket itself is NOT listed here: minting a ticket still requires
         * a valid Bearer token and is checked below.
         */
        if (path.startsWith("/ws/")) {

            filterChain.doFilter(request, response);
            return;
        }

        String authHeader =
                request.getHeader("Authorization");

        if (authHeader == null
                || !authHeader.startsWith("Bearer ")) {

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"Missing or invalid Authorization header\"}"
            );
            return;
        }

        String token = authHeader.substring(7);

        if (!jwtService.validateToken(token)) {

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"Invalid or expired token\"}"
            );
            return;
        }

        // JWT is valid
        filterChain.doFilter(request, response);
    }
}