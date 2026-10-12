package banking_platform.transaction_service.dto;

import java.time.LocalDateTime;

public record ApiErrorResponse(

        LocalDateTime timestamp,

        int status,

        String error,

        String message,

        String path

) {
}