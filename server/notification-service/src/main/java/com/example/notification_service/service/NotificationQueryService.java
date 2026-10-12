package com.example.notification_service.service;

import com.example.notification_service.dto.NotificationPageResponse;
import com.example.notification_service.dto.NotificationResponse;
import com.example.notification_service.entity.Notification;
import com.example.notification_service.exception.InvalidRequestException;
import com.example.notification_service.exception.NotificationNotFoundException;
import com.example.notification_service.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Read and read-state operations for the authenticated user's notifications.
 *
 * Every method takes userId as its first argument and the caller passes the id
 * taken from the JWT. Nothing here accepts a user identifier from the request
 * body or query string.
 */
@Service
@RequiredArgsConstructor
public class NotificationQueryService {

    private static final int MAX_PAGE_SIZE = 50;

    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public NotificationPageResponse getNotifications(
            Long userId,
            int page,
            int size,
            Boolean unreadOnly
    ) {

        validatePagination(page, size);

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        Page<Notification> result =
                Boolean.TRUE.equals(unreadOnly)
                        ? notificationRepository
                        .findByUserIdAndRead(userId, false, pageable)
                        : notificationRepository.findByUserId(userId, pageable);

        return new NotificationPageResponse(
                result.getContent().stream()
                        .map(NotificationResponse::from)
                        .toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.isFirst(),
                result.isLast(),
                notificationRepository.countByUserIdAndRead(userId, false)
        );
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndRead(userId, false);
    }

    /**
     * Marks one notification read.
     *
     * Looked up by id AND userId, so a notification belonging to another user
     * reports as not found rather than being modified.
     */
    @Transactional
    public NotificationResponse markAsRead(Long userId, Long notificationId) {

        Notification notification = notificationRepository
                .findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new NotificationNotFoundException(
                        "Notification not found"
                ));

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);
        }

        return NotificationResponse.from(notification);
    }

    @Transactional
    public long markAllAsRead(Long userId) {
        return notificationRepository.markAllAsReadForUser(
                userId,
                LocalDateTime.now()
        );
    }

    private void validatePagination(int page, int size) {

        if (page < 0) {
            throw new InvalidRequestException("Page number cannot be negative");
        }

        if (size <= 0) {
            throw new InvalidRequestException("Page size must be greater than zero");
        }

        if (size > MAX_PAGE_SIZE) {
            throw new InvalidRequestException(
                    "Page size cannot exceed " + MAX_PAGE_SIZE
            );
        }
    }
}
