import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Bell } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, TransactionStatusBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { Money, MonoText } from '@/components/common/Money';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications/useNotifications';
import { useNotificationSocketContext } from '@/features/notifications/NotificationSocketProvider';
import { formatRelativeTime } from '@/utils/format';
import { normalizeApiError } from '@/utils/errors';
import type { AppNotification } from '@/types/notification';
import type { TransactionType } from '@/types/transaction';
import { cn } from '@/utils/cn';

const TYPE_ICON: Record<TransactionType, typeof ArrowLeftRight> = {
  TRANSFER: ArrowLeftRight,
  DEPOSIT: ArrowDownToLine,
  WITHDRAWAL: ArrowUpFromLine,
};

const STATUS_ICON_TONE: Record<string, string> = {
  SUCCESS: 'bg-positive-bg text-positive-text',
  FAILED: 'bg-critical-bg text-critical-text',
  PENDING: 'bg-warning-bg text-warning-text',
};

function NotificationRow({
  notification,
  onMarkRead,
  isMarking,
}: {
  notification: AppNotification;
  onMarkRead: (id: number) => void;
  isMarking: boolean;
}) {
  const Icon = TYPE_ICON[notification.transactionType] ?? Bell;
  const tone =
    STATUS_ICON_TONE[notification.transactionStatus] ?? 'bg-surface-2 text-ink-muted';

  return (
    <li
      className={cn(
        'flex gap-3 px-4 py-3.5 sm:px-5',
        !notification.read && 'bg-[#eff4ff]'
      )}
    >
      {/* Unread marker, also conveyed in text for screen readers. */}
      <span className="flex w-2 shrink-0 items-start pt-2.5" aria-hidden="true">
        {!notification.read && (
          <span className="h-1.5 w-1.5 rounded-full bg-cobalt" />
        )}
      </span>

      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-base',
          tone
        )}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink">
            {notification.transactionType}
          </span>
          <TransactionStatusBadge status={notification.transactionStatus} />
          {!notification.read && <span className="sr-only">Unread</span>}
        </div>

        <p className="mt-0.5 text-[13px] text-ink-muted">{notification.message}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            to={`/transactions/${notification.transactionId}`}
            className="text-cobalt hover:underline"
          >
            <MonoText>TXN #{notification.transactionId}</MonoText>
          </Link>
          <Money value={notification.amount} className="text-[13px] font-medium" />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <time
          dateTime={notification.createdAt}
          className="whitespace-nowrap text-[13px] text-ink-subtle"
        >
          {formatRelativeTime(notification.createdAt)}
        </time>
        {!notification.read && (
          <button
            type="button"
            onClick={() => onMarkRead(notification.id)}
            disabled={isMarking}
            className="text-[13px] font-medium text-cobalt hover:underline disabled:opacity-50"
          >
            Mark read
          </button>
        )}
      </div>
    </li>
  );
}

export default function NotificationsPage() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const params = { page, size, unreadOnly };
  const query = useNotifications(params);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const { status: socketStatus } = useNotificationSocketContext();

  const data = query.data;
  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Transaction events and account activity"
        action={
          <Button
            variant="secondary"
            disabled={unreadCount === 0 || markAllRead.isPending}
            isLoading={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            {markAllRead.isPending ? 'Marking…' : 'Mark all as read'}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Segmented filter */}
        <div
          role="group"
          aria-label="Filter notifications"
          className="inline-flex h-9 items-center gap-0.5 rounded-base bg-surface-2 p-0.5"
        >
          {[
            { label: 'All', value: false },
            { label: 'Unread', value: true },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={unreadOnly === option.value}
              onClick={() => {
                setUnreadOnly(option.value);
                setPage(0);
              }}
              className={cn(
                'h-8 rounded-[6px] px-3 text-[13px] transition-colors',
                unreadOnly === option.value
                  ? 'bg-surface font-medium text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-ink-muted hover:text-ink'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <Badge tone="info">{unreadCount} unread</Badge>
        )}

        {/* Live-stream indicator. Reconnects are automatic. */}
        <span className="ml-auto flex items-center gap-1.5 text-[13px] text-ink-muted">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              socketStatus === 'open'
                ? 'bg-positive'
                : socketStatus === 'connecting'
                  ? 'bg-warning'
                  : 'bg-ink-subtle'
            )}
            aria-hidden="true"
          />
          {socketStatus === 'open'
            ? 'Live'
            : socketStatus === 'connecting'
              ? 'Connecting…'
              : 'Offline'}
        </span>
      </div>

      <Card>
        <CardHeader
          title="Activity"
          description={
            socketStatus === 'open'
              ? 'New events appear here as they happen'
              : 'Reconnecting to the live stream'
          }
        />

        {query.isLoading ? (
          <TableSkeleton rows={6} columns={3} />
        ) : query.isError ? (
          <ErrorState
            error={normalizeApiError(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={unreadOnly ? 'Nothing unread' : 'No notifications yet'}
            description={
              unreadOnly
                ? 'You are all caught up.'
                : 'Transaction events will appear here as soon as they happen.'
            }
            action={
              unreadOnly ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setUnreadOnly(false);
                    setPage(0);
                  }}
                >
                  Show all
                </Button>
              ) : (
                <Link to="/transfer">
                  <Button size="sm">Make a transfer</Button>
                </Link>
              )
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-surface-2">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => markRead.mutate(id)}
                  isMarking={markRead.isPending}
                />
              ))}
            </ul>

            {data && (
              <Pagination
                page={data.page}
                size={data.size}
                totalElements={data.totalElements}
                totalPages={data.totalPages}
                isFirst={data.first}
                isLast={data.last}
                onPageChange={setPage}
                onSizeChange={(value) => {
                  setSize(value);
                  setPage(0);
                }}
              />
            )}
          </>
        )}
      </Card>
    </>
  );
}
