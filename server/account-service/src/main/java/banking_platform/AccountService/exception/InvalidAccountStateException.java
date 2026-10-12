package banking_platform.AccountService.exception;

public class InvalidAccountStateException
        extends RuntimeException {

    public InvalidAccountStateException(String message) {
        super(message);
    }
}