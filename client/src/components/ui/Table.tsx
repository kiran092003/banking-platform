import type { HTMLAttributes, ReactNode, ThHTMLAttributes } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/utils/cn';

/** Scroll container preserving the 12px clipped frame on narrow screens. */
export function TableFrame({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-card border border-hairline bg-surface shadow-[var(--shadow-tier1)]',
        className
      )}
      {...props}
    />
  );
}

export function TableScroll({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('w-full overflow-x-auto', className)} {...props} />;
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full border-collapse text-sm', className)} {...props} />;
}

export function Thead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn('border-b border-hairline bg-canvas', className)}
      {...props}
    />
  );
}

export function Th({
  className,
  align = 'left',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' }) {
  return (
    <th
      scope="col"
      className={cn(
        'label-badge h-10 whitespace-nowrap px-4 text-neutral-text',
        align === 'right' ? 'text-right' : 'text-left',
        className
      )}
      {...props}
    />
  );
}

/** Header cell that toggles sorting, with the state announced to assistive tech. */
export function SortableTh({
  label,
  isActive,
  direction,
  onSort,
  align = 'left',
}: {
  label: string;
  isActive: boolean;
  direction: 'ASC' | 'DESC';
  onSort: () => void;
  align?: 'left' | 'right';
}) {
  const Icon = !isActive ? ChevronsUpDown : direction === 'ASC' ? ArrowUp : ArrowDown;

  return (
    <Th
      align={align}
      aria-sort={isActive ? (direction === 'ASC' ? 'ascending' : 'descending') : 'none'}
      className="p-0"
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          'label-badge flex h-10 w-full items-center gap-1.5 px-4 transition-colors hover:text-ink',
          align === 'right' && 'justify-end',
          isActive && 'text-ink'
        )}
      >
        {label}
        <Icon className="h-3 w-3" aria-hidden="true" />
      </button>
    </Th>
  );
}

export function Tbody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-surface-2', className)} {...props} />;
}

export function Tr({
  className,
  isInteractive = false,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { isInteractive?: boolean }) {
  return (
    <tr
      className={cn(
        'h-[52px] transition-colors',
        isInteractive && 'cursor-pointer hover:bg-canvas',
        className
      )}
      {...props}
    />
  );
}

export function Td({
  className,
  align = 'left',
  children,
  ...props
}: HTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' }) {
  return (
    <td
      className={cn(
        'whitespace-nowrap px-4 text-ink-body',
        align === 'right' && 'text-right',
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

/**
 * Below `md` the table is replaced by stacked cards — a 7-column ledger is
 * unreadable on a phone.
 */
export function MobileCardList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-surface-2 md:hidden">{children}</div>;
}

export function MobileCardRow({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: ReactNode;
}) {
  const Element = onClick ? 'button' : 'div';
  return (
    <Element
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full px-4 py-3.5 text-left',
        onClick && 'transition-colors hover:bg-canvas'
      )}
    >
      {children}
    </Element>
  );
}
