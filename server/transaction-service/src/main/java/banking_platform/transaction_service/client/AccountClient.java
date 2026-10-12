package banking_platform.transaction_service.client;

import banking_platform.transaction_service.dto.AccountBalanceRequest;
import banking_platform.transaction_service.dto.AccountDetailsResponse;
import banking_platform.transaction_service.dto.AccountTransferRequest;
import banking_platform.transaction_service.exception.AccountNotFoundException;
import banking_platform.transaction_service.exception.AccountServiceUnavailableException;
import banking_platform.transaction_service.exception.InsufficientBalanceException;
import banking_platform.transaction_service.exception.InvalidTransactionException;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import lombok.extern.slf4j.Slf4j;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.util.function.Supplier;

@Component
@RequiredArgsConstructor
@Slf4j
public class AccountClient {

    private final RestClient accountRestClient;

    @Value("${internal.service.key}")
    private String internalServiceKey;


    // =========================================================
    // TRANSFER
    // =========================================================

    @CircuitBreaker(name = "accountServiceCircuitBreaker")
    @Retry(name = "accountServiceRetry")
    public void transfer(AccountTransferRequest request) {

        log.info(
                "Calling Account Service transfer: operationId={}",
                request.operationId()
        );

        executeAccountRequest(() -> {

            accountRestClient
                    .post()
                    .uri("/accounts/internal/transfer")
                    .header(
                            "X-Internal-Service-Key",
                            internalServiceKey
                    )
                    .body(request)
                    .retrieve()

                    .onStatus(
                            status -> status.value() == 404,
                            (httpRequest, clientResponse) -> {
                                throw new AccountNotFoundException(
                                        "Sender or receiver account was not found"
                                );
                            }
                    )

                    .onStatus(
                            status -> status.value() == 422,
                            (httpRequest, clientResponse) -> {
                                throw new InsufficientBalanceException(
                                        "Insufficient account balance"
                                );
                            }
                    )

                    .onStatus(
                            status -> status.value() == 401
                                    || status.value() == 403,
                            (httpRequest, clientResponse) -> {
                                throw new InvalidTransactionException(
                                        "Transaction Service is not authorized"
                                );
                            }
                    )

                    .onStatus(
                            HttpStatusCode::is4xxClientError,
                            (httpRequest, clientResponse) -> {
                                throw new InvalidTransactionException(
                                        "Account transfer was rejected"
                                );
                            }
                    )

                    .onStatus(
                            HttpStatusCode::is5xxServerError,
                            (httpRequest, clientResponse) -> {
                                throw new AccountServiceUnavailableException(
                                        "Account Service returned a server error"
                                );
                            }
                    )

                    .toBodilessEntity();

            return null;
        });
    }


    // =========================================================
    // DEPOSIT
    // =========================================================

    @Retry(name = "accountServiceRetry")
    public void deposit(AccountBalanceRequest request) {

        log.info(
                "Calling Account Service deposit: operationId={}",
                request.operationId()
        );

        executeAccountRequest(() -> {

            accountRestClient
                    .post()
                    .uri("/accounts/internal/deposit")
                    .header(
                            "X-Internal-Service-Key",
                            internalServiceKey
                    )
                    .body(request)
                    .retrieve()

                    .onStatus(
                            status -> status.value() == 404,
                            (httpRequest, clientResponse) -> {
                                throw new AccountNotFoundException(
                                        "Account was not found"
                                );
                            }
                    )

                    .onStatus(
                            status -> status.value() == 401
                                    || status.value() == 403,
                            (httpRequest, clientResponse) -> {
                                throw new InvalidTransactionException(
                                        "Transaction Service is not authorized"
                                );
                            }
                    )

                    .onStatus(
                            HttpStatusCode::is4xxClientError,
                            (httpRequest, clientResponse) -> {
                                throw new InvalidTransactionException(
                                        "Account deposit was rejected"
                                );
                            }
                    )

                    .onStatus(
                            HttpStatusCode::is5xxServerError,
                            (httpRequest, clientResponse) -> {
                                throw new AccountServiceUnavailableException(
                                        "Account Service returned a server error"
                                );
                            }
                    )

                    .toBodilessEntity();

            return null;
        });
    }


