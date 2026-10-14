import { Link } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { mobileNavToggled } from '@/features/ui/uiSlice';
import { useAuth } from '@/features/auth/useAuth';
import { useUnreadNotificationCount } from '@/features/notifications/useNotifications';
import { GlobalSearch } from './GlobalSearch';

function initials(username: string | undefined): string {
  if (!username) return '–';
  return username.slice(0, 2).toUpperCase();
}

export function Header() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const unreadCount = useUnreadNotificationCount();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-hairline bg-surface/95 px-4 backdrop-blur lg:px-8">
      <button
        type="button"
        onClick={() => dispatch(mobileNavToggled())}
        aria-label="Open navigation menu"
        className="-ml-1 rounded-base p-2 text-ink-body transition-colors hover:bg-surface-2 lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-2">
        <Link
          to="/notifications"
          aria-label={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
          }
          className="relative rounded-base p-2 text-ink-body transition-colors hover:bg-surface-2"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cobalt ring-2 ring-surface" />
          )}
        </Link>

        <div className="flex items-center gap-2.5 border-l border-hairline pl-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-white"
            aria-hidden="true"
          >
            {initials(user?.username)}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="max-w-[140px] truncate text-[13px] font-medium text-ink">
              {user?.username}
            </p>
            <p className="label-badge text-ink-muted">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
