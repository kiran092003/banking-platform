import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { mobileNavSet } from '@/features/ui/uiSlice';
import { NotificationSocketProvider } from '@/features/notifications/NotificationSocketProvider';
import { Sidebar, SidebarContent } from './Sidebar';
import { Header } from './Header';

/** Slide-over drawer below `lg`. */
function MobileNav() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.ui.isMobileNavOpen);
  const location = useLocation();

  // Close on navigation so the drawer never covers the page it routed to.
  useEffect(() => {
    dispatch(mobileNavSet(false));
  }, [location.pathname, dispatch]);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') dispatch(mobileNavSet(false));
    }

    document.addEventListener('keydown', onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [isOpen, dispatch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div
        className="absolute inset-0 bg-[rgb(15_23_42_/_0.6)]"
        onClick={() => dispatch(mobileNavSet(false))}
        aria-hidden="true"
      />
      <div className="relative h-full w-[280px] max-w-[85vw] shadow-[var(--shadow-tier4)]">
        <button
          type="button"
          onClick={() => dispatch(mobileNavSet(false))}
          aria-label="Close navigation menu"
          className="absolute right-3 top-4 z-10 rounded-base p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <SidebarContent />
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    // One notification socket for the whole authenticated app.
    <NotificationSocketProvider>
      <div className="min-h-screen bg-canvas">
        <Sidebar />
        <MobileNav />

        <div className="lg:pl-[260px]">
          <Header />
          <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </NotificationSocketProvider>
  );
}