    // =========================================================
    // WITHDRAWAL
    // =========================================================

    @Retry(name = "accountServiceRetry")
    public void withdraw(AccountBalanceRequest request) {

        log.info(
                "Calling Account Service withdrawal: operationId={}",
                request.operationId()
        );

        executeAccountRequest(() -> {

            accountRestClient
                    .post()
                    .uri("/accounts/internal/withdraw")
                    .header(
                            "X-Internal-Service-Key",
                            internalServiceKey
                    )
                    .body(request)
                    .retrieve()

                    .onStatus(
                            status -> status.value() == 404,
                            (httpRequest, clientResponse) -> {
                                throw new AccountNotFoundException(
                                        "Account was not found"
                                );
                            }
                    )

                    .onStatus(
                            status -> status.value() == 422,
                            (httpRequest, clientResponse) -> {
                                throw new InsufficientBalanceException(
                                        "Insufficient account balance"
                                );
                            }
                    )

                    .onStatus(
                            status -> status.value() == 401
                                    || status.value() == 403,
                            (httpRequest, clientResponse) -> {
                                throw new InvalidTransactionException(
                                        "Transaction Service is not authorized"
                                );
                            }
                    )

                    .onStatus(
                            HttpStatusCode::is4xxClientError,
                            (httpRequest, clientResponse) -> {
                                throw new InvalidTransactionException(
                                        "Account withdrawal was rejected"
                                );
                            }
                    )

                    .onStatus(
                            HttpStatusCode::is5xxServerError,
                            (httpRequest, clientResponse) -> {
                                throw new AccountServiceUnavailableException(
                                        "Account Service returned a server error"
                                );
                            }
                    )

                    .toBodilessEntity();

            return null;
        });
    }


    // =========================================================
    // GET ACCOUNT BY USER ID
    // =========================================================
    @Retry(name = "accountLookupRetry")
    public AccountDetailsResponse getAccountByUserId(Long userId) {

        return executeAccountRequest(() ->
                accountRestClient
                        .get()
                        .uri(
                                "/accounts/internal/user/{userId}",
                                userId
                        )
                        .header(
                                "X-Internal-Service-Key",
                                internalServiceKey
                        )
                        .retrieve()

                        .onStatus(
                                status -> status.value() == 404,
                                (httpRequest, clientResponse) -> {
                                    throw new AccountNotFoundException(
                                            "Account not found for user ID: "
                                                    + userId
                                    );
                                }
                        )

                        .onStatus(
                                status -> status.value() == 401
                                        || status.value() == 403,
                                (httpRequest, clientResponse) -> {
                                    throw new InvalidTransactionException(
                                            "Transaction Service is not authorized"
                                    );
                                }
                        )

                        .onStatus(
                                HttpStatusCode::is4xxClientError,
                                (httpRequest, clientResponse) -> {
                                    throw new InvalidTransactionException(
                                            "Account lookup was rejected"
                                    );
                                }
                        )

                        .onStatus(
                                HttpStatusCode::is5xxServerError,
                                (httpRequest, clientResponse) -> {
                                    throw new AccountServiceUnavailableException(
                                            "Account Service returned a server error"
                                    );
                                }
                        )

                        .body(AccountDetailsResponse.class)
        );
    }


    // =========================================================
    // COMMON ACCOUNT REQUEST EXECUTOR
    // =========================================================

    private <T> T executeAccountRequest(
            Supplier<T> request
    ) {
        try {
            return request.get();

        } catch (ResourceAccessException exception) {

            log.error(
                    "Account Service call failed due to connection/timeout. Cause={}",
                    exception.getMessage()
            );

            throw new AccountServiceUnavailableException(
                    "Account Service is unavailable or timed out",
                    exception
            );

        } catch (AccountServiceUnavailableException exception) {

            log.error(
                    "Account Service returned 5xx. Retry should be triggered. Cause={}",
                    exception.getMessage()
            );

            throw exception;
        }
    }
}