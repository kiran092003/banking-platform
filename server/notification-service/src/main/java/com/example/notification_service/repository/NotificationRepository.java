package com.example.notification_service.repository;

import com.example.notification_service.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    Optional<Notification> findByEventId(String eventId);

    boolean existsByEventId(String eventId);

    /*
     * Every query below is scoped by userId.
     *
     * userId always comes from the authenticated JWT, never from the request,
     * so a caller cannot be handed another user's notifications.
     */

    Page<Notification> findByUserId(Long userId, Pageable pageable);

    Page<Notification> findByUserIdAndRead(
            Long userId,
            boolean read,
            Pageable pageable
    );

    long countByUserIdAndRead(Long userId, boolean read);

    /*
     * Scoped by id AND userId, so marking a notification read can never touch a
     * row belonging to someone else even if an id is guessed.
     */
    Optional<Notification> findByIdAndUserId(Long id, Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Notification n
               SET n.read = true,
                   n.readAt = :readAt
             WHERE n.userId = :userId
               AND n.read = false
            """)
    int markAllAsReadForUser(
            @Param("userId") Long userId,
            @Param("readAt") LocalDateTime readAt
    );
}
