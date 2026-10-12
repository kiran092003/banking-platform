package banking_platform.transaction_service.kafka;

import banking_platform.transaction_service.entity.OutboxStatus;
import banking_platform.transaction_service.entity.TransactionOutbox;
import banking_platform.transaction_service.metrics.TransactionOutboxMetrics;
import banking_platform.transaction_service.repository.TransactionOutboxRepository;
import banking_platform.transaction_service.service.TransactionOutboxClaimService;
import banking_platform.transaction_service.service.TransactionOutboxStatusService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionOutboxPublisher {

    private final TransactionOutboxRepository transactionOutboxRepository;
    private final TransactionEventProducer transactionEventProducer;
    private final TransactionOutboxStatusService transactionOutboxStatusService;
    private final TransactionOutboxClaimService transactionOutboxClaimService;
    private final TransactionOutboxMetrics transactionOutboxMetrics;

    @Scheduled(fixedDelayString = "${outbox.publisher.fixed-delay:1000}")
    public void publishPendingEvents() {

        List<TransactionOutbox> events =
                transactionOutboxRepository.findReadyEvents(
                        OutboxStatus.PENDING,
                        LocalDateTime.now()
                );

        if (events.isEmpty()) {
            return;
        }

        log.info(
                "Found {} pending transaction outbox events",
                events.size()
        );

        for (TransactionOutbox event : events) {

            boolean claimed =
                    transactionOutboxClaimService.claimEvent(
                            event.getId()
                    );

            if (!claimed) {

                log.info(
                        "Outbox event was already claimed by another instance. " +
                                "Skipping eventId={}, transactionId={}",
                        event.getEventId(),
                        event.getTransactionId()
                );

                continue;
            }

            publishEvent(event);
        }
    }

    private void publishEvent(TransactionOutbox event) {

        try {

            transactionEventProducer.publish(
                    event.getEventId(),
                    event.getTransactionId(),
                    event.getPayload()
            );

            transactionOutboxStatusService.markPublished(
                    event.getEventId()
            );

        } catch (RuntimeException exception) {

            transactionOutboxMetrics.recordPublishFailure();

            log.error(
                    "Failed to publish outbox event. " +
                            "eventId={}, transactionId={}",
                    event.getEventId(),
                    event.getTransactionId(),
                    exception
            );

            transactionOutboxStatusService.markFailed(
                    event.getEventId(),
                    exception.getMessage()
            );
        }
    }

    @Scheduled(fixedDelayString = "${outbox.publisher.recovery-delay:30000}")
    public void recoverAbandonedEvents() {

        int recoveredEvents =
                transactionOutboxClaimService.recoverAbandonedEvents();

        if (recoveredEvents > 0) {

            log.warn(
                    "Recovered {} abandoned PUBLISHING outbox events",
                    recoveredEvents
            );
        }
    }
}