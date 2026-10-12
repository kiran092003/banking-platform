package com.example.notification_service.dto;

import java.util.List;

/**
 * Paginated notification history.
 *
 * Mirrors the field names of TransactionHistoryResponse so the frontend handles
 * pagination identically across the platform.
 */
public record NotificationPageResponse(

        List<NotificationResponse> notifications,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last,
        long unreadCount

) {
}
