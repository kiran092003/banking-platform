package banking_platform.AccountService.service;

import banking_platform.AccountService.dto.*;
import banking_platform.AccountService.entity.Account;
import banking_platform.AccountService.entity.AccountOperation;
import banking_platform.AccountService.entity.AccountStatus;
import banking_platform.AccountService.exception.AccountNotFoundException;
import banking_platform.AccountService.exception.DuplicateAccountException;
import banking_platform.AccountService.exception.InsufficientBalanceException;
import banking_platform.AccountService.exception.InvalidAccountStateException;
import banking_platform.AccountService.metrics.AccountBusinessMetrics;
import banking_platform.AccountService.repository.AccountOperationRepository;
import banking_platform.AccountService.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountService {

    private final AccountRepository accountRepository;
    private final AccountOperationRepository accountOperationRepository;
    private final AccountBusinessMetrics accountBusinessMetrics;

    // =========================================================
    // CREATE ACCOUNT
    // =========================================================

    @Transactional
    public AccountResponseDTO createAccount(AccountRequestDTO request) {

        Long userId = request.getUserId();

        log.info(
                "Account creation request received. userId={}",
                userId
        );

        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("Invalid user ID");
        }

        if (accountRepository.existsByUserId(userId)) {

            log.warn(
                    "Account creation rejected because user already has an account. " +
                            "userId={}",
                    userId
            );

            throw new DuplicateAccountException(
                    "User already has an account"
            );
        }

        String accountNumber = generateAccountNumber();

        Account account = Account.builder()
                .accountNumber(accountNumber)
                .userId(userId)
                .accountType(request.getAccountType())
                .balance(BigDecimal.ZERO)
                .status(AccountStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();

        try {

            Account savedAccount =
                    accountRepository.save(account);

            log.info(
                    "Account created successfully. userId={}, accountId={}, status={}",
                    userId,
                    savedAccount.getId(),
                    savedAccount.getStatus()
            );

            return mapToResponse(savedAccount);

        } catch (DataIntegrityViolationException ex) {

            log.error(
                    "Account creation failed due to database constraint violation. " +
                            "userId={}, error={}",
                    userId,
                    ex.getMessage(),
                    ex
            );

            throw new DuplicateAccountException(
                    "Account number already exists"
            );
        }
    }

    // =========================================================
    // GET ACCOUNT BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public AccountResponseDTO getAccountById(Long id) {

        log.info(
                "Account lookup requested. accountId={}",
                id
        );

        Account account =
                accountRepository.findById(id)
                        .orElseThrow(() ->
                                new AccountNotFoundException(
                                        "Account not found with id: " + id
                                )
                        );

        return mapToResponse(account);
    }

    // =========================================================
    // GET ACCOUNT BY ACCOUNT NUMBER
    // =========================================================

    @Transactional(readOnly = true)
    public AccountResponseDTO getAccountByNumber(
            String accountNumber
    ) {

        log.info(
                "Account lookup requested by account number."
        );

        Account account =
                accountRepository
                        .findByAccountNumber(accountNumber)
                        .orElseThrow(() ->
                                new AccountNotFoundException(
                                        "Account not found with account number: "
                                                + accountNumber
                                )
                        );

        return mapToResponse(account);
    }

    // =========================================================
    // GET ACCOUNT BY USER ID
    // =========================================================

    @Transactional(readOnly = true)
    public AccountResponseDTO getAccountByUserId(Long userId) {

        log.info(
                "Account lookup requested by userId. userId={}",
                userId
        );

        Account account =
                accountRepository
                        .findByUserId(userId)
                        .orElseThrow(() ->
                                new AccountNotFoundException(
                                        "Account not found for user id: "
                                                + userId
                                )
                        );

        return mapToResponse(account);
    }

    // =========================================================
    // GET ALL ACCOUNTS
    // =========================================================

    @Transactional(readOnly = true)
    public List<AccountResponseDTO> getAllAccounts() {

        log.info(
                "Request received to retrieve all accounts."
        );

        List<AccountResponseDTO> accounts =
                accountRepository.findAll()
                        .stream()
                        .map(this::mapToResponse)
                        .toList();

        log.info(
                "All accounts retrieved successfully. count={}",
                accounts.size()
        );

        return accounts;
    }

    // =========================================================
    // UPDATE ACCOUNT
    // =========================================================

    @Transactional
    public AccountResponseDTO updateAccount(
            Long id,
            AccountUpdateRequestDTO request
    ) {

        log.info(
                "Account update request received. accountId={}",
                id
        );

        Account account =
                accountRepository.findById(id)
                        .orElseThrow(() ->
                                new AccountNotFoundException(
                                        "Account not found with id: " + id
                                )
                        );

        if (account.getStatus() == AccountStatus.CLOSED) {

            log.warn(
                    "Account update rejected because account is CLOSED. " +
                            "accountId={}",
                    id
            );

            throw new IllegalStateException(
                    "Closed account cannot be updated"
            );
        }

        if (account.getStatus() == AccountStatus.BLOCKED) {

            log.warn(
                    "Account update rejected because account is BLOCKED. " +
                            "accountId={}",
                    id
            );

            throw new IllegalStateException(
                    "Blocked account cannot be updated"
            );
        }

        account.setAccountType(
                request.getAccountType()
        );

        Account updatedAccount =
                accountRepository.save(account);

        log.info(
                "Account updated successfully. accountId={}, status={}",
                id,
                updatedAccount.getStatus()
        );

        return mapToResponse(updatedAccount);
    }

    // =========================================================
    // CLOSE ACCOUNT
    // =========================================================

    @Transactional
    public void deleteAccount(Long id) {

        log.info(
                "Account closure request received. accountId={}",
                id
        );

        Account account =
                accountRepository.findById(id)
                        .orElseThrow(() ->
                                new AccountNotFoundException(
                                        "Account not found with id: " + id
                                )
                        );

        if (account.getStatus() == AccountStatus.CLOSED) {

            log.warn(
                    "Account closure rejected because account is already CLOSED. " +
                            "accountId={}",
                    id
            );

            throw new IllegalStateException(
                    "Account is already closed"
            );
        }

        account.setStatus(
                AccountStatus.CLOSED
        );

        accountRepository.save(account);

        log.info(
                "Account closed successfully. accountId={}, status={}",
                id,
                account.getStatus()
        );
    }

    // =========================================================
    // TRANSFER
    // =========================================================

    @Transactional
    public void transfer(
            AccountTransferRequestDTO request
    ) {

        log.info(
                "Account transfer operation received. " +
                        "senderAccountId={}, receiverAccountId={}, operationId={}",
                request.senderAccountId(),
                request.receiverAccountId(),
                request.operationId()
        );

        try {

            // -------------------------------------------------
            // IDEMPOTENCY CHECK
            // -------------------------------------------------

            if (accountOperationRepository
                    .existsByOperationId(
                            request.operationId()
                    )) {

                log.info(
                        "Duplicate account transfer operation ignored. " +
                                "operationId={}",
                        request.operationId()
                );

                return;
            }

            // -------------------------------------------------
            // SAME ACCOUNT VALIDATION
            // -------------------------------------------------

            if (request.senderAccountId()
                    .equals(request.receiverAccountId())) {

                log.warn(
                        "Account transfer rejected because sender and receiver " +
                                "are identical. accountId={}, operationId={}",
                        request.senderAccountId(),
                        request.operationId()
                );

                throw new InvalidAccountStateException(
                        "Sender and receiver accounts must be different"
                );
            }

            // -------------------------------------------------
            // LOCK ACCOUNTS IN CONSISTENT ORDER
            // Prevents deadlocks during concurrent transfers
            // -------------------------------------------------

            Long firstAccountId =
                    Math.min(
                            request.senderAccountId(),
                            request.receiverAccountId()
                    );

            Long secondAccountId =
                    Math.max(
                            request.senderAccountId(),
                            request.receiverAccountId()
                    );

            Account firstAccount =
                    accountRepository
                            .findByIdForUpdate(firstAccountId)
                            .orElseThrow(() ->
                                    new AccountNotFoundException(
                                            "Account not found with id: "
                                                    + firstAccountId
                                    )
                            );

            Account secondAccount =
                    accountRepository
                            .findByIdForUpdate(secondAccountId)
                            .orElseThrow(() ->
                                    new AccountNotFoundException(
                                            "Account not found with id: "
                                                    + secondAccountId
                                    )
                            );

            Account sender =
                    firstAccount.getId()
                            .equals(request.senderAccountId())
                            ? firstAccount
                            : secondAccount;

            Account receiver =
                    firstAccount.getId()
                            .equals(request.receiverAccountId())
                            ? firstAccount
                            : secondAccount;

            // -------------------------------------------------
            // SENDER STATUS
            // -------------------------------------------------

            if (sender.getStatus()
                    != AccountStatus.ACTIVE) {

                log.warn(
                        "Transfer rejected because sender account is not active. " +
                                "senderAccountId={}, status={}, operationId={}",
                        sender.getId(),
                        sender.getStatus(),
                        request.operationId()
                );

                throw new InvalidAccountStateException(
                        "Sender account is not active"
                );
            }

            // -------------------------------------------------
            // RECEIVER STATUS
            // -------------------------------------------------

            if (receiver.getStatus()
                    != AccountStatus.ACTIVE) {

                log.warn(
                        "Transfer rejected because receiver account is not active. " +
                                "receiverAccountId={}, status={}, operationId={}",
                        receiver.getId(),
                        receiver.getStatus(),
                        request.operationId()
                );

                throw new InvalidAccountStateException(
                        "Receiver account is not active"
                );
            }

            // -------------------------------------------------
            // BALANCE VALIDATION
            // -------------------------------------------------

            if (sender.getBalance()
                    .compareTo(request.amount()) < 0) {

                log.warn(
                        "Transfer rejected due to insufficient balance. " +
                                "senderAccountId={}, operationId={}",
                        sender.getId(),
                        request.operationId()
                );

                throw new InsufficientBalanceException(
                        "Insufficient balance"
                );
            }

            // -------------------------------------------------
            // UPDATE BALANCES
            // -------------------------------------------------

            sender.setBalance(
                    sender.getBalance()
                            .subtract(request.amount())
            );

            receiver.setBalance(
                    receiver.getBalance()
                            .add(request.amount())
            );

            accountRepository.save(sender);
            accountRepository.save(receiver);

            // -------------------------------------------------
            // SAVE IDEMPOTENCY RECORD
            // -------------------------------------------------

            AccountOperation operation =
                    AccountOperation.builder()
                            .operationId(
                                    request.operationId()
                            )
                            .operationType("TRANSFER")
                            .createdAt(
                                    LocalDateTime.now()
                            )
                            .build();

            accountOperationRepository.save(operation);

            // -------------------------------------------------
            // BUSINESS METRIC
            // -------------------------------------------------

            accountBusinessMetrics.recordTransferSuccess();

            log.info(
                    "Account transfer completed successfully. " +
                            "senderAccountId={}, receiverAccountId={}, operationId={}",
                    sender.getId(),
                    receiver.getId(),
                    request.operationId()
            );

        } catch (RuntimeException exception) {

            accountBusinessMetrics.recordTransferFailure();

            throw exception;
        }
    }

    // =========================================================
    // DEPOSIT
    // =========================================================

    @Transactional
    public void deposit(
            AccountDepositRequestDTO request
    ) {

        log.info(
                "Account deposit operation received. " +
                        "accountId={}, operationId={}",
                request.accountId(),
                request.operationId()
        );

        try {

            // -------------------------------------------------
            // IDEMPOTENCY CHECK
            // -------------------------------------------------

            if (accountOperationRepository
                    .existsByOperationId(
                            request.operationId()
                    )) {

                log.info(
                        "Duplicate account deposit operation ignored. " +
                                "operationId={}",
                        request.operationId()
                );

                return;
            }

            // -------------------------------------------------
            // LOCK ACCOUNT
            // -------------------------------------------------

            Account account =
                    accountRepository
                            .findByIdForUpdate(
                                    request.accountId()
                            )
                            .orElseThrow(() ->
                                    new AccountNotFoundException(
                                            "Account not found with id: "
                                                    + request.accountId()
                                    )
                            );

            // -------------------------------------------------
            // ACCOUNT STATUS
            // -------------------------------------------------

            if (account.getStatus()
                    != AccountStatus.ACTIVE) {

                log.warn(
                        "Deposit rejected because account is not active. " +
                                "accountId={}, status={}, operationId={}",
                        account.getId(),
                        account.getStatus(),
                        request.operationId()
                );

                throw new InvalidAccountStateException(
                        "Account is not active"
                );
            }

            // -------------------------------------------------
            // UPDATE BALANCE
            // -------------------------------------------------

            account.setBalance(
                    account.getBalance()
                            .add(request.amount())
            );

            accountRepository.save(account);

            // -------------------------------------------------
            // SAVE IDEMPOTENCY RECORD
            // -------------------------------------------------

            AccountOperation operation =
                    AccountOperation.builder()
                            .operationId(
                                    request.operationId()
                            )
                            .operationType("DEPOSIT")
                            .createdAt(
                                    LocalDateTime.now()
                            )
                            .build();

            accountOperationRepository.save(operation);

            // -------------------------------------------------
            // BUSINESS METRIC
            // -------------------------------------------------

            accountBusinessMetrics.recordDepositSuccess();

            log.info(
                    "Account deposit completed successfully. " +
                            "accountId={}, operationId={}",
                    account.getId(),
                    request.operationId()
            );

        } catch (RuntimeException exception) {

            accountBusinessMetrics.recordDepositFailure();

            throw exception;
        }
    }

    // =========================================================
    // WITHDRAWAL
    // =========================================================

    @Transactional
    public void withdraw(
            AccountWithdrawRequestDTO request
    ) {

        log.info(
                "Account withdrawal operation received. " +
                        "accountId={}, operationId={}",
                request.accountId(),
                request.operationId()
        );

        try {

            // -------------------------------------------------
            // IDEMPOTENCY CHECK
            // -------------------------------------------------

            if (accountOperationRepository
                    .existsByOperationId(
                            request.operationId()
                    )) {

                log.info(
                        "Duplicate account withdrawal operation ignored. " +
                                "operationId={}",
                        request.operationId()
                );

                return;
            }

            // -------------------------------------------------
            // LOCK ACCOUNT
            // -------------------------------------------------

            Account account =
                    accountRepository
                            .findByIdForUpdate(
                                    request.accountId()
                            )
                            .orElseThrow(() ->
                                    new AccountNotFoundException(
                                            "Account not found with id: "
                                                    + request.accountId()
                                    )
                            );

            // -------------------------------------------------
            // ACCOUNT STATUS
            // -------------------------------------------------

            if (account.getStatus()
                    != AccountStatus.ACTIVE) {

                log.warn(
                        "Withdrawal rejected because account is not active. " +
                                "accountId={}, status={}, operationId={}",
                        account.getId(),
                        account.getStatus(),
                        request.operationId()
                );

                throw new InvalidAccountStateException(
                        "Account is not active"
                );
            }

            // -------------------------------------------------
            // BALANCE VALIDATION
            // -------------------------------------------------

            if (account.getBalance()
                    .compareTo(request.amount()) < 0) {

                log.warn(
                        "Withdrawal rejected due to insufficient balance. " +
                                "accountId={}, operationId={}",
                        account.getId(),
                        request.operationId()
                );

                throw new InsufficientBalanceException(
                        "Insufficient balance"
                );
            }

            // -------------------------------------------------
            // UPDATE BALANCE
            // -------------------------------------------------

            account.setBalance(
                    account.getBalance()
                            .subtract(request.amount())
            );

            accountRepository.save(account);

            // -------------------------------------------------
            // SAVE IDEMPOTENCY RECORD
            // -------------------------------------------------

            AccountOperation operation =
                    AccountOperation.builder()
                            .operationId(
                                    request.operationId()
                            )
                            .operationType("WITHDRAWAL")
                            .createdAt(
                                    LocalDateTime.now()
                            )
                            .build();

            accountOperationRepository.save(operation);

            // -------------------------------------------------
            // BUSINESS METRIC
            // -------------------------------------------------

            accountBusinessMetrics.recordWithdrawalSuccess();

            log.info(
                    "Account withdrawal completed successfully. " +
                            "accountId={}, operationId={}",
                    account.getId(),
                    request.operationId()
            );

        } catch (RuntimeException exception) {

            accountBusinessMetrics.recordWithdrawalFailure();

            throw exception;
        }
    }

    // =========================================================
    // ACCOUNT NUMBER GENERATION
    // =========================================================

    private String generateAccountNumber() {

        String accountNumber;

        do {

            long number =
                    ThreadLocalRandom.current()
                            .nextLong(
                                    100000000000L,
                                    1000000000000L
                            );

            accountNumber =
                    String.valueOf(number);

        } while (
                accountRepository
                        .existsByAccountNumber(
                                accountNumber
                        )
        );

        return accountNumber;
    }

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    private AccountResponseDTO mapToResponse(
            Account account
    ) {

        return AccountResponseDTO.builder()
                .id(account.getId())
                .accountNumber(account.getAccountNumber())
                .userId(account.getUserId())
                .accountType(account.getAccountType())
                .balance(account.getBalance())
                .status(account.getStatus())
                .createdAt(account.getCreatedAt())
                .build();
    }
}