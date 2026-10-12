package banking_platform.transaction_service.service;

import banking_platform.transaction_service.dto.TransactionHistoryResponse;
import banking_platform.transaction_service.dto.TransactionResponse;
import banking_platform.transaction_service.entity.Transaction;
import banking_platform.transaction_service.entity.TransactionStatus;
import banking_platform.transaction_service.entity.TransactionType;
import banking_platform.transaction_service.exception.InvalidTransactionException;
import banking_platform.transaction_service.repository.TransactionRepository;
import banking_platform.transaction_service.specification.TransactionSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TransactionHistoryService {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 50;

    private final TransactionRepository transactionRepository;


    @Transactional(readOnly = true)
    public TransactionHistoryResponse getTransactionHistory(
            int page,
            int size,
            TransactionStatus status,
            TransactionType transactionType,
            LocalDateTime from,
            LocalDateTime to,
            String sortBy,
            String direction
    ) {

        // ---------------------------------------------------------
        // STEP 1: Validate pagination
        // ---------------------------------------------------------

        validatePagination(page, size);


        // ---------------------------------------------------------
        // STEP 2: Validate date range
        // ---------------------------------------------------------

        validateDateRange(from, to);


        // ---------------------------------------------------------
        // STEP 3: Get authenticated user
        // ---------------------------------------------------------

        Long userId = getAuthenticatedUserId();


        // ---------------------------------------------------------
        // STEP 4: Validate sorting
        // ---------------------------------------------------------

        String validatedSortBy =
                validateSortField(sortBy);

        Sort.Direction sortDirection =
                validateSortDirection(direction);


        // ---------------------------------------------------------
        // STEP 5: Create pageable
        // ---------------------------------------------------------

        Pageable pageable =
                PageRequest.of(
                        page,
                        size,
                        Sort.by(
                                sortDirection,
                                validatedSortBy
                        )
                );


        // ---------------------------------------------------------
        // STEP 6: Build specification
        // ---------------------------------------------------------

        Specification<Transaction> specification =
                TransactionSpecification.hasUserId(userId);


        if (status != null) {

            specification =
                    specification.and(
                            TransactionSpecification.hasStatus(
                                    status
                            )
                    );
        }


        if (transactionType != null) {

            specification =
                    specification.and(
                            TransactionSpecification
                                    .hasTransactionType(
                                            transactionType
                                    )
                    );
        }


        if (from != null) {

            specification =
                    specification.and(
                            TransactionSpecification
                                    .createdAtFrom(from)
                    );
        }


        if (to != null) {

            specification =
                    specification.and(
                            TransactionSpecification
                                    .createdAtBefore(to)
                    );
        }


        // ---------------------------------------------------------
        // STEP 7: Execute query
        // ---------------------------------------------------------

        Page<Transaction> transactionPage =
                transactionRepository.findAll(
                        specification,
                        pageable
                );


        // ---------------------------------------------------------
        // STEP 8: Build response
        // ---------------------------------------------------------

        return new TransactionHistoryResponse(
                transactionPage
                        .getContent()
                        .stream()
                        .map(this::mapToResponse)
                        .toList(),

                transactionPage.getNumber(),

                transactionPage.getSize(),

                transactionPage.getTotalElements(),

                transactionPage.getTotalPages(),

                transactionPage.isFirst(),

                transactionPage.isLast()
        );
    }


    private void validatePagination(
            int page,
            int size
    ) {

        if (page < 0) {

            throw new InvalidTransactionException(
                    "Page number cannot be negative"
            );
        }

        if (size <= 0) {

            throw new InvalidTransactionException(
                    "Page size must be greater than zero"
            );
        }

        if (size > MAX_PAGE_SIZE) {

            throw new InvalidTransactionException(
                    "Page size cannot exceed "
                            + MAX_PAGE_SIZE
            );
        }
    }


    private void validateDateRange(
            LocalDateTime from,
            LocalDateTime to
    ) {

        if (from != null
                && to != null
                && !from.isBefore(to)) {

            throw new InvalidTransactionException(
                    "'from' date must be before 'to' date"
            );
        }
    }


    private String validateSortField(
            String sortBy
    ) {

        if (sortBy == null
                || sortBy.isBlank()) {

            return "createdAt";
        }

        return switch (sortBy) {

            case "id",
                 "amount",
                 "createdAt",
                 "status",
                 "transactionType" ->
                    sortBy;

            default ->
                    throw new InvalidTransactionException(
                            "Invalid sort field: "
                                    + sortBy
                    );
        };
    }


    private Sort.Direction validateSortDirection(
            String direction
    ) {

        if (direction == null
                || direction.isBlank()) {

            return Sort.Direction.DESC;
        }

        try {

            return Sort.Direction.valueOf(
                    direction.toUpperCase()
            );

        } catch (IllegalArgumentException exception) {

            throw new InvalidTransactionException(
                    "Sort direction must be ASC or DESC"
            );
        }
    }


    private Long getAuthenticatedUserId() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null) {

            throw new InvalidTransactionException(
                    "Authentication is required"
            );
        }

        Object details =
                authentication.getDetails();

        if (!(details instanceof Long userId)) {

            throw new InvalidTransactionException(
                    "Invalid authenticated user information"
            );
        }

        if (userId <= 0) {

            throw new InvalidTransactionException(
                    "Invalid authenticated user ID"
            );
        }

        return userId;
    }


    private TransactionResponse mapToResponse(
            Transaction transaction
    ) {

        return new TransactionResponse(
                transaction.getId(),
                transaction.getUserId(),
                transaction.getSenderAccountId(),
                transaction.getReceiverAccountId(),
                transaction.getAmount(),
                transaction.getTransactionType(),
                transaction.getStatus(),
                transaction.getFailureReason(),
                transaction.getCreatedAt(),
                transaction.getIdempotencyKey()
        );
    }
}