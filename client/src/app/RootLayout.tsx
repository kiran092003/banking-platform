import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { SessionExpiryListener } from '@/components/common/SessionExpiryListener';
import { GlobalLoader } from '@/components/common/GlobalLoader';

/** Shown only while a route chunk is being fetched. */
function RouteFallback() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="flex min-h-screen items-center justify-center bg-canvas"
    >
      <Loader2 className="h-5 w-5 animate-spin text-ink-subtle" aria-hidden="true" />
    </div>
  );
}

/**
 * Hosts anything that needs router context but renders no layout of its own.
 */
export function RootLayout() {
  return (
    <>
      <SessionExpiryListener />
      {/* Outside Suspense so it survives route-chunk swaps. */}
      <GlobalLoader />
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </>
  );
}
