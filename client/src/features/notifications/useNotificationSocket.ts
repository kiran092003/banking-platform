import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { requestWebSocketTicket } from '@/api/notificationApi';
import { useAuth } from '@/features/auth/useAuth';
import type {
  NotificationSocketFrame,
  SocketStatus,
} from '@/types/notification';

/** Same-origin in dev; Vite proxies /ws to the gateway (see vite.config.ts). */
function socketUrl(ticket: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/notifications?ticket=${encodeURIComponent(ticket)}`;
}

const INITIAL_RECONNECT_DELAY = 1_000;
const MAX_RECONNECT_DELAY = 30_000;
const HEARTBEAT_INTERVAL = 25_000;

/**
 * Keeps a live notification stream open for the signed-in user.
 *
 * Connection flow: POST /ws-ticket with the Bearer token, then open the socket
 * with that single-use ticket. Reconnects with exponential backoff and full
 * jitter, which stops every open tab from retrying in lockstep after a gateway
 * restart.
 *
 * Incoming notifications are written straight into the React Query cache, so
 * the list and the header badge update without a refetch.
 */
export function useNotificationSocket() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<SocketStatus>('closed');
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);
  /** Guards against a reconnect being scheduled after unmount or sign-out. */
  const activeRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current !== null) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const handleFrame = useCallback(
    (frame: NotificationSocketFrame) => {
      switch (frame.type) {
        case 'CONNECTED':
          setUnreadCount(frame.unreadCount);
          break;

        case 'NOTIFICATION': {
          setUnreadCount(frame.unreadCount);

          /*
           * Invalidate rather than splice the new row into every cached page:
           * the list is paginated and server-sorted, so refetching is the only
           * way to keep page boundaries honest.
           */
          queryClient.invalidateQueries({
            queryKey: queryKeys.notifications.all,
          });

          // A notification means a transaction settled — balances moved too.
          queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
          break;
        }

        case 'PONG':
          break;
      }
    },
    [queryClient]
  );

  const connect = useCallback(async () => {
    if (!activeRef.current) return;

    setStatus('connecting');

    let ticket: string;
    try {
      ticket = await requestWebSocketTicket();
    } catch {
      // Could not mint a ticket (offline, or the session is gone). Back off.
      scheduleReconnect();
      return;
    }

    if (!activeRef.current) return;

    let socket: WebSocket;
    try {
      socket = new WebSocket(socketUrl(ticket));
    } catch {
      scheduleReconnect();
      return;
    }

    socketRef.current = socket;

    socket.onopen = () => {
      attemptsRef.current = 0;
      setStatus('open');

      heartbeatTimerRef.current = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send('ping');
        }
      }, HEARTBEAT_INTERVAL);
    };

    socket.onmessage = (event) => {
      try {
        handleFrame(JSON.parse(event.data as string) as NotificationSocketFrame);
      } catch {
        // A frame we cannot parse is ignored rather than killing the stream.
      }
    };

    socket.onclose = () => {
      setStatus('closed');
      socketRef.current = null;
      if (heartbeatTimerRef.current !== null) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      scheduleReconnect();
    };

    socket.onerror = () => {
      // onclose always follows; reconnect is handled there.
      socket.close();
    };

    function scheduleReconnect() {
      if (!activeRef.current || reconnectTimerRef.current !== null) return;

      const attempt = attemptsRef.current++;
      const ceiling = Math.min(
        INITIAL_RECONNECT_DELAY * 2 ** attempt,
        MAX_RECONNECT_DELAY
      );
      // Full jitter: spreads reconnects instead of synchronising them.
      const delay = Math.random() * ceiling;

      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        void connect();
      }, delay);
    }
  }, [handleFrame]);

  useEffect(() => {
    if (!isAuthenticated) {
      activeRef.current = false;
      clearTimers();
      socketRef.current?.close();
      socketRef.current = null;
      setStatus('closed');
      setUnreadCount(null);
      return;
    }

    activeRef.current = true;
    attemptsRef.current = 0;
    void connect();

    return () => {
      activeRef.current = false;
      clearTimers();
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        // Drop handlers first so teardown does not trigger a reconnect.
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
    };
    // user.userId: a different user must get a fresh socket, not the old one.
  }, [isAuthenticated, user?.userId, connect, clearTimers]);

  return { status, unreadCount, setUnreadCount };
}
