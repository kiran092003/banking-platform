package com.example.notification_service.service;

import com.example.notification_service.dto.TransactionEvent;
import com.example.notification_service.entity.Notification;
import com.example.notification_service.event.NotificationCreatedEvent;
import com.example.notification_service.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void processTransactionEvent(TransactionEvent event) {

        String eventId = event.eventId().toString();

        /*
         * Fast duplicate check.
         */
        if (notificationRepository.existsByEventId(eventId)) {

            log.info(
                    "Duplicate transaction event ignored. eventId={}, transactionId={}",
                    eventId,
                    event.transactionId()
            );

            return;
        }

        Notification notification = Notification.builder()
                .eventId(eventId)
                .transactionId(event.transactionId())
                .userId(event.userId())
                .senderAccountId(event.senderAccountId())
                .receiverAccountId(event.receiverAccountId())
                .amount(event.amount())
                .transactionType(event.transactionType())
                .transactionStatus(event.status())
                .message(buildNotificationMessage(event))
                .createdAt(
                        event.occurredAt() != null
                                ? event.occurredAt()
                                : LocalDateTime.now()
                )
                .build();

        try {

            Notification saved = notificationRepository.save(notification);

            /*
             * Published, not pushed, on purpose.
             *
             * The listener runs only after this transaction commits, so a
             * client can never be told about a notification that a rollback
             * then removed, and can never fetch the list and find it missing.
             */
            eventPublisher.publishEvent(new NotificationCreatedEvent(saved));

            log.info(
                    "Notification created successfully. eventId={}, transactionId={}, userId={}",
                    eventId,
                    event.transactionId(),
                    event.userId()
            );

        } catch (DataIntegrityViolationException exception) {

            /*
             * Handles a race condition where two Kafka deliveries
             * process the same event at almost the same time.
             *
             * The UNIQUE constraint on event_id is the final
             * protection against duplicate notifications.
             */
            log.info(
                    "Duplicate transaction event detected by database. eventId={}",
                    eventId
            );
        }
    }

    private String buildNotificationMessage(TransactionEvent event) {

        return switch (event.transactionType()) {

            case "TRANSFER" ->
                    String.format(
                            "Transaction %s: Transfer of %.2f was %s.",
                            event.transactionId(),
                            event.amount(),
                            event.status().toLowerCase()
                    );

            case "DEPOSIT" ->
                    String.format(
                            "Transaction %s: Deposit of %.2f was %s.",
                            event.transactionId(),
                            event.amount(),
                            event.status().toLowerCase()
                    );

            case "WITHDRAWAL" ->
                    String.format(
                            "Transaction %s: Withdrawal of %.2f was %s.",
                            event.transactionId(),
                            event.amount(),
                            event.status().toLowerCase()
                    );

            default ->
                    String.format(
                            "Transaction %s was %s.",
                            event.transactionId(),
                            event.status().toLowerCase()
                    );
        };
    }
}