package banking_platform.transaction_service.filter;

import banking_platform.transaction_service.service.JWTService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JWTService jwtService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader =
                request.getHeader("Authorization");

        System.out.println(
                "Authorization Header: " + authHeader
        );


        // =====================================================
        // CHECK AUTHORIZATION HEADER
        // =====================================================

        if (authHeader == null ||
                !authHeader.startsWith("Bearer ")) {

            System.out.println(
                    "No Bearer token found"
            );

            filterChain.doFilter(request, response);
            return;
        }


        String token =
                authHeader.substring(7);


        try {

            // =================================================
            // VALIDATE JWT
            // =================================================

            if (jwtService.isTokenValid(token)) {

                String username =
                        jwtService.extractUsername(token);

                Long userId =
                        jwtService.extractUserId(token);

                String role =
                        jwtService.extractRole(token);


                System.out.println("JWT valid");
                System.out.println(
                        "Username: " + username
                );
                System.out.println(
                        "User ID: " + userId
                );
                System.out.println(
                        "Role: " + role
                );


                // =============================================
                // CREATE SPRING AUTHORITY
                // =============================================

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                username,
                                null,
                                List.of(
                                        new SimpleGrantedAuthority(
                                                "ROLE_" + role
                                        )
                                )
                        );


                // Store userId
                authentication.setDetails(userId);


                // Set authentication
                SecurityContextHolder
                        .getContext()
                        .setAuthentication(authentication);

            } else {

                System.out.println(
                        "JWT invalid"
                );
            }

        } catch (Exception e) {

            System.out.println(
                    "JWT validation failed: "
                            + e.getMessage()
            );
        }


        filterChain.doFilter(request, response);
    }
}