package banking_platform.transaction_service.service;

import banking_platform.transaction_service.dto.TransactionEvent;
import banking_platform.transaction_service.entity.OutboxStatus;
import banking_platform.transaction_service.entity.TransactionOutbox;
import banking_platform.transaction_service.repository.TransactionOutboxRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TransactionOutboxService {

    private final TransactionOutboxRepository transactionOutboxRepository;
    private final ObjectMapper objectMapper;

    @Transactional(propagation = Propagation.MANDATORY)
    public void createOutboxEvent(TransactionEvent event) {

        String payload;

        try {
            payload = objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException(
                    "Failed to serialize transaction event",
                    exception
            );
        }

        TransactionOutbox outbox = TransactionOutbox.builder()
                .eventId(String.valueOf(event.eventId()))
                .transactionId(event.transactionId())
                .payload(payload)
                .status(OutboxStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .retryCount(0)
                .totalAttempts(0)
                .nextRetryAt(LocalDateTime.now())
                .build();

        transactionOutboxRepository.save(outbox);
    }
}