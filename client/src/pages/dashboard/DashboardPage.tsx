import { Link } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CheckCircle2,
  Receipt,
  Wallet,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { StatCardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { AccountStatusBadge, TransactionStatusBadge } from '@/components/ui/Badge';
import { Money, MonoText } from '@/components/common/Money';
import { useAuth } from '@/features/auth/useAuth';
import { useAccounts, useMyAccount } from '@/features/accounts/useAccounts';
import { useTransactions } from '@/features/transactions/useTransactions';
import { formatAccountNumber, formatDateTime } from '@/utils/format';
import { normalizeApiError } from '@/utils/errors';
import type { Transaction } from '@/types/transaction';

const QUICK_ACTIONS = [
  { label: 'Transfer Money', to: '/transfer', icon: ArrowLeftRight },
  { label: 'Deposit', to: '/transfer?type=DEPOSIT', icon: ArrowDownToLine },
  { label: 'Withdraw', to: '/transfer?type=WITHDRAWAL', icon: ArrowUpFromLine },
  { label: 'View Transactions', to: '/transactions', icon: Receipt },
  { label: 'View Accounts', to: '/accounts', icon: Wallet },
];

function RecentTransactionRow({ transaction }: { transaction: Transaction }) {
  return (
    <Link
      to={`/transactions/${transaction.id}`}
      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-canvas"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">
            {transaction.transactionType}
          </span>
          <TransactionStatusBadge status={transaction.status} />
        </div>
        <p className="mt-0.5 truncate text-[13px] text-ink-muted">
          <MonoText>TXN #{transaction.id}</MonoText>
          <span className="mx-1.5">·</span>
          {formatDateTime(transaction.createdAt)}
        </p>
      </div>
      <Money value={transaction.amount} className="shrink-0 text-sm font-semibold" />
    </Link>
  );
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();

  const myAccount = useMyAccount();
  // ADMIN additionally gets a platform-wide view; the backend rejects this for USER.
  const allAccounts = useAccounts();
  const recent = useTransactions({ page: 0, size: 5, sortBy: 'createdAt', direction: 'DESC' });

  const accountsForTotals = isAdmin ? allAccounts.data : myAccount.data ? [myAccount.data] : [];
  const totalBalance = (accountsForTotals ?? []).reduce(
    (sum, account) => sum + (account.balance ?? 0),
    0
  );
  const accountCount = accountsForTotals?.length ?? 0;

  const transactions = recent.data?.transactions ?? [];
  const successCount = transactions.filter((t) => t.status === 'SUCCESS').length;
  const failedCount = transactions.filter((t) => t.status === 'FAILED').length;

  const isBalanceLoading = isAdmin ? allAccounts.isLoading : myAccount.isLoading;
  const balanceError = isAdmin ? allAccounts.error : myAccount.error;

  // A user with no account yet gets a 404 — that is a legitimate empty state,
  // not a failure worth shouting about.
  const hasNoAccount =
    !isAdmin && myAccount.isError && normalizeApiError(myAccount.error).status === 404;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.username ?? ''}`}
        description="Here is the current position across your banking profile."
      />

      {hasNoAccount && (
        <Alert tone="info" title="No account yet" className="mb-6">
          You do not have a bank account on the platform. An administrator needs to open one
          before you can transfer, deposit or withdraw.
        </Alert>
      )}

      {/* Metric ribbon */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isBalanceLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label={isAdmin ? 'Total balance (platform)' : 'Total balance'}
              value={
                balanceError && !hasNoAccount ? '—' : <Money value={totalBalance} />
              }
              sublabel={isAdmin ? 'Across all managed accounts' : 'Available to transact'}
              icon={Wallet}
              accent
            />
            <StatCard
              label="Accounts"
              value={balanceError && !hasNoAccount ? '—' : accountCount}
              sublabel={isAdmin ? 'Managed on the platform' : 'Linked to your profile'}
              icon={Wallet}
            />
            <StatCard
              label="Successful (recent)"
              value={recent.isLoading ? '—' : successCount}
              sublabel="Of your last 5 transactions"
              icon={CheckCircle2}
            />
            <StatCard
              label="Failed (recent)"
              value={recent.isLoading ? '—' : failedCount}
              sublabel="Of your last 5 transactions"
              icon={XCircle}
            />
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-6">
        <h2 className="label-badge mb-3 text-ink-muted">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="flex items-center gap-3 rounded-card border border-hairline bg-surface p-4 shadow-[var(--shadow-tier1)] transition-colors hover:border-outline hover:bg-canvas"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-base bg-surface-2">
                <action.icon className="h-4 w-4 text-cobalt" aria-hidden="true" />
              </div>
              <span className="text-[13px] font-semibold text-ink">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent transactions */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent transactions"
            description="Your five most recent ledger movements"
            action={
              <Link to="/transactions">
                <Button variant="secondary" size="sm">
                  View all
                </Button>
              </Link>
            }
          />

          {recent.isLoading ? (
            <TableSkeleton rows={5} columns={3} />
          ) : recent.isError ? (
            <ErrorState
              error={normalizeApiError(recent.error)}
              onRetry={() => void recent.refetch()}
            />
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Once you transfer, deposit or withdraw, activity will appear here."
              action={
                <Link to="/transfer">
                  <Button size="sm">Make a transfer</Button>
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-surface-2">
              {transactions.map((transaction) => (
                <RecentTransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </Card>

        {/* Account summary */}
        <Card>
          <CardHeader title="Account summary" />

          {isBalanceLoading ? (
            <div className="p-5">
              <TableSkeleton rows={2} columns={2} />
            </div>
          ) : hasNoAccount || accountCount === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No accounts"
              description={
                isAdmin
                  ? 'No accounts have been opened on the platform yet.'
                  : 'An administrator needs to open an account for you.'
              }
            />
          ) : balanceError ? (
            <ErrorState error={normalizeApiError(balanceError)} />
          ) : (
            <div className="divide-y divide-surface-2">
              {(accountsForTotals ?? []).slice(0, 5).map((account) => (
                <div key={account.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <MonoText className="text-ink">
                      {formatAccountNumber(account.accountNumber)}
                    </MonoText>
                    <AccountStatusBadge status={account.status} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[13px] text-ink-muted">{account.accountType}</span>
                    <Money value={account.balance} className="text-sm font-semibold" />
                  </div>
                </div>
              ))}

              {accountCount > 5 && (
                <div className="px-5 py-3">
                  <Link
                    to="/accounts"
                    className="text-[13px] font-medium text-cobalt hover:underline"
                  >
                    View all {accountCount} accounts
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
