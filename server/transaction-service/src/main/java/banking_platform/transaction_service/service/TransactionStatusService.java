package banking_platform.transaction_service.service;

import banking_platform.transaction_service.entity.Transaction;
import banking_platform.transaction_service.entity.TransactionStatus;
import banking_platform.transaction_service.exception.TransactionNotFoundException;
import banking_platform.transaction_service.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TransactionStatusService {

    private final TransactionRepository transactionRepository;

    /**
     * Marks a transaction as SUCCESS.
     *
     * Uses a new transaction so the status update is committed
     * independently from the Account Service call.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markSuccess(Long transactionId) {

        Transaction transaction =
                transactionRepository.findById(transactionId)
                        .orElseThrow(() ->
                                new TransactionNotFoundException(
                                        "Transaction with ID "
                                                + transactionId
                                                + " was not found"
                                )
                        );

        transaction.setStatus(TransactionStatus.SUCCESS);

        transactionRepository.save(transaction);
    }

    /**
     * Marks a transaction as FAILED.
     *
     * Uses a new transaction so FAILED status is still persisted
     * even when the original operation throws an exception.
     */
    private String normalizeFailureReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return "Transaction failed";
        }

        String trimmedReason = reason.trim();

        if (trimmedReason.length() > 500) {
            return trimmedReason.substring(0, 500);
        }

        return trimmedReason;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(Long transactionId, String reason) {
        Transaction transaction =
                transactionRepository.findById(transactionId)
                        .orElseThrow(() ->
                                new TransactionNotFoundException(
                                        "Transaction with ID " + transactionId + " was not found"
                                ));

        transaction.setStatus(TransactionStatus.FAILED);
        transaction.setFailureReason(normalizeFailureReason(reason));

        transactionRepository.save(transaction);
    }
}