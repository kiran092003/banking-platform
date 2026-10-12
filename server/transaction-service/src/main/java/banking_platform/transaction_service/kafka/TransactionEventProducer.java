package banking_platform.transaction_service.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionEventProducer {

    private static final String TOPIC = "transaction-events";

    private final KafkaTemplate<String, String> kafkaTemplate;

    /**
     * Publishes an outbox payload to Kafka and waits for the broker
     * acknowledgement.
     *
     * The outbox event is marked PUBLISHED only after this method
     * returns successfully.
     */
    public void publish(
            String eventId,
            Long transactionId,
            String payload
    ) {

        String key = String.valueOf(transactionId);

        try {

            kafkaTemplate
                    .send(TOPIC, key, payload)
                    .get(10, TimeUnit.SECONDS);

            log.info(
                    "Transaction event published successfully. " +
                            "eventId={}, transactionId={}",
                    eventId,
                    transactionId
            );

        } catch (Exception exception) {

            log.error(
                    "Failed to publish transaction event. " +
                            "eventId={}, transactionId={}",
                    eventId,
                    transactionId,
                    exception
            );

            throw new IllegalStateException(
                    "Failed to publish transaction event to Kafka",
                    exception
            );
        }
    }
}