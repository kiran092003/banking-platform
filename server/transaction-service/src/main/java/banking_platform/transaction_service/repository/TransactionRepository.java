package banking_platform.transaction_service.repository;

import banking_platform.transaction_service.entity.Transaction;
import banking_platform.transaction_service.entity.TransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TransactionRepository
        extends JpaRepository<Transaction, Long>,
        JpaSpecificationExecutor<Transaction> {

    /*
     * Used for idempotency checking.
     */
    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);

    /*
     * Used to ensure that a transaction belongs to
     * the authenticated user.
     */
    Optional<Transaction> findByIdAndUserId(
            Long id,
            Long userId
    );

    /*
     * Finds a transaction only when the given account
     * is either the sender or receiver.
     */
    @Query("""
            SELECT t
            FROM Transaction t
            WHERE t.id = :transactionId
              AND (
                    t.senderAccountId = :accountId
                    OR
                    t.receiverAccountId = :accountId
                  )
            """)
    Optional<Transaction> findUserTransaction(
            @Param("transactionId") Long transactionId,
            @Param("accountId") Long accountId
    );

    /*
     * User transaction history.
     */
    Page<Transaction> findByUserId(
            Long userId,
            Pageable pageable
    );

    Page<Transaction> findByUserIdAndStatus(
            Long userId,
            TransactionStatus status,
            Pageable pageable
    );

    /*
     * Admin/internal filtering.
     */
    Page<Transaction> findBySenderAccountId(
            Long senderAccountId,
            Pageable pageable
    );

    Page<Transaction> findByReceiverAccountId(
            Long receiverAccountId,
            Pageable pageable
    );

    Page<Transaction> findByStatus(
            TransactionStatus status,
            Pageable pageable
    );

    Page<Transaction> findBySenderAccountIdAndStatus(
            Long senderAccountId,
            TransactionStatus status,
            Pageable pageable
    );

    Page<Transaction> findByReceiverAccountIdAndStatus(
            Long receiverAccountId,
            TransactionStatus status,
            Pageable pageable
    );
}