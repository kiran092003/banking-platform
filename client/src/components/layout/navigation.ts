import {
  ArrowLeftRight,
  Bell,
  LayoutDashboard,
  Receipt,
  Settings,
  Shield,
  Wallet,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { Role } from '@/types/auth';

export interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  /** When set, the item only renders for these roles. */
  roles?: Role[];
  /** Matches nested routes, e.g. /accounts/12 highlights "Accounts". */
  matchPrefix?: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Accounts', to: '/accounts', icon: Wallet, matchPrefix: true },
  { label: 'Transfer', to: '/transfer', icon: ArrowLeftRight },
  { label: 'Transactions', to: '/transactions', icon: Receipt, matchPrefix: true },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Settings', to: '/settings', icon: Settings },
];

export const ADMIN_NAV: NavItem[] = [
  { label: 'Admin', to: '/admin', icon: Shield, roles: ['ADMIN'], matchPrefix: true },
];

/**
 * Hiding a link is a convenience, not a control. Every admin route is also
 * guarded by `RoleRoute`, and the backend authorises each request regardless.
 */
export function visibleNavItems(items: NavItem[], role: Role | undefined): NavItem[] {
  return items.filter((item) => !item.roles || (role && item.roles.includes(role)));
}
