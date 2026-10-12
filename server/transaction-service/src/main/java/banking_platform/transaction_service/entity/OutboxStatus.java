package banking_platform.transaction_service.entity;

public enum OutboxStatus {

    PENDING,

    PUBLISHED,

    PUBLISHING,

    FAILED
}