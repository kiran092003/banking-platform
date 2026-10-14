package banking_platform.transaction_service.controller;

import banking_platform.transaction_service.dto.CreateTransactionRequest;
import banking_platform.transaction_service.dto.TransactionHistoryResponse;
import banking_platform.transaction_service.dto.TransactionResponse;
import banking_platform.transaction_service.entity.TransactionStatus;
import banking_platform.transaction_service.entity.TransactionType;
import banking_platform.transaction_service.service.TransactionHistoryService;
import banking_platform.transaction_service.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/transactions")
@RequiredArgsConstructor
@Tag(
        name = "Transactions",
        description = "Transaction creation, lookup and transaction history APIs"
)
@SecurityRequirement(name = "bearerAuth")
public class TransactionController {

    private final TransactionService transactionService;
    private final TransactionHistoryService transactionHistoryService;


    // =========================================================
    // CREATE TRANSACTION
    // =========================================================

    @Operation(
            summary = "Create a transaction",
            description = "Creates a new transfer, deposit or withdrawal transaction."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "Transaction created successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid transaction request"
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Authentication required"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "Access denied"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Account not found"
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "Duplicate idempotency key"
            ),
            @ApiResponse(
                    responseCode = "422",
                    description = "Transaction cannot be processed"
            ),
            @ApiResponse(
                    responseCode = "503",
                    description = "Account Service unavailable"
            )
    })
    @PostMapping
    public ResponseEntity<TransactionResponse> createTransaction(
            @Valid @RequestBody CreateTransactionRequest request
    ) {

        TransactionResponse response =
                transactionService.createTransaction(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }


    // =========================================================
    // GET TRANSACTION BY ID
    // =========================================================

    @Operation(
            summary = "Get transaction by ID",
            description = "Retrieves a transaction using its transaction ID."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Transaction retrieved successfully"
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Authentication required"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "Access denied"
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Transaction not found"
            )
    })
    @GetMapping("/{transactionId}")
    public ResponseEntity<TransactionResponse> getTransactionById(
            @PathVariable Long transactionId
    ) {

        return ResponseEntity.ok(
                transactionService.getTransactionById(
                        transactionId
                )
        );
    }


    // =========================================================
    // GET TRANSACTION HISTORY
    // =========================================================

    @Operation(
            summary = "Get transaction history",
            description = "Retrieves paginated transaction history with optional status, transaction type, date range and sorting filters."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Transaction history retrieved successfully"
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid pagination, filtering or sorting parameters"
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Authentication required"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "Access denied"
            )
    })
    @GetMapping
    public ResponseEntity<TransactionHistoryResponse> getTransactionHistory(

            @RequestParam(
                    defaultValue = "0"
            )
            int page,

            @RequestParam(
                    defaultValue = "10"
            )
            int size,

            @RequestParam(
                    required = false
            )
            TransactionStatus status,

            @RequestParam(
                    required = false
            )
            TransactionType transactionType,

            @RequestParam(
                    required = false
            )
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE_TIME
            )
            LocalDateTime from,

            @RequestParam(
                    required = false
            )
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE_TIME
            )
            LocalDateTime to,

            @RequestParam(
                    required = false
            )
            BigDecimal minAmount,

            @RequestParam(
                    required = false
            )
            BigDecimal maxAmount,

            @RequestParam(
                    defaultValue = "createdAt"
            )
            String sortBy,

            @RequestParam(
                    defaultValue = "DESC"
            )
            String direction
    ) {

        TransactionHistoryResponse response =
                transactionHistoryService.getTransactionHistory(
                        page,
                        size,
                        status,
                        transactionType,
                        from,
                        to,
                        minAmount,
                        maxAmount,
                        sortBy,
                        direction
                );

        return ResponseEntity.ok(response);
    }
}