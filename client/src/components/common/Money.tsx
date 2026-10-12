import { formatCurrency } from '@/utils/format';
import { cn } from '@/utils/cn';

/**
 * Renders a financial figure with tabular numerals so decimals line up down a
 * ledger column, per the design system's number rules.
 */
export function Money({
  value,
  className,
  signed = false,
}: {
  value: number | null | undefined;
  className?: string;
  /** Tints negative values red and positive green, for flow columns. */
  signed?: boolean;
}) {
  const tone =
    signed && typeof value === 'number'
      ? value < 0
        ? 'text-critical-text'
        : value > 0
          ? 'text-positive-text'
          : undefined
      : undefined;

  return <span className={cn('tnum', tone, className)}>{formatCurrency(value)}</span>;
}

/** Account numbers, transaction IDs and idempotency keys use the mono face. */
export function MonoText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('font-mono text-xs tracking-[-0.01em]', className)}>
      {children}
    </span>
  );
}
