package banking_platform.transaction_service.dto;

import java.util.List;

public record TransactionHistoryResponse(

        List<TransactionResponse> transactions,

        int page,

        int size,

        long totalElements,

        int totalPages,

        boolean first,

        boolean last
) {
}