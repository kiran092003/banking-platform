import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import type { TransactionStatus } from '@/types/transaction';
import type { AccountStatus } from '@/types/account';
import type { Role } from '@/types/auth';

export type BadgeTone = 'success' | 'pending' | 'failed' | 'neutral' | 'info';

const TONES: Record<BadgeTone, string> = {
  success: 'bg-positive-bg text-positive-text border-positive-border',
  pending: 'bg-warning-bg text-warning-text border-warning-border',
  failed: 'bg-critical-bg text-critical-text border-critical-border',
  neutral: 'bg-surface-2 text-neutral-text border-hairline',
  info: 'bg-[#eff6ff] text-cobalt border-[#bfdbfe]',
};

const DOT_TONES: Record<BadgeTone, string> = {
  success: 'bg-positive',
  pending: 'bg-warning',
  failed: 'bg-critical',
  neutral: 'bg-ink-subtle',
  info: 'bg-cobalt',
};

export function Badge({
  tone = 'neutral',
  withDot = false,
  children,
  className,
}: {
  tone?: BadgeTone;
  withDot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'label-badge inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5',
        TONES[tone],
        className
      )}
    >
      {withDot && (
        <span
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT_TONES[tone])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

const TRANSACTION_TONES: Record<TransactionStatus, BadgeTone> = {
  SUCCESS: 'success',
  PENDING: 'pending',
  FAILED: 'failed',
};

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <Badge tone={TRANSACTION_TONES[status] ?? 'neutral'} withDot>
      {status}
    </Badge>
  );
}

const ACCOUNT_TONES: Record<AccountStatus, BadgeTone> = {
  ACTIVE: 'success',
  BLOCKED: 'pending',
  CLOSED: 'failed',
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <Badge tone={ACCOUNT_TONES[status] ?? 'neutral'} withDot>
      {status}
    </Badge>
  );
}

/**
 * ADMIN is called out in cobalt because it is the privileged role: in the user
 * directory it needs to be scannable at a glance, not just readable.
 */
const ROLE_TONES: Record<Role, BadgeTone> = {
  ADMIN: 'info',
  SUPPORT: 'pending',
  USER: 'neutral',
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={ROLE_TONES[role] ?? 'neutral'}>{role}</Badge>;
}
