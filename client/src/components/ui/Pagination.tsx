import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  /** Zero-based, matching the backend. */
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
  onPageChange: (page: number) => void;
  onSizeChange?: (size: number) => void;
}

/** Backend caps page size at 50. */
const SIZE_OPTIONS = [10, 25, 50];

export function Pagination({
  page,
  size,
  totalElements,
  totalPages,
  isFirst,
  isLast,
  onPageChange,
  onSizeChange,
}: PaginationProps) {
  const from = totalElements === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3">
      <p className="text-[13px] text-ink-muted">
        Showing <span className="tnum font-medium text-ink">{from}</span>–
        <span className="tnum font-medium text-ink">{to}</span> of{' '}
        <span className="tnum font-medium text-ink">{totalElements}</span>
      </p>

      <div className="flex items-center gap-3">
        {onSizeChange && (
          <label className="flex items-center gap-2 text-[13px] text-ink-muted">
            <span className="hidden sm:inline">Rows</span>
            <select
              value={size}
              onChange={(event) => onSizeChange(Number(event.target.value))}
              className="h-9 rounded-base border border-outline bg-surface px-2 text-[13px] text-ink outline-none focus:border-cobalt focus:ring-[3px] focus:ring-cobalt/15"
            >
              {SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={isFirst}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <span className="tnum px-1 text-[13px] text-ink-muted">
            {totalPages === 0 ? 0 : page + 1} / {totalPages}
          </span>

          <Button
            variant="secondary"
            size="sm"
            disabled={isLast}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
