package banking_platform.AccountService.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "accounts",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_account_number",
                        columnNames = "account_number"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Account number is required")
    @Pattern(
            regexp = "^[0-9]{12}$",
            message = "Account number must contain exactly 12 digits"
    )
    @Column(
            name = "account_number",
            nullable = false,
            unique = true,
            length = 12
    )
    private String accountNumber;

    @NotNull(message = "User ID is required")
    @Positive(message = "User ID must be greater than 0")
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @NotNull(message = "Account type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false)
    private AccountType accountType;

    @NotNull(message = "Balance is required")
    @DecimalMin(
            value = "0.00",
            inclusive = true,
            message = "Balance cannot be negative"
    )
    @Digits(
            integer = 17,
            fraction = 2,
            message = "Balance can have maximum 17 integer digits and 2 decimal places"
    )
    @Column(
            nullable = false,
            precision = 19,
            scale = 2
    )
    private BigDecimal balance;

    @NotNull(message = "Account status is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountStatus status;

    @NotNull(message = "Created date is required")
    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @Version
    @Column(nullable = false)
    private Long version;
}