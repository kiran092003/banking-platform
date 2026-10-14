import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Filter, X } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * A per-column filter: a funnel in the column header that opens a small
 * popover holding that column's control.
 *
 * The funnel is filled and tinted when the column is filtering, so a table
 * narrowed by a filter three columns off-screen still says so. `isActive` is
 * the caller's to decide — only it knows what "unset" means for its control.
 *
 * The popover is portalled to the body and positioned against the trigger.
 * Rendering it inside the <th> would have it clipped by the table's horizontal
 * scroll container, which is exactly where a right-hand column's popover needs
 * to escape to.
 */
export function ColumnFilter({
  label,
  isActive,
  onClear,
  children,
}: {
  /** Column name, used to label the popover and the trigger for screen readers. */
  label: string;
  isActive: boolean;
  onClear: () => void;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  // Place the popover under the funnel, nudged left if it would overflow.
  useEffect(() => {
    if (!isOpen) return;

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = 240;
      const gutter = 8;

      const left = Math.min(
        Math.max(gutter, rect.left),
        window.innerWidth - width - gutter
      );

      setPosition({ top: rect.bottom + 6, left });
    }

    place();

    // The header is sticky and the table scrolls horizontally, so the trigger
    // moves under the popover unless it is re-placed as that happens.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);

    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [isOpen]);

  // Dismiss on Escape or a click outside.
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(event) => {
          // Column headers double as sort triggers; this must not sort too.
          event.stopPropagation();
          setIsOpen((value) => !value);
        }}
        aria-label={
          isActive ? `Filter by ${label} (active)` : `Filter by ${label}`
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={isOpen ? popoverId : undefined}
        className={cn(
          'ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-micro align-middle transition-colors',
          isActive
            ? 'bg-cobalt/12 text-cobalt'
            : 'text-ink-subtle hover:bg-surface-2 hover:text-ink-body',
          isOpen && 'bg-cobalt/12 text-cobalt'
        )}
      >
        <Filter
          className="h-3 w-3"
          // A filled funnel reads as "on" without relying on colour alone.
          fill={isActive ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="dialog"
            aria-label={`Filter by ${label}`}
            style={{ top: position.top, left: position.left, width: 240 }}
            className="fixed z-40 rounded-card border border-hairline bg-surface p-3 shadow-[var(--shadow-tier3)]"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="label-badge text-ink-body">{label}</span>
              {isActive && (
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setIsOpen(false);
                  }}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-cobalt hover:underline"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Clear
                </button>
              )}
            </div>

            {children}
          </div>,
          document.body
        )}
    </>
  );
}

/** Shared control styling, so every filter popover looks like one component. */
export const filterFieldClass =
  'h-9 w-full rounded-base border border-outline bg-surface px-2.5 text-sm text-ink outline-none focus:border-cobalt focus:ring-[3px] focus:ring-cobalt/15';
