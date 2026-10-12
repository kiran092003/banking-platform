package banking_platform.transaction_service.metrics;

import banking_platform.transaction_service.entity.OutboxStatus;
import banking_platform.transaction_service.repository.TransactionOutboxRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public class TransactionOutboxMetrics {

    private final Counter publishedCounter;
    private final Counter failedCounter;
    private final Counter publishFailureCounter;

    private final TransactionOutboxRepository transactionOutboxRepository;

    public TransactionOutboxMetrics(
            MeterRegistry meterRegistry,
            TransactionOutboxRepository transactionOutboxRepository
    ) {

        this.transactionOutboxRepository = transactionOutboxRepository;

        this.publishedCounter =
                Counter.builder("banking.outbox.published")
                        .description(
                                "Number of transaction outbox events successfully published"
                        )
                        .register(meterRegistry);

        this.failedCounter =
                Counter.builder("banking.outbox.failed")
                        .description(
                                "Number of transaction outbox events permanently failed"
                        )
                        .register(meterRegistry);

        this.publishFailureCounter =
                Counter.builder("banking.outbox.publish.failures")
                        .description(
                                "Number of transaction outbox publish failures"
                        )
                        .register(meterRegistry);

        Gauge.builder(
                        "banking.outbox.pending",
                        this,
                        TransactionOutboxMetrics::getPendingCount
                )
                .description(
                        "Current number of pending transaction outbox events"
                )
                .register(meterRegistry);
    }

    public void recordPublished() {
        publishedCounter.increment();
    }

    public void recordFailed() {
        failedCounter.increment();
    }

    public void recordPublishFailure() {
        publishFailureCounter.increment();
    }

    private double getPendingCount() {
        return transactionOutboxRepository
                .countByStatus(OutboxStatus.PENDING);
    }
}