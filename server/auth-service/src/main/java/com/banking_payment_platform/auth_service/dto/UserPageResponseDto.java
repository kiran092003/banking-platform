package com.banking_payment_platform.auth_service.dto;

import java.util.List;

/**
 * Paginated user list. Mirrors the page envelope the transaction and
 * notification services already return, so the client reads them the same way.
 */
public record UserPageResponseDto(
        List<UserSummaryDto> users,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {
}
