package banking_platform.AccountService.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "account_operations",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_account_operation_operation_id",
                        columnNames = "operation_id"
                )
        },
        indexes = {
                @Index(
                        name = "idx_account_operation_operation_id",
                        columnList = "operation_id"
                )
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountOperation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "operation_id",
            nullable = false,
            unique = true,
            length = 100
    )
    private String operationId;

    @Column(
            name = "operation_type",
            nullable = false,
            length = 30
    )
    private String operationType;

    @Column(
            name = "created_at",
            nullable = false
    )
    private LocalDateTime createdAt;
}