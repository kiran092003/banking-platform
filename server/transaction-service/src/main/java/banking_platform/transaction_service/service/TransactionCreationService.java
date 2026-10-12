package banking_platform.transaction_service.service;

import banking_platform.transaction_service.entity.Transaction;
import banking_platform.transaction_service.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TransactionCreationService {

    private final TransactionRepository transactionRepository;

    /**
     * Creates and commits the transaction as PENDING.
     *
     * This runs in a separate transaction so that the PENDING
     * transaction is persisted before calling Account Service.
     *
     * Only the ID is returned.
     * We intentionally do NOT return the managed Transaction entity
     * because it becomes detached after this transaction commits.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Long createPendingTransaction(Transaction transaction) {

        Transaction savedTransaction =
                transactionRepository.save(transaction);

        transactionRepository.flush();

        return savedTransaction.getId();
    }
}