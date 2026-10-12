package com.banking_payment_platform.auth_service.exception;

/**
 * A role change that is structurally valid but not allowed — changing your own
 * role, or demoting the last remaining administrator.
 */
public class InvalidRoleChangeException extends RuntimeException {

    public InvalidRoleChangeException(String message) {
        super(message);
    }
}
