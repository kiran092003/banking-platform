import { NavLink } from 'react-router-dom';
import { Landmark, LogOut } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth, useLogout } from '@/features/auth/useAuth';
import { ADMIN_NAV, PRIMARY_NAV, visibleNavItems, type NavItem } from './navigation';

function NavSection({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={!item.matchPrefix}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-base px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-white/10 font-semibold text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const logout = useLogout();

  const primary = visibleNavItems(PRIMARY_NAV, user?.role);
  const admin = visibleNavItems(ADMIN_NAV, user?.role);

  return (
    <div className="flex h-full flex-col bg-navy">
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-base bg-cobalt">
          <Landmark className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <span className="text-[15px] font-semibold text-white">Banking Platform</span>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
        <NavSection items={primary} onNavigate={onNavigate} />

        {admin.length > 0 && (
          <>
            <p className="label-badge mt-6 mb-2 px-3 text-slate-500">Administration</p>
            <NavSection items={admin} onNavigate={onNavigate} />
          </>
        )}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 px-3 py-1">
          <p className="truncate text-sm font-medium text-white">{user?.username}</p>
          <p className="label-badge text-slate-400">{user?.role}</p>
        </div>
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="flex w-full items-center gap-3 rounded-base px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-60"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          {logout.isPending ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

/** Fixed 260px rail on desktop. */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] lg:block">
      <SidebarContent />
    </aside>
  );
}
