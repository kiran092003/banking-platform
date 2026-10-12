import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Receipt, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { AccountStatusBadge, TransactionStatusBadge } from '@/components/ui/Badge';
import { DetailList, DetailRow } from '@/components/common/DetailRow';
import { Money, MonoText } from '@/components/common/Money';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/useAuth';
import { useAccount, useCloseAccount, useMyAccount } from '@/features/accounts/useAccounts';
import { useTransactions } from '@/features/transactions/useTransactions';
import { formatAccountNumber, formatDateTime } from '@/utils/format';
import { normalizeApiError } from '@/utils/errors';
import { MAX_PAGE_SIZE } from '@/types/transaction';

export default function AccountDetailsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();

  const id = Number(accountId);
  const isValidId = Number.isInteger(id) && id > 0;

  // ADMIN can read any account by id; a USER can only read their own.
  const adminAccount = useAccount(isAdmin && isValidId ? id : undefined);
  const myAccount = useMyAccount();

  const account = isAdmin ? adminAccount.data : myAccount.data;
  const isLoading = isAdmin ? adminAccount.isLoading : myAccount.isLoading;
  const error = isAdmin ? adminAccount.error : myAccount.error;

  // A USER may only view their own account, whatever id is in the URL.
  const isForbiddenForUser = !isAdmin && account !== undefined && account.id !== id;

  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const closeAccount = useCloseAccount();

  /**
   * Transaction history is scoped server-side to the caller, so this returns
   * the signed-in user's transactions. We filter to the ones touching this
   * account. An admin viewing someone else's account therefore cannot see its
   * history — the backend offers no per-account history endpoint.
   */
  const history = useTransactions({
    page: 0,
    size: MAX_PAGE_SIZE,
    sortBy: 'createdAt',
    direction: 'DESC',
  });

  const isOwnAccount = account !== undefined && account.userId === user?.userId;

  const accountTransactions = (history.data?.transactions ?? []).filter(
    (transaction) =>
      transaction.senderAccountId === account?.id ||
      transaction.receiverAccountId === account?.id
  );

  if (!isValidId) {
    return (
      <>
        <PageHeader title="Account" breadcrumbs={[{ label: 'Accounts', to: '/accounts' }]} />
        <Card>
          <ErrorState
            error={{
              status: 400,
              code: null,
              message: 'That account reference is not valid.',
              isNetworkError: false,
              isTimeout: false,
            }}
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Account details"
        breadcrumbs={[{ label: 'Accounts', to: '/accounts' }, { label: `#${id}` }]}
        action={
          isAdmin && account && account.status !== 'CLOSED' ? (
            <Button variant="destructive" onClick={() => setIsCloseOpen(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Close account
            </Button>
          ) : undefined
        }
      />

      {closeAccount.isError && (
        <Alert tone="error" className="mb-4">
          {normalizeApiError(closeAccount.error).message}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Overview" />
          <CardBody>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : isForbiddenForUser ? (
              <ErrorState
                error={{
                  status: 403,
                  code: null,
                  message: 'You can only view your own account.',
                  isNetworkError: false,
                  isTimeout: false,
                }}
              />
            ) : error ? (
              <ErrorState error={normalizeApiError(error)} />
            ) : account ? (
              <>
                <p className="label-badge text-ink-muted">Current balance</p>
                <Money
                  value={account.balance}
                  className="mt-1.5 block text-[32px] font-bold leading-10 tracking-[-0.025em] text-ink"
                />

                <div className="mt-5">
                  <DetailList>
                    <DetailRow label="Account number">
                      <MonoText className="text-sm">
                        {formatAccountNumber(account.accountNumber)}
                      </MonoText>
                    </DetailRow>
                    <DetailRow label="Account ID">
                      <MonoText className="text-sm">{account.id}</MonoText>
                    </DetailRow>
                    <DetailRow label="User ID">
                      <MonoText className="text-sm">{account.userId}</MonoText>
                    </DetailRow>
                    <DetailRow label="Account type">{account.accountType}</DetailRow>
                    <DetailRow label="Status">
                      <AccountStatusBadge status={account.status} />
                    </DetailRow>
                    <DetailRow label="Opened">{formatDateTime(account.createdAt)}</DetailRow>
                  </DetailList>
                </div>
              </>
            ) : null}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Transaction history"
            description={
              isOwnAccount
                ? 'Movements involving this account'
                : 'Only available for your own account'
            }
            action={
              <Link to="/transactions">
                <Button variant="secondary" size="sm">
                  All transactions
                </Button>
              </Link>
            }
          />

          {!isOwnAccount && account ? (
            <EmptyState
              icon={Receipt}
              title="History not available"
              description="Transaction history is scoped to the signed-in user by the backend, so another user's account history cannot be shown here."
            />
          ) : history.isLoading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : history.isError ? (
            <ErrorState
              error={normalizeApiError(history.error)}
              onRetry={() => void history.refetch()}
            />
          ) : accountTransactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions"
              description="This account has no recorded movements yet."
            />
          ) : (
            <div className="divide-y divide-surface-2">
              {accountTransactions.slice(0, 15).map((transaction) => {
                const isOutgoing = transaction.senderAccountId === account?.id;
                return (
                  <button
                    key={transaction.id}
                    type="button"
                    onClick={() => navigate(`/transactions/${transaction.id}`)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-canvas"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
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
                    <Money
                      value={isOutgoing ? -transaction.amount : transaction.amount}
                      signed
                      className="shrink-0 text-sm font-semibold"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Closing an account is destructive and irreversible — always confirmed. */}
      <Modal
        isOpen={isCloseOpen}
        onClose={() => setIsCloseOpen(false)}
        isDismissDisabled={closeAccount.isPending}
        title="Close this account?"
        description="This is a logical closure and cannot be undone."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setIsCloseOpen(false)}
              disabled={closeAccount.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={closeAccount.isPending}
              onClick={() =>
                closeAccount.mutate(id, {
                  onSuccess: () => {
                    setIsCloseOpen(false);
                    navigate('/accounts', { replace: true });
                  },
                })
              }
            >
              {closeAccount.isPending ? 'Closing…' : 'Close account'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert tone="warning" title="This action is irreversible">
            Once closed, the account can no longer send or receive money.
          </Alert>

          {account && (
            <DetailList>
              <DetailRow label="Account number">
                <MonoText className="text-sm">
                  {formatAccountNumber(account.accountNumber)}
                </MonoText>
              </DetailRow>
              <DetailRow label="Remaining balance">
                <Money value={account.balance} />
              </DetailRow>
            </DetailList>
          )}

          {account && account.balance > 0 && (
            <Alert tone="error" title="This account still holds a balance">
              Transfer the remaining funds before closing it.
            </Alert>
          )}
        </div>
      </Modal>
    </>
  );
}
