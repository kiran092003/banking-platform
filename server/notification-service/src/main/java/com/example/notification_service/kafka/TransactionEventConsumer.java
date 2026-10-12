package com.example.notification_service.kafka;

import com.example.notification_service.dto.TransactionEvent;
import com.example.notification_service.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionEventConsumer {

    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;

    @KafkaListener(
            topics = "transaction-events",
            groupId = "notification-service-group"
    )
    public void consume(
            String message,
            Acknowledgment acknowledgment
    ) {

        log.info(
                "Transaction event received from Kafka. message={}",
                message
        );

        try {

            TransactionEvent event =
                    objectMapper.readValue(
                            message,
                            TransactionEvent.class
                    );

            notificationService.processTransactionEvent(event);

            /*
             * Acknowledge Kafka only after the database
             * transaction has completed successfully.
             */
            acknowledgment.acknowledge();

            log.info(
                    "Transaction event processed successfully. eventId={}, transactionId={}",
                    event.eventId(),
                    event.transactionId()
            );

        } catch (Exception exception) {

            log.error(
                    "Failed to process transaction event. " +
                            "Kafka message will not be acknowledged.",
                    exception
            );

            /*
             * Do NOT acknowledge the message.
             *
             * Kafka can redeliver it according to the
             * consumer error-handling configuration.
             */
            throw new IllegalStateException(
                    "Failed to process transaction event",
                    exception
            );
        }
    }
}