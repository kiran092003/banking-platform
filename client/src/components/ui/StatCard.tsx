import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  /** Navy executive treatment, used for the headline balance. */
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-card border p-5 shadow-[var(--shadow-tier1)]',
        accent ? 'border-navy bg-navy' : 'border-hairline bg-surface'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cn('label-badge', accent ? 'text-slate-400' : 'text-ink-muted')}>
          {label}
        </p>
        {Icon && (
          <Icon
            className={cn('h-4 w-4 shrink-0', accent ? 'text-slate-400' : 'text-ink-subtle')}
            aria-hidden="true"
          />
        )}
      </div>

      <p
        className={cn(
          'tnum mt-3 text-[28px] font-bold leading-9 tracking-[-0.02em] sm:text-[36px] sm:leading-[44px]',
          accent ? 'text-white' : 'text-ink'
        )}
      >
        {value}
      </p>

      {sublabel && (
        <div className={cn('mt-2 text-[13px]', accent ? 'text-slate-400' : 'text-ink-muted')}>
          {sublabel}
        </div>
      )}
    </div>
  );
}
