package com.banking_payment_platform.api_gateway.filter;

import com.banking_payment_platform.api_gateway.metrics.GatewayRateLimitMetrics;
import com.banking_payment_platform.api_gateway.service.RateLimitService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;
    private final GatewayRateLimitMetrics gatewayRateLimitMetrics;

    public RateLimitFilter(
            RateLimitService rateLimitService,
            GatewayRateLimitMetrics gatewayRateLimitMetrics
    ) {
        this.rateLimitService = rateLimitService;
        this.gatewayRateLimitMetrics = gatewayRateLimitMetrics;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String clientIp = request.getRemoteAddr();

        boolean allowed =
                rateLimitService.isAllowed(clientIp);

        if (!allowed) {

            gatewayRateLimitMetrics.recordRejected();

            response.setStatus(429);

            response.setHeader(
                    "Retry-After",
                    "60"
            );

            response.setContentType(
                    "application/json"
            );

            response.getWriter().write(
                    "{\"error\":\"Too many requests. Please try again later.\"}"
            );

            return;
        }

        gatewayRateLimitMetrics.recordAllowed();

        filterChain.doFilter(
                request,
                response
        );
    }
}