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
import java.util.Objects;

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
         * A transfer concerns two people, so one Kafka event can produce two
         * notifications: one for the account that sent the money and one for
         * the account that received it.
         *
         * The sender's row keeps the bare eventId it has always had, so events
         * stored before counterparty notifications existed still de-duplicate.
         * The counterparty's row is suffixed with their user id, which keeps
         * the UNIQUE constraint on event_id doing its job per recipient.
         */
        createNotification(
                event,
                event.userId(),
                eventId,
                false
        );

        Long receiverUserId = event.receiverUserId();

        if (receiverUserId != null
                && !Objects.equals(receiverUserId, event.userId())) {

            createNotification(
                    event,
                    receiverUserId,
                    eventId + ":" + receiverUserId,
                    true
            );
        }
    }

    /**
     * Stores one notification for one recipient.
     *
     * @param incoming whether the recipient is on the receiving end, which
     *                 decides how the message is worded
     */
    private void createNotification(
            TransactionEvent event,
            Long userId,
            String notificationEventId,
            boolean incoming
    ) {

        if (userId == null) {

            log.warn(
                    "Transaction event has no recipient user. eventId={}, transactionId={}",
                    notificationEventId,
                    event.transactionId()
            );

            return;
        }

        /*
         * Fast duplicate check.
         */
        if (notificationRepository.existsByEventId(notificationEventId)) {

            log.info(
                    "Duplicate transaction event ignored. eventId={}, transactionId={}",
                    notificationEventId,
                    event.transactionId()
            );

            return;
        }

        Notification notification = Notification.builder()
                .eventId(notificationEventId)
                .transactionId(event.transactionId())
                .userId(userId)
                .senderAccountId(event.senderAccountId())
                .receiverAccountId(event.receiverAccountId())
                .amount(event.amount())
                .transactionType(event.transactionType())
                .transactionStatus(event.status())
                .message(buildNotificationMessage(event, incoming))
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
                    notificationEventId,
                    event.transactionId(),
                    userId
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
                    notificationEventId
            );
        }
    }

    private String buildNotificationMessage(
            TransactionEvent event,
            boolean incoming
    ) {

        return switch (event.transactionType()) {

            case "TRANSFER" -> incoming
                    ? String.format(
                            "Transaction %s: Transfer of %.2f from account %s was %s.",
                            event.transactionId(),
                            event.amount(),
                            event.senderAccountId(),
                            event.status().toLowerCase()
                    )
                    : String.format(
                            "Transaction %s: Transfer of %.2f to account %s was %s.",
                            event.transactionId(),
                            event.amount(),
                            event.receiverAccountId(),
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
