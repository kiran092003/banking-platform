package banking_platform.transaction_service.specification;

import banking_platform.transaction_service.entity.Transaction;
import banking_platform.transaction_service.entity.TransactionStatus;
import banking_platform.transaction_service.entity.TransactionType;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public final class TransactionSpecification {

    private TransactionSpecification() {
    }

    public static Specification<Transaction> hasUserId(
            Long userId
    ) {

        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(
                        root.get("userId"),
                        userId
                );
    }


    public static Specification<Transaction> hasStatus(
            TransactionStatus status
    ) {

        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(
                        root.get("status"),
                        status
                );
    }


    public static Specification<Transaction> hasTransactionType(
            TransactionType transactionType
    ) {

        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(
                        root.get("transactionType"),
                        transactionType
                );
    }


    public static Specification<Transaction> createdAtFrom(
            LocalDateTime from
    ) {

        return (root, query, criteriaBuilder) ->
                criteriaBuilder.greaterThanOrEqualTo(
                        root.get("createdAt"),
                        from
                );
    }


    public static Specification<Transaction> createdAtBefore(
            LocalDateTime to
    ) {

        return (root, query, criteriaBuilder) ->
                criteriaBuilder.lessThan(
                        root.get("createdAt"),
                        to
                );
    }
}