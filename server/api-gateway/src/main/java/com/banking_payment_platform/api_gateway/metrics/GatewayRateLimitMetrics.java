package com.banking_payment_platform.api_gateway.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class GatewayRateLimitMetrics {

    private final Counter allowedCounter;
    private final Counter rejectedCounter;

    public GatewayRateLimitMetrics(
            MeterRegistry meterRegistry
    ) {

        allowedCounter =
                Counter.builder(
                                "banking.gateway.rate_limit.allowed"
                        )
                        .description(
                                "Number of requests allowed by the gateway rate limiter"
                        )
                        .register(meterRegistry);

        rejectedCounter =
                Counter.builder(
                                "banking.gateway.rate_limit.rejected"
                        )
                        .description(
                                "Number of requests rejected by the gateway rate limiter"
                        )
                        .register(meterRegistry);
    }

    public void recordAllowed() {
        allowedCounter.increment();
    }

    public void recordRejected() {
        rejectedCounter.increment();
    }
}