import type { TransactionHistoryParams } from '@/types/transaction';
import type { NotificationQueryParams } from '@/types/notification';
import type { UserQueryParams } from '@/types/user';

/**
 * Central query-key registry so mutations can invalidate precisely.
 */
export const queryKeys = {
  accounts: {
    all: ['accounts'] as const,
    list: () => [...queryKeys.accounts.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.accounts.all, 'detail', id] as const,
    byUser: (userId: number) => [...queryKeys.accounts.all, 'byUser', userId] as const,
    mine: () => [...queryKeys.accounts.all, 'mine'] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (params: TransactionHistoryParams) =>
      [...queryKeys.transactions.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.transactions.all, 'detail', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (params: NotificationQueryParams) =>
      [...queryKeys.notifications.all, 'list', params] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (params: UserQueryParams) => [...queryKeys.users.all, 'list', params] as const,
    /** Full directory backing the name pickers; not a page of `list`. */
    directory: () => [...queryKeys.users.all, 'directory'] as const,
  },
} as const;
