import { apiClient } from './axios';
import {
  MAX_NOTIFICATION_PAGE_SIZE,
  type AppNotification,
  type NotificationPageResponse,
  type NotificationQueryParams,
  type UnreadCountResponse,
} from '@/types/notification';

/**
 * Notification Service via the API Gateway.
 * Gateway strips the `/notification` prefix:
 *   /notification/notifications -> notification-service /notifications
 *
 * Authorisation: every endpoint operates on the caller's own notifications,
 * resolved server-side from the JWT. There is no parameter through which one
 * user can read or modify another user's notifications.
 */

/** GET /notification/notifications */
export async function getNotifications(
  params: NotificationQueryParams = {}
): Promise<NotificationPageResponse> {
  const { data } = await apiClient.get<NotificationPageResponse>(
    '/notification/notifications',
    {
      params: {
        page: params.page ?? 0,
        size: Math.min(params.size ?? 20, MAX_NOTIFICATION_PAGE_SIZE),
        unreadOnly: params.unreadOnly ? true : undefined,
      },
    }
  );
  return data;
}

/** GET /notification/notifications/unread-count */
export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<UnreadCountResponse>(
    '/notification/notifications/unread-count',
    // Background badge, refetched on every inbound socket message. Flashing the
    // progress bar for a number in the corner is noise.
    { loading: { track: false } }
  );
  return data.unreadCount;
}

/** PATCH /notification/notifications/{id}/read */
export async function markAsRead(id: number): Promise<AppNotification> {
  const { data } = await apiClient.patch<AppNotification>(
    `/notification/notifications/${id}/read`
  );
  return data;
}

/** POST /notification/notifications/read-all */
export async function markAllAsRead(): Promise<void> {
  await apiClient.post('/notification/notifications/read-all');
}

/**
 * POST /ws-ticket — exchanges the access token for a single-use, 30-second
 * ticket used to open the notification WebSocket.
 *
 * A browser cannot set an Authorization header on a WebSocket, and putting the
 * access token in the URL would write it to access logs and browser history.
 * The ticket is minted over an ordinary authenticated request instead.
 */
export async function requestWebSocketTicket(): Promise<string> {
  const { data } = await apiClient.post<{ ticket: string; expiresIn: number }>(
    '/ws-ticket',
    undefined,
    // Plumbing for the socket, including every reconnect. The user did not ask
    // for it and cannot act on it.
    { loading: { track: false } }
  );
  return data.ticket;
}
