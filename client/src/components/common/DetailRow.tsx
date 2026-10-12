import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Label-left / value-right row used across detail and review cards. */
export function DetailRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0',
        className
      )}
    >
      <dt className="label-badge text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

export function DetailList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={cn('divide-y divide-hairline', className)}>{children}</dl>;
}
