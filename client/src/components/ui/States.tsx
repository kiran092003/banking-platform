import type { ComponentType, ReactNode } from 'react';
import { AlertTriangle, Inbox, Lock, ServerCrash, WifiOff } from 'lucide-react';
import { Button } from './Button';
import type { NormalizedApiError } from '@/types/api';
import { cn } from '@/utils/cn';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
        <Icon className="h-5 w-5 text-ink-subtle" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-[13px] text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * Renders a failed request. Picks its wording from the normalised error so the
 * user sees "you don't have access" rather than a generic failure, and never
 * sees a stack trace or an internal backend detail.
 */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: NormalizedApiError;
  onRetry?: () => void;
  className?: string;
}) {
  let Icon: ComponentType<{ className?: string }> = AlertTriangle;
  let title = 'Something went wrong';

  if (error.isNetworkError || error.isTimeout) {
    Icon = WifiOff;
    title = error.isTimeout ? 'Request timed out' : 'Connection problem';
  } else if (error.status === 403) {
    Icon = Lock;
    title = 'Access denied';
  } else if (error.status === 503 || error.code === 'ACCOUNT_SERVICE_UNAVAILABLE') {
    Icon = ServerCrash;
    title = 'Service unavailable';
  } else if (error.status === 404) {
    Icon = Inbox;
    title = 'Not found';
  }

  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-critical-bg">
        <Icon className="h-5 w-5 text-critical" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-md text-[13px] text-ink-muted">{error.message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
