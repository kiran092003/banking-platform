package banking_platform.transaction_service.service;

import banking_platform.transaction_service.metrics.TransactionOutboxMetrics;
import banking_platform.transaction_service.entity.OutboxStatus;
import banking_platform.transaction_service.entity.TransactionOutbox;
import banking_platform.transaction_service.repository.TransactionOutboxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionOutboxStatusService {

    private final TransactionOutboxRepository transactionOutboxRepository;
    private final TransactionOutboxMetrics transactionOutboxMetrics;

    private static final long BASE_RETRY_DELAY_SECONDS = 5;
    private static final int MAX_RETRY_ATTEMPTS = 5;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markPublished(String eventId) {

        TransactionOutbox event =
                transactionOutboxRepository
                        .findByEventId(eventId)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Outbox event not found with eventId: "
                                                + eventId
                                )
                        );

        event.setStatus(OutboxStatus.PUBLISHED);
        event.setPublishedAt(LocalDateTime.now());
        event.setLastError(null);
        event.setNextRetryAt(null);
        event.setClaimedAt(null);

        transactionOutboxRepository.save(event);
        transactionOutboxMetrics.recordPublished();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(
            String eventId,
            String errorMessage
    ) {

        TransactionOutbox event =
                transactionOutboxRepository
                        .findByEventId(eventId)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Outbox event not found with eventId: "
                                                + eventId
                                )
                        );

        int currentRetryCount =
                event.getRetryCount() == null
                        ? 0
                        : event.getRetryCount();

        int nextRetryCount = currentRetryCount + 1;

        event.setRetryCount(nextRetryCount);

        int currentTotalAttempts =
                event.getTotalAttempts() == null
                        ? 0
                        : event.getTotalAttempts();

        event.setTotalAttempts(currentTotalAttempts + 1);

        event.setLastError(errorMessage);

        if (nextRetryCount >= MAX_RETRY_ATTEMPTS) {

            event.setStatus(OutboxStatus.FAILED);
            event.setNextRetryAt(null);

            transactionOutboxMetrics.recordFailed();

            log.error(
                    "Outbox event permanently failed after {} attempts. " +
                            "eventId={}, transactionId={}",
                    nextRetryCount,
                    eventId,
                    event.getTransactionId()
            );

        } else {

            long delaySeconds =
                    BASE_RETRY_DELAY_SECONDS *
                            (1L << Math.min(nextRetryCount - 1, 10));

            event.setStatus(OutboxStatus.PENDING);
            event.setNextRetryAt(
                    LocalDateTime.now().plusSeconds(delaySeconds)
            );

            log.warn(
                    "Outbox event scheduled for retry. " +
                            "eventId={}, transactionId={}, retryCount={}, nextRetryAt={}",
                    eventId,
                    event.getTransactionId(),
                    nextRetryCount,
                    event.getNextRetryAt()
            );
        }

        transactionOutboxRepository.save(event);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void retryFailedEvent(String eventId) {

        TransactionOutbox event =
                transactionOutboxRepository
                        .findByEventId(eventId)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Outbox event not found with eventId: "
                                                + eventId
                                )
                        );

        if (event.getStatus() != OutboxStatus.FAILED) {
            throw new IllegalStateException(
                    "Only FAILED outbox events can be manually retried. " +
                            "Current status: " + event.getStatus()
            );
        }

        int previousRetryCount =
                event.getRetryCount() == null
                        ? 0
                        : event.getRetryCount();

        event.setRetryCount(0);
        event.setStatus(OutboxStatus.PENDING);
        event.setNextRetryAt(LocalDateTime.now());
        event.setLastError(null);

        transactionOutboxRepository.save(event);

        log.info(
                "FAILED outbox event manually scheduled for retry. " +
                        "eventId={}, transactionId={}, previousRetryCount={}, totalAttempts={}",
                event.getEventId(),
                event.getTransactionId(),
                previousRetryCount,
                event.getTotalAttempts()
        );
    }
}