import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useNotificationSocket } from './useNotificationSocket';
import type { SocketStatus } from '@/types/notification';

interface NotificationSocketContextValue {
  status: SocketStatus;
  /** Live count from the socket; null until the first frame arrives. */
  unreadCount: number | null;
  setUnreadCount: (count: number | null) => void;
}

const NotificationSocketContext =
  createContext<NotificationSocketContextValue | null>(null);

/**
 * Owns the single notification WebSocket for the whole app.
 *
 * Mounted once in the app shell so the header badge and the notifications page
 * share one connection rather than opening one each.
 */
export function NotificationSocketProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { status, unreadCount, setUnreadCount } = useNotificationSocket();

  const value = useMemo(
    () => ({ status, unreadCount, setUnreadCount }),
    [status, unreadCount, setUnreadCount]
  );

  return (
    <NotificationSocketContext.Provider value={value}>
      {children}
    </NotificationSocketContext.Provider>
  );
}

/** Returns a closed/null stub outside the provider so callers need no guard. */
export function useNotificationSocketContext(): NotificationSocketContextValue {
  return (
    useContext(NotificationSocketContext) ?? {
      status: 'closed',
      unreadCount: null,
      setUnreadCount: () => {},
    }
  );
}
