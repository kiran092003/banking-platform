package com.banking_payment_platform.auth_service.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class AuthBusinessMetrics {

    private final Counter loginSuccessCounter;
    private final Counter loginFailureCounter;

    private final Counter registrationSuccessCounter;
    private final Counter registrationFailureCounter;

    private final Counter refreshSuccessCounter;
    private final Counter refreshFailureCounter;

    private final Counter logoutSuccessCounter;
    private final Counter logoutFailureCounter;

    public AuthBusinessMetrics(MeterRegistry meterRegistry) {

        loginSuccessCounter =
                Counter.builder("banking.auth.login.success")
                        .description("Number of successful user logins")
                        .register(meterRegistry);

        loginFailureCounter =
                Counter.builder("banking.auth.login.failure")
                        .description("Number of failed user login attempts")
                        .register(meterRegistry);

        registrationSuccessCounter =
                Counter.builder("banking.auth.registration.success")
                        .description("Number of successful user registrations")
                        .register(meterRegistry);

        registrationFailureCounter =
                Counter.builder("banking.auth.registration.failure")
                        .description("Number of failed user registrations")
                        .register(meterRegistry);

        refreshSuccessCounter =
                Counter.builder("banking.auth.token.refresh.success")
                        .description("Number of successful access token refresh operations")
                        .register(meterRegistry);

        refreshFailureCounter =
                Counter.builder("banking.auth.token.refresh.failure")
                        .description("Number of failed access token refresh operations")
                        .register(meterRegistry);

        logoutSuccessCounter =
                Counter.builder("banking.auth.logout.success")
                        .description("Number of successful user logouts")
                        .register(meterRegistry);

        logoutFailureCounter =
                Counter.builder("banking.auth.logout.failure")
                        .description("Number of failed user logout operations")
                        .register(meterRegistry);
    }

    public void recordLoginSuccess() {
        loginSuccessCounter.increment();
    }

    public void recordLoginFailure() {
        loginFailureCounter.increment();
    }

    public void recordRegistrationSuccess() {
        registrationSuccessCounter.increment();
    }

    public void recordRegistrationFailure() {
        registrationFailureCounter.increment();
    }

    public void recordRefreshSuccess() {
        refreshSuccessCounter.increment();
    }

    public void recordRefreshFailure() {
        refreshFailureCounter.increment();
    }

    public void recordLogoutSuccess() {
        logoutSuccessCounter.increment();
    }

    public void recordLogoutFailure() {
        logoutFailureCounter.increment();
    }
}