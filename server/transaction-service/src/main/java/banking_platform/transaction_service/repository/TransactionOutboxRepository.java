package banking_platform.transaction_service.repository;

import banking_platform.transaction_service.entity.OutboxStatus;
import banking_platform.transaction_service.entity.TransactionOutbox;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TransactionOutboxRepository
        extends JpaRepository<TransactionOutbox, Long> {

    Optional<TransactionOutbox> findByEventId(String eventId);

    @Query("""
            SELECT o
            FROM TransactionOutbox o
            WHERE o.status = :status
              AND (o.nextRetryAt IS NULL OR o.nextRetryAt <= :currentTime)
            ORDER BY o.createdAt ASC
            """)
    List<TransactionOutbox> findReadyEvents(
            @Param("status") OutboxStatus status,
            @Param("currentTime") LocalDateTime currentTime
    );

    @Modifying
    @Query("""
        UPDATE TransactionOutbox o
        SET o.status =
                banking_platform.transaction_service.entity.OutboxStatus.PUBLISHING,
            o.claimedAt = :claimedAt
        WHERE o.id = :id
          AND o.status =
                banking_platform.transaction_service.entity.OutboxStatus.PENDING
        """)
    int claimEvent(
            @Param("id") Long id,
            @Param("claimedAt") LocalDateTime claimedAt
    );

    @Modifying
    @Query("""
        UPDATE TransactionOutbox o
        SET o.status =
                banking_platform.transaction_service.entity.OutboxStatus.PENDING,
            o.claimedAt = NULL,
            o.nextRetryAt = :currentTime
        WHERE o.status =
                banking_platform.transaction_service.entity.OutboxStatus.PUBLISHING
          AND o.claimedAt IS NOT NULL
          AND o.claimedAt <= :leaseExpiryTime
        """)
    int recoverAbandonedEvents(
            @Param("leaseExpiryTime") LocalDateTime leaseExpiryTime,
            @Param("currentTime") LocalDateTime currentTime
    );

    long countByStatus(OutboxStatus status);
}