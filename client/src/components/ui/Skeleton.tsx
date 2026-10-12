import { cn } from '@/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-base', className)} aria-hidden="true" />;
}

/** Placeholder matching the 52px data-row height of the real table. */
export function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div role="status" aria-label="Loading data" className="divide-y divide-surface-2">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex h-[52px] items-center gap-4 px-4">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn('h-3.5', colIndex === 0 ? 'w-[12%]' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-card border border-hairline bg-surface p-5 shadow-[var(--shadow-tier1)]">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-9 w-40" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}
