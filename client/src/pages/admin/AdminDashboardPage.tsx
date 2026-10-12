import { Link } from 'react-router-dom';
import { Activity, Ban, CheckCircle2, Receipt, UsersRound, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { StatCardSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';
import { Money } from '@/components/common/Money';
import { AccountStatusBadge } from '@/components/ui/Badge';
import { useAccounts } from '@/features/accounts/useAccounts';
import { normalizeApiError } from '@/utils/errors';
import type { Account, AccountStatus, AccountType } from '@/types/account';

const ADMIN_LINKS = [
  { label: 'Users and roles', to: '/admin/users', icon: UsersRound },
  { label: 'All accounts', to: '/admin/accounts', icon: Wallet },
  { label: 'Transactions', to: '/admin/transactions', icon: Receipt },
  { label: 'System activity', to: '/admin/activity', icon: Activity },
];

function countBy<T extends string>(accounts: Account[], key: (a: Account) => T) {
  return accounts.reduce<Record<string, number>>((acc, account) => {
    const value = key(account);
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

export default function AdminDashboardPage() {
  const accounts = useAccounts();
  const rows = accounts.data ?? [];

  const totalBalance = rows.reduce((sum, account) => sum + (account.balance ?? 0), 0);
  const byStatus = countBy<AccountStatus>(rows, (a) => a.status);
  const byType = countBy<AccountType>(rows, (a) => a.accountType);

  return (
    <>
      <PageHeader
        title="Admin dashboard"
        description="Platform-wide position across all managed accounts"
        breadcrumbs={[{ label: 'Admin' }]}
      />

      {accounts.isError ? (
        <Card>
          <ErrorState
            error={normalizeApiError(accounts.error)}
            onRetry={() => void accounts.refetch()}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {accounts.isLoading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  label="Total balance held"
                  value={<Money value={totalBalance} />}
                  sublabel="Across every account"
                  icon={Wallet}
                  accent
                />
                <StatCard
                  label="Total accounts"
                  value={rows.length}
                  sublabel="Opened on the platform"
                  icon={Wallet}
                />
                <StatCard
                  label="Active accounts"
                  value={byStatus.ACTIVE ?? 0}
                  sublabel="Able to transact"
                  icon={CheckCircle2}
                />
                <StatCard
                  label="Closed or blocked"
                  value={(byStatus.CLOSED ?? 0) + (byStatus.BLOCKED ?? 0)}
                  sublabel="Restricted accounts"
                  icon={Ban}
                />
              </>
            )}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader title="Accounts by status" />
              <CardBody className="space-y-3">
                {(['ACTIVE', 'BLOCKED', 'CLOSED'] as AccountStatus[]).map((status) => {
                  const count = byStatus[status] ?? 0;
                  const percentage = rows.length > 0 ? (count / rows.length) * 100 : 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between gap-2">
                        <AccountStatusBadge status={status} />
                        <span className="tnum text-sm font-semibold text-ink">{count}</span>
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-cobalt"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Accounts by type" />
              <CardBody className="space-y-3">
                {(['SAVINGS', 'CURRENT'] as AccountType[]).map((type) => {
                  const count = byType[type] ?? 0;
                  const percentage = rows.length > 0 ? (count / rows.length) * 100 : 0;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium text-ink-body">{type}</span>
                        <span className="tnum text-sm font-semibold text-ink">{count}</span>
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-sky"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Administration" />
              <CardBody className="space-y-2">
                {ADMIN_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-center gap-3 rounded-base border border-hairline px-3 py-2.5 transition-colors hover:border-outline hover:bg-canvas"
                  >
                    <link.icon className="h-4 w-4 text-cobalt" aria-hidden="true" />
                    <span className="text-[13px] font-medium text-ink">{link.label}</span>
                  </Link>
                ))}

                <Link to="/accounts/new" className="block pt-2">
                  <Button fullWidth size="sm">
                    Create account
                  </Button>
                </Link>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
