import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAppSelector } from '@/app/hooks';

/**
 * Keeps a flag on screen long enough to be read.
 *
 * Two problems with rendering request activity directly:
 *
 *   - a cached or fast response returns in 40ms, and a bar that appears and
 *     disappears that quickly reads as a glitch, not as progress;
 *   - a bar that appears for one frame is worse than no bar at all.
 *
 * So showing is delayed by `delayMs` — nothing is drawn for a request that
 * finishes quickly — and once shown it stays for at least `minVisibleMs`.
 */
function useDelayedVisibility(isActive: boolean, delayMs = 150, minVisibleMs = 400) {
  const [isVisible, setIsVisible] = useState(false);
  const shownAtRef = useRef(0);

  useEffect(() => {
    if (isActive && !isVisible) {
      const showTimer = window.setTimeout(() => {
        shownAtRef.current = Date.now();
        setIsVisible(true);
      }, delayMs);

      return () => window.clearTimeout(showTimer);
    }

    if (!isActive && isVisible) {
      const elapsed = Date.now() - shownAtRef.current;
      const hideTimer = window.setTimeout(
        () => setIsVisible(false),
        Math.max(minVisibleMs - elapsed, 0)
      );

      return () => window.clearTimeout(hideTimer);
    }

    return undefined;
  }, [isActive, isVisible, delayMs, minVisibleMs]);

  return isVisible;
}

/**
 * Thin indeterminate bar pinned to the top of the viewport.
 *
 * Deliberately `aria-hidden`. It fires on every pagination click, filter change
 * and background refetch, and a live region announcing "loading" that often is
 * noise a screen-reader user cannot act on — they get the result announced when
 * the content itself changes. The blocking overlay below does announce, because
 * there the wait is the whole message.
 */
function TopProgressBar() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[70] h-[3px] overflow-hidden bg-cobalt/15"
    >
      <div className="global-progress-bar h-full w-1/4 rounded-full bg-cobalt" />
    </div>
  );
}

/**
 * Covers the page while a write is in flight.
 *
 * Only the handful of requests that opt in with `loading: { blocking: true }`
 * reach this — money movement, account changes, role changes. Reads and
 * ordinary form posts show the bar above instead, because blocking the whole
 * page for a list refresh would be worse than the wait it reports.
 */
function BlockingOverlay({ message }: { message: string | null }) {
  return (
    <div
      // `status`, not `alertdialog`: this can appear over the role-change
      // modal, and a second `aria-modal` nested inside the first leaves screen
      // readers guessing which one owns the document.
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgb(15_23_42_/_0.45)] backdrop-blur-[3px]"
    >
      <div className="flex items-center gap-3 rounded-card bg-surface px-5 py-4 shadow-[var(--shadow-tier4)]">
        <Loader2 className="h-5 w-5 animate-spin text-cobalt" aria-hidden="true" />
        <p className="text-sm font-medium text-ink">{message ?? 'Working…'}</p>
      </div>
    </div>
  );
}

/**
 * The one loading indicator for the whole app, driven by the request counter in
 * `loadingSlice`. Mounted once in `RootLayout`.
 *
 * Every call through `apiClient` is counted by the axios interceptors, so this
 * covers each fetch without a page having to opt in. It does not replace the
 * per-page skeletons: a skeleton shows the shape of the content that is coming
 * and is the better first-load experience, while this reports the activity a
 * skeleton cannot — pagination, filtering, refetches after a mutation, and the
 * writes themselves.
 */
export function GlobalLoader() {
  const pending = useAppSelector((state) => state.loading.pending);
  const blocking = useAppSelector((state) => state.loading.blocking);
  const message = useAppSelector((state) => state.loading.message);

  const showBar = useDelayedVisibility(pending > 0);
  // Blocking appears sooner: it is a direct response to the user's click.
  const showOverlay = useDelayedVisibility(blocking > 0, 80, 300);

  return (
    <>
      {showBar && <TopProgressBar />}
      {showOverlay && <BlockingOverlay message={message} />}
    </>
  );
}
