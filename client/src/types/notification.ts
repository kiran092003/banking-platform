/**
 * Mirrors notification-service DTOs exactly.
 * Source: NotificationResponse / NotificationPageResponse.
 */

import type { TransactionStatus, TransactionType } from './transaction';

/** NotificationResponse */
export interface AppNotification {
  id: number;
  transactionId: number;
  userId: number;
  senderAccountId: number | null;
  receiverAccountId: number | null;
  amount: number;
  transactionType: TransactionType;
  transactionStatus: TransactionStatus;
  message: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

/** NotificationPageResponse */
export interface NotificationPageResponse {
  notifications: AppNotification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  unreadCount: number;
}

/** UnreadCountResponse */
export interface UnreadCountResponse {
  unreadCount: number;
}

export interface NotificationQueryParams {
  page?: number;
  /** Backend caps this at 50. */
  size?: number;
  unreadOnly?: boolean;
}

export const MAX_NOTIFICATION_PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// WebSocket frames pushed by the server
// ---------------------------------------------------------------------------

export interface ConnectedFrame {
  type: 'CONNECTED';
  unreadCount: number;
}

export interface NotificationFrame {
  type: 'NOTIFICATION';
  unreadCount: number;
  notification: AppNotification;
}

export interface PongFrame {
  type: 'PONG';
}

export type NotificationSocketFrame =
  | ConnectedFrame
  | NotificationFrame
  | PongFrame;

export type SocketStatus = 'connecting' | 'open' | 'closed';
