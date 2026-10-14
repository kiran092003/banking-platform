package com.banking_payment_platform.auth_service.exception;

/**
 * A password change the caller is not allowed to make: the current password
 * did not match, or the new password is the one already in use.
 *
 * Deliberately NOT an InvalidCredentialsException. That maps to 401, and the
 * client treats a 401 on an authenticated route as an expired access token —
 * it would refresh, replay the request and, if the refresh failed, sign the
 * user out. Mistyping your current password must not end your session, so this
 * maps to 400 instead.
 */
public class InvalidPasswordChangeException extends RuntimeException {

    public InvalidPasswordChangeException(String message) {
        super(message);
    }
}
