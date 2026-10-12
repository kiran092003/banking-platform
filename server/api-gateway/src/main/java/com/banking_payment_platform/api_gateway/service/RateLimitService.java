package com.banking_payment_platform.api_gateway.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RateLimitService {

    private static final Logger log =
            LoggerFactory.getLogger(RateLimitService.class);

    private final ProxyManager<String> proxyManager;

    private static final long CAPACITY = 100;

    private static final Duration REFILL_PERIOD =
            Duration.ofMinutes(1);

    public RateLimitService(
            ProxyManager<String> proxyManager
    ) {
        this.proxyManager = proxyManager;
    }

    public boolean isAllowed(String clientIp) {

        Bucket bucket =
                proxyManager.builder()
                        .build(
                                clientIp,
                                () ->
                                        BucketConfiguration.builder()
                                                .addLimit(
                                                        Bandwidth.builder()
                                                                .capacity(CAPACITY)
                                                                .refillIntervally(
                                                                        CAPACITY,
                                                                        REFILL_PERIOD
                                                                )
                                                                .build()
                                                )
                                                .build()
                        );

        ConsumptionProbe probe =
                bucket.tryConsumeAndReturnRemaining(1);

        boolean allowed =
                probe.isConsumed();

        if (allowed) {

            log.info(
                    "Gateway rate limit request allowed. clientIp={}, remainingTokens={}",
                    clientIp,
                    probe.getRemainingTokens()
            );

        } else {

            log.warn(
                    "Gateway rate limit request rejected. clientIp={}, retryAfterNanos={}",
                    clientIp,
                    probe.getNanosToWaitForRefill()
            );
        }

        return allowed;
    }
}