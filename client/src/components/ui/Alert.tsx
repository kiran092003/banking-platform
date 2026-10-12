import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Clock, Info } from 'lucide-react';
import { cn } from '@/utils/cn';

export type AlertTone = 'error' | 'success' | 'warning' | 'info';

const TONES: Record<AlertTone, string> = {
  error: 'bg-critical-bg border-critical-border text-critical-text',
  success: 'bg-positive-bg border-positive-border text-positive-text',
  warning: 'bg-warning-bg border-warning-border text-warning-text',
  info: 'bg-surface-2 border-hairline text-neutral-text',
};

const ICONS: Record<AlertTone, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
  warning: Clock,
  info: Info,
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = ICONS[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-2.5 rounded-base border px-3 py-2.5', TONES[tone], className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 text-[13px] leading-[18px]">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  );
}
