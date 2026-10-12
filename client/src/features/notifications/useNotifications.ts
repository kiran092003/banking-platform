import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as notificationApi from '@/api/notificationApi';
import { queryKeys } from '@/api/queryKeys';
import { useAuth } from '@/features/auth/useAuth';
import { useNotificationSocketContext } from './NotificationSocketProvider';
import type { NotificationQueryParams } from '@/types/notification';

/** GET /notification/notifications — the caller's own notifications. */
export function useNotifications(params: NotificationQueryParams = {}) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => notificationApi.getNotifications(params),
    enabled: isAuthenticated,
    placeholderData: (previous) => previous,
  });
}

/** GET /notification/notifications/unread-count */
export function useUnreadCountQuery() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: notificationApi.getUnreadCount,
    enabled: isAuthenticated,
  });
}

/**
 * The number shown on the header badge.
 *
 * Prefers the live socket value and falls back to the fetched count, so the
 * badge is still correct when the socket is down or reconnecting.
 */
export function useUnreadNotificationCount(): number {
  const { unreadCount: liveCount } = useNotificationSocketContext();
  const { data: fetchedCount } = useUnreadCountQuery();

  if (liveCount !== null) return liveCount;
  return fetchedCount ?? 0;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { setUnreadCount } = useNotificationSocketContext();

  return useMutation({
    mutationFn: (id: number) => notificationApi.markAsRead(id),
    onSuccess: () => {
      // Let the server be the source of truth for the new count.
      setUnreadCount(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { setUnreadCount } = useNotificationSocketContext();

  return useMutation({
    mutationFn: notificationApi.markAllAsRead,
    onSuccess: () => {
      setUnreadCount(0);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
