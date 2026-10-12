package com.example.notification_service.event;

import com.example.notification_service.entity.Notification;

/**
 * Raised when a notification has been persisted. Delivered to listeners only
 * after the surrounding transaction commits.
 */
public record NotificationCreatedEvent(Notification notification) {
}
