package com.example.notification_service.controller;

import com.example.notification_service.dto.NotificationPageResponse;
import com.example.notification_service.dto.NotificationResponse;
import com.example.notification_service.dto.UnreadCountResponse;
import com.example.notification_service.exception.InvalidRequestException;
import com.example.notification_service.service.NotificationQueryService;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Notification REST API.
 *
 * Authorisation model: every endpoint operates on the caller's own
 * notifications. The user is resolved from the validated JWT, never from a
 * parameter, so there is no endpoint through which one user can read or modify
 * another user's notifications — not even an ADMIN.
 */
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@Validated
public class NotificationController {

    private final NotificationQueryService notificationQueryService;

    /** GET /notifications — paginated, newest first. */
    @GetMapping
    public ResponseEntity<NotificationPageResponse> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Boolean unreadOnly
    ) {
        return ResponseEntity.ok(
                notificationQueryService.getNotifications(
                        currentUserId(),
                        page,
                        size,
                        unreadOnly
                )
        );
    }

    /** GET /notifications/unread-count — drives the header badge. */
    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount() {
        return ResponseEntity.ok(
                new UnreadCountResponse(
                        notificationQueryService.getUnreadCount(currentUserId())
                )
        );
    }

    /** PATCH /notifications/{id}/read */
    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable @Positive(message = "Notification ID must be greater than 0")
            Long id
    ) {
        return ResponseEntity.ok(
                notificationQueryService.markAsRead(currentUserId(), id)
        );
    }

    /** POST /notifications/read-all */
    @PostMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsRead() {

        long updated = notificationQueryService.markAllAsRead(currentUserId());

        return ResponseEntity.ok(Map.of(
                "updated", updated,
                "unreadCount", 0
        ));
    }

    /**
     * The authenticated user's id, as stored in the security context by
     * JwtFilter. Never read from the request.
     */
    private Long currentUserId() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new InvalidRequestException("Authentication is required");
        }

        Object details = authentication.getDetails();

        if (!(details instanceof Long userId) || userId <= 0) {
            throw new InvalidRequestException(
                    "Invalid authenticated user information"
            );
        }

        return userId;
    }
}
