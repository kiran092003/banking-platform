package com.banking_payment_platform.api_gateway.config;

import com.banking_payment_platform.api_gateway.filter.JwtFilter;
import com.banking_payment_platform.api_gateway.filter.RateLimitFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayConfig {

    @Bean
    public FilterRegistrationBean<RateLimitFilter> rateLimitFilterRegistration(
            RateLimitFilter rateLimitFilter) {

        FilterRegistrationBean<RateLimitFilter> registration =
                new FilterRegistrationBean<>();

        registration.setFilter(rateLimitFilter);

        // Apply rate limiting to authentication endpoints
        registration.addUrlPatterns("/auth/*");

        // Rate limiter should execute first
        registration.setOrder(1);

        return registration;
    }

    @Bean
    public FilterRegistrationBean<JwtFilter> jwtFilterRegistration(
            JwtFilter jwtFilter) {

        FilterRegistrationBean<JwtFilter> registration =
                new FilterRegistrationBean<>();

        registration.setFilter(jwtFilter);

        registration.addUrlPatterns("/*");

        // JWT executes after rate limiter
        registration.setOrder(2);

        return registration;
    }
}