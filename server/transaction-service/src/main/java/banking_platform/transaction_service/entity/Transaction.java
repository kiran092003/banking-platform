package banking_platform.transaction_service.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "transactions",
        indexes = {
                @Index(
                        name = "idx_transaction_user",
                        columnList = "user_id"
                ),
                @Index(
                        name = "idx_transaction_sender_account",
                        columnList = "sender_account_id"
                ),
                @Index(
                        name = "idx_transaction_receiver_account",
                        columnList = "receiver_account_id"
                ),
                @Index(
                        name = "idx_transaction_status",
                        columnList = "status"
                ),
                @Index(
                        name = "idx_transaction_created_at",
                        columnList = "created_at"
                ),
                @Index(
                        name = "uk_transaction_idempotency_key",
                        columnList = "idempotency_key",
                        unique = true
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    // ---------------------------------------------------------
    // Transaction owner
    // ---------------------------------------------------------

    @NotNull(message = "User ID is required")
    @Positive(message = "User ID must be greater than 0")
    @Column(
            name = "user_id",
            nullable = false
    )
    private Long userId;


    // ---------------------------------------------------------
    // Accounts
    // ---------------------------------------------------------

    @Positive(message = "Sender account ID must be greater than 0")
    @Column(name = "sender_account_id")
    private Long senderAccountId;

    @Positive(message = "Receiver account ID must be greater than 0")
    @Column(name = "receiver_account_id")
    private Long receiverAccountId;


    // ---------------------------------------------------------
    // Amount
    // ---------------------------------------------------------

    @NotNull(message = "Transaction amount is required")
    @DecimalMin(
            value = "0.01",
            message = "Transaction amount must be at least 0.01"
    )
    @Digits(
            integer = 17,
            fraction = 2,
            message = "Transaction amount can have maximum 17 integer digits and 2 decimal places"
    )
    @Column(
            name = "amount",
            nullable = false,
            precision = 19,
            scale = 2
    )
    private BigDecimal amount;


    // ---------------------------------------------------------
    // Transaction type
    // ---------------------------------------------------------

    @NotNull(message = "Transaction type is required")
    @Enumerated(EnumType.STRING)
    @Column(
            name = "transaction_type",
            nullable = false,
            length = 20
    )
    private TransactionType transactionType;


    // ---------------------------------------------------------
    // Transaction status
    // ---------------------------------------------------------

    @NotNull(message = "Transaction status is required")
    @Enumerated(EnumType.STRING)
    @Column(
            name = "status",
            nullable = false,
            length = 20
    )
    private TransactionStatus status;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;


    // ---------------------------------------------------------
    // Idempotency
    // ---------------------------------------------------------

    @NotBlank(message = "Idempotency key is required")
    @Size(
            min = 16,
            max = 100,
            message = "Idempotency key must be between 16 and 100 characters"
    )
    @Column(
            name = "idempotency_key",
            nullable = false,
            unique = true,
            length = 100
    )
    private String idempotencyKey;


    // ---------------------------------------------------------
    // Created time
    // ---------------------------------------------------------

    @NotNull(message = "Created date is required")
    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;


    // ---------------------------------------------------------
    // Entity lifecycle
    // ---------------------------------------------------------

    @PrePersist
    protected void onCreate() {

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }

        if (status == null) {
            status = TransactionStatus.PENDING;
        }
    }
}