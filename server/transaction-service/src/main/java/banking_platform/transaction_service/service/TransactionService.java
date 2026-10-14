package banking_platform.transaction_service.service;

import banking_platform.transaction_service.client.AccountClient;
import banking_platform.transaction_service.dto.AccountBalanceRequest;
import banking_platform.transaction_service.dto.AccountDetailsResponse;
import banking_platform.transaction_service.dto.AccountTransferRequest;
import banking_platform.transaction_service.dto.CreateTransactionRequest;
import banking_platform.transaction_service.dto.TransactionEvent;
import banking_platform.transaction_service.dto.TransactionResponse;
import banking_platform.transaction_service.entity.Transaction;
import banking_platform.transaction_service.entity.TransactionStatus;
import banking_platform.transaction_service.entity.TransactionType;
import banking_platform.transaction_service.exception.InvalidTransactionException;
import banking_platform.transaction_service.exception.TransactionNotFoundException;
import banking_platform.transaction_service.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountClient accountClient;
    private final TransactionStatusService transactionStatusService;
    private final TransactionCreationService transactionCreationService;
    private final TransactionSuccessService transactionSuccessService;

    /**
     * Creates and processes a transaction.
     *
     * IMPORTANT:
     * This method intentionally does NOT have @Transactional.
     *
     * Workflow:
     *
     * 1. Validate request
     * 2. Authenticate user
     * 3. Check idempotency
     * 4. Get user's account
     * 5. Validate account ownership
     * 6. Create PENDING transaction in its own transaction
     * 7. Call Account Service
     * 8. Mark SUCCESS + create Outbox event atomically
     * 9. On failure, mark FAILED in a separate transaction
     * 10. Return final transaction
     */
    public TransactionResponse createTransaction(
            CreateTransactionRequest request
    ) {

        // ---------------------------------------------------------
        // STEP 1: Validate request
        // ---------------------------------------------------------

        validateTransaction(request);


        // ---------------------------------------------------------
        // STEP 2: Get authenticated user
        // ---------------------------------------------------------

        Long userId = getAuthenticatedUserId();

        log.info(
                "Transaction request received. userId={}, transactionType={}",
                userId,
                request.transactionType()
        );


        // ---------------------------------------------------------
        // STEP 3: Idempotency check
        // ---------------------------------------------------------

        Transaction existingTransaction =
                transactionRepository
                        .findByIdempotencyKey(
                                request.idempotencyKey()
                        )
                        .orElse(null);

        if (existingTransaction != null) {

            /*
             * An idempotency key belongs to the user who created
             * the transaction.
             *
             * Another user must not be able to reuse the same key.
             */

            if (!existingTransaction.getUserId().equals(userId)) {

                throw new InvalidTransactionException(
                        "Idempotency key cannot be reused by another user"
                );
            }

            log.info(
                    "Existing transaction found for idempotency key. " +
                            "userId={}, transactionId={}, status={}",
                    userId,
                    existingTransaction.getId(),
                    existingTransaction.getStatus()
            );

            return mapToResponse(existingTransaction);
        }


        // ---------------------------------------------------------
        // STEP 4: Get account belonging to authenticated user
        // ---------------------------------------------------------

        AccountDetailsResponse userAccount =
                accountClient.getAccountByUserId(userId);


        // ---------------------------------------------------------
        // STEP 5: Validate account
        // ---------------------------------------------------------

        if (userAccount == null
                || userAccount.id() == null) {

            throw new InvalidTransactionException(
                    "Authenticated user does not have a valid account"
            );
        }

        if (userAccount.status() == null
                || !"ACTIVE".equals(userAccount.status().name())) {

            throw new InvalidTransactionException(
                    "User account is not active"
            );
        }

        Long ownedAccountId = userAccount.id();


        // ---------------------------------------------------------
        // STEP 6: Validate account ownership
        // ---------------------------------------------------------

        validateAccountOwnership(
                request,
                ownedAccountId
        );


        // ---------------------------------------------------------
        // STEP 7: Build PENDING transaction
        // ---------------------------------------------------------

        Transaction transaction =
                Transaction.builder()
                        /*
                         * IMPORTANT:
                         * userId comes from the authenticated JWT.
                         *
                         * It must NEVER come from the request body.
                         */
                        .userId(userId)
                        .senderAccountId(
                                request.senderAccountId()
                        )
                        .receiverAccountId(
                                request.receiverAccountId()
                        )
                        .amount(request.amount())
                        .transactionType(
                                request.transactionType()
                        )
                        .status(TransactionStatus.PENDING)
                        .idempotencyKey(
                                request.idempotencyKey()
                        )
                        .build();


        // ---------------------------------------------------------
        // STEP 8: Persist PENDING transaction
        // ---------------------------------------------------------

        Long transactionId;

        try {

            transactionId =
                    transactionCreationService
                            .createPendingTransaction(transaction);

            log.info(
                    "Transaction created with PENDING status. " +
                            "userId={}, transactionId={}, transactionType={}",
                    userId,
                    transactionId,
                    request.transactionType()
            );

        } catch (DataIntegrityViolationException exception) {

            /*
             * Two requests may arrive simultaneously with the
             * same idempotency key.
             *
             * The database UNIQUE constraint is the final
             * protection against duplicate transactions.
             */

            Transaction concurrentTransaction =
                    transactionRepository
                            .findByIdempotencyKey(
                                    request.idempotencyKey()
                            )
                            .orElseThrow(() ->
                                    new InvalidTransactionException(
                                            "Transaction could not be created"
                                    )
                            );

            /*
             * Even in the concurrent case, make sure the
             * transaction belongs to the authenticated user.
             */

            if (!concurrentTransaction
                    .getUserId()
                    .equals(userId)) {

                throw new InvalidTransactionException(
                        "Idempotency key cannot be reused by another user"
                );
            }

            log.info(
                    "Concurrent transaction detected through idempotency constraint. " +
                            "userId={}, transactionId={}, status={}",
                    userId,
                    concurrentTransaction.getId(),
                    concurrentTransaction.getStatus()
            );

            return mapToResponse(
                    concurrentTransaction
            );
        }


        // ---------------------------------------------------------
        // STEP 9: Call Account Service
        // ---------------------------------------------------------

        log.info(
                "Calling Account Service. " +
                        "userId={}, transactionId={}, operationId=TXN-{}",
                userId,
                transactionId,
                transactionId
        );

        try {

            switch (request.transactionType()) {

                case TRANSFER -> accountClient.transfer(
                        new AccountTransferRequest(
                                ownedAccountId,
                                request.receiverAccountId(),
                                request.amount(),
                                "TXN-" + transactionId
                        )
                );

                case DEPOSIT -> accountClient.deposit(
                        new AccountBalanceRequest(
                                ownedAccountId,
                                request.amount(),
                                "TXN-" + transactionId
                        )
                );

                case WITHDRAWAL -> accountClient.withdraw(
                        new AccountBalanceRequest(
                                ownedAccountId,
                                request.amount(),
                                "TXN-" + transactionId
                        )
                );
            }

            log.info(
                    "Account Service operation completed successfully. " +
                            "userId={}, transactionId={}, operationId=TXN-{}",
                    userId,
                    transactionId,
                    transactionId
            );

        } catch (RuntimeException exception) {

            log.error(
                    "Account Service operation failed. " +
                            "userId={}, transactionId={}, operationId=TXN-{}, error={}",
                    userId,
                    transactionId,
                    transactionId,
                    exception.getMessage(),
                    exception
            );

            /*
             * Account operation failed.
             *
             * Persist FAILED independently so the transaction
             * status is not lost because of the original exception.
             */

            transactionStatusService.markFailed(
                    transactionId,
                    exception.getMessage()
            );

            throw exception;
        }


        // ---------------------------------------------------------
        // STEP 10: Mark SUCCESS + create Outbox event
        // ---------------------------------------------------------

        TransactionEvent transactionEvent =
                new TransactionEvent(
                        UUID.randomUUID(),
                        transactionId,
                        transaction.getUserId(),
                        resolveReceiverUserId(
                                transaction,
                                userId,
                                transactionId
                        ),
                        transaction.getSenderAccountId(),
                        transaction.getReceiverAccountId(),
                        transaction.getAmount(),
                        transaction.getTransactionType(),
                        TransactionStatus.SUCCESS.name(),
                        LocalDateTime.now()
                );

        log.info(
                "Transaction event created for outbox. " +
                        "userId={}, transactionId={}, eventId={}, status={}",
                userId,
                transactionId,
                transactionEvent.eventId(),
                transactionEvent.status()
        );

        transactionSuccessService.markSuccessAndCreateOutbox(
                transactionId,
                transactionEvent
        );

        log.info(
                "Transaction marked SUCCESS and outbox event created. " +
                        "userId={}, transactionId={}, eventId={}",
                userId,
                transactionId,
                transactionEvent.eventId()
        );


        // ---------------------------------------------------------
        // STEP 11: Read final transaction
        // ---------------------------------------------------------

        log.info(
                "Transaction processing completed. " +
                        "userId={}, transactionId={}, status=SUCCESS",
                userId,
                transactionId
        );

        return getTransactionById(transactionId);
    }


    /**
     * Retrieves a transaction by ID.
     *
     * IMPORTANT:
     * Transaction ownership is checked using transaction.userId.
     *
     * A user cannot retrieve another user's transaction even if
     * they know the transaction ID.
     */
    @Transactional(readOnly = true)
    public TransactionResponse getTransactionById(
            Long transactionId
    ) {

        // ---------------------------------------------------------
        // STEP 1: Validate transaction ID
        // ---------------------------------------------------------

        if (transactionId == null
                || transactionId <= 0) {

            throw new InvalidTransactionException(
                    "Transaction ID must be greater than 0"
            );
        }


        // ---------------------------------------------------------
        // STEP 2: Get authenticated user
        // ---------------------------------------------------------

        Long userId = getAuthenticatedUserId();


        // ---------------------------------------------------------
        // STEP 3: Find transaction owned by authenticated user
        // ---------------------------------------------------------

        Transaction transaction =
                transactionRepository
                        .findByIdAndUserId(
                                transactionId,
                                userId
                        )
                        .orElseThrow(() ->
                                new TransactionNotFoundException(
                                        "Transaction with ID "
                                                + transactionId
                                                + " was not found"
                                )
                        );


        // ---------------------------------------------------------
        // STEP 4: Return response
        // ---------------------------------------------------------

        return mapToResponse(transaction);
    }


    /**
     * Validates transaction rules based on transaction type.
     */
    private void validateTransaction(
            CreateTransactionRequest request
    ) {

        if (request == null) {

            throw new InvalidTransactionException(
                    "Transaction request is required"
            );
        }


        // ---------------------------------------------------------
        // Common validation
        // ---------------------------------------------------------

        if (request.transactionType() == null) {

            throw new InvalidTransactionException(
                    "Transaction type is required"
            );
        }

        if (request.amount() == null
                || request.amount().signum() <= 0) {

            throw new InvalidTransactionException(
                    "Transaction amount must be greater than zero"
            );
        }

        if (request.idempotencyKey() == null
                || request.idempotencyKey().isBlank()) {

            throw new InvalidTransactionException(
                    "Idempotency key is required"
            );
        }


        // ---------------------------------------------------------
        // Type-specific validation
        // ---------------------------------------------------------

        switch (request.transactionType()) {

            case TRANSFER -> {

                if (request.senderAccountId() == null
                        || request.receiverAccountId() == null) {

                    throw new InvalidTransactionException(
                            "Sender and receiver account IDs are required for transfer"
                    );
                }

                if (request.senderAccountId()
                        .equals(request.receiverAccountId())) {

                    throw new InvalidTransactionException(
                            "Sender and receiver accounts must be different"
                    );
                }
            }


            case DEPOSIT -> {

                if (request.receiverAccountId() == null) {

                    throw new InvalidTransactionException(
                            "Receiver account ID is required for deposit"
                    );
                }

                if (request.senderAccountId() != null) {

                    throw new InvalidTransactionException(
                            "Sender account ID must be null for deposit"
                    );
                }
            }


            case WITHDRAWAL -> {

                if (request.senderAccountId() == null) {

                    throw new InvalidTransactionException(
                            "Sender account ID is required for withdrawal"
                    );
                }

                if (request.receiverAccountId() != null) {

                    throw new InvalidTransactionException(
                            "Receiver account ID must be null for withdrawal"
                    );
                }
            }
        }
    }


    /**
     * Ensures the authenticated user can only operate on
     * their own account.
     */
    private void validateAccountOwnership(
            CreateTransactionRequest request,
            Long ownedAccountId
    ) {

        switch (request.transactionType()) {

            case TRANSFER -> {

                if (!ownedAccountId.equals(
                        request.senderAccountId()
                )) {

                    throw new InvalidTransactionException(
                            "Sender account does not belong to authenticated user"
                    );
                }
            }


            case DEPOSIT -> {

                if (!ownedAccountId.equals(
                        request.receiverAccountId()
                )) {

                    throw new InvalidTransactionException(
                            "Receiver account does not belong to authenticated user"
                    );
                }
            }


            case WITHDRAWAL -> {

                if (!ownedAccountId.equals(
                        request.senderAccountId()
                )) {

                    throw new InvalidTransactionException(
                            "Sender account does not belong to authenticated user"
                    );
                }
            }
        }
    }


    /**
     * Finds the user on the receiving end of a transfer, so that the
     * notification pipeline can inform them as well as the sender.
     *
     * Returns null when there is no second party: deposits and withdrawals
     * only touch the caller's own account, and a transfer between two accounts
     * of the same user needs a single notification.
     *
     * The money has already moved by the time this runs, so a lookup failure
     * must never fail the transaction. It costs the counterparty their
     * notification and nothing else, which is why the exception is swallowed
     * after logging.
     */
    private Long resolveReceiverUserId(
            Transaction transaction,
            Long senderUserId,
            Long transactionId
    ) {

        if (transaction.getTransactionType() != TransactionType.TRANSFER
                || transaction.getReceiverAccountId() == null) {

            return null;
        }

        try {

            AccountDetailsResponse receiverAccount =
                    accountClient.getAccountById(
                            transaction.getReceiverAccountId()
                    );

            if (receiverAccount == null
                    || receiverAccount.userId() == null
                    || receiverAccount.userId().equals(senderUserId)) {

                return null;
            }

            return receiverAccount.userId();

        } catch (RuntimeException exception) {

            log.warn(
                    "Could not resolve the receiving account's owner. " +
                            "Only the sender will be notified. " +
                            "transactionId={}, receiverAccountId={}, error={}",
                    transactionId,
                    transaction.getReceiverAccountId(),
                    exception.getMessage()
            );

            return null;
        }
    }


    /**
     * Gets the userId stored by JwtFilter.
     */
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


    /**
     * Converts entity to response DTO.
     */
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