package com.example.notification_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "notifications",
        indexes = {
                @Index(
                        name = "idx_notifications_user_id",
                        columnList = "user_id"
                ),
                @Index(
                        name = "idx_notifications_created_at",
                        columnList = "created_at"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "event_id",
            nullable = false,
            unique = true,
            length = 100
    )
    private String eventId;

    @Column(
            name = "transaction_id",
            nullable = false
    )
    private Long transactionId;

    @Column(
            name = "user_id",
            nullable = false
    )
    private Long userId;

    @Column(
            name = "sender_account_id"
    )
    private Long senderAccountId;

    @Column(
            name = "receiver_account_id"
    )
    private Long receiverAccountId;

    @Column(
            name = "amount",
            nullable = false,
            precision = 19,
            scale = 2
    )
    private BigDecimal amount;

    @Column(
            name = "transaction_type",
            nullable = false,
            length = 30
    )
    private String transactionType;

    @Column(
            name = "transaction_status",
            nullable = false,
            length = 20
    )
    private String transactionStatus;

    @Column(
            name = "message",
            nullable = false,
            length = 500
    )
    private String message;

    @Column(
            name = "created_at",
            nullable = false
    )
    private LocalDateTime createdAt;

    /*
     * Read state.
     *
     * columnDefinition pins NOT NULL DEFAULT 0 so that ddl-auto=update can add
     * the column to a table that already holds rows without leaving them NULL.
     */
    @Builder.Default
    @Column(
            name = "is_read",
            nullable = false,
            columnDefinition = "TINYINT(1) NOT NULL DEFAULT 0"
    )
    private boolean read = false;

    @Column(
            name = "read_at"
    )
    private LocalDateTime readAt;
}