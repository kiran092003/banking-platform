package banking_platform.transaction_service.service;

import banking_platform.transaction_service.dto.TransactionEvent;
import banking_platform.transaction_service.entity.Transaction;
import banking_platform.transaction_service.entity.TransactionStatus;
import banking_platform.transaction_service.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TransactionSuccessService {

    private final TransactionRepository transactionRepository;
    private final TransactionOutboxService transactionOutboxService;

    @Transactional
    public void markSuccessAndCreateOutbox(
            Long transactionId,
            TransactionEvent event
    ) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "Transaction not found with id: " + transactionId
                        )
                );

        transaction.setStatus(TransactionStatus.SUCCESS);

        transactionRepository.save(transaction);

        transactionOutboxService.createOutboxEvent(event);
    }
}