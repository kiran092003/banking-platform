import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { TransactionStatusBadge } from '@/components/ui/Badge';
import { DetailList, DetailRow } from '@/components/common/DetailRow';
import { Money, MonoText } from '@/components/common/Money';
import { ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTransaction } from '@/features/transactions/useTransactions';
import { formatDateTime } from '@/utils/format';
import { normalizeApiError } from '@/utils/errors';

export default function TransactionDetailsPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const id = Number(transactionId);
  const isValidId = Number.isInteger(id) && id > 0;

  const query = useTransaction(isValidId ? id : undefined);
  const transaction = query.data;

  return (
    <>
      <PageHeader
        title="Transaction details"
        breadcrumbs={[
          { label: 'Transactions', to: '/transactions' },
          { label: isValidId ? `#${id}` : 'Invalid' },
        ]}
        action={
          <Link to="/transactions">
            <Button variant="secondary">Back to transactions</Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Summary" />
          <CardBody>
            {!isValidId ? (
              <ErrorState
                error={{
                  status: 400,
                  code: null,
                  message: 'That transaction reference is not valid.',
                  isNetworkError: false,
                  isTimeout: false,
                }}
              />
            ) : query.isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-56" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : query.isError ? (
              <ErrorState
                error={normalizeApiError(query.error)}
                onRetry={() => void query.refetch()}
              />
            ) : transaction ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Money
                    value={transaction.amount}
                    className="text-[32px] font-bold leading-10 tracking-[-0.025em] text-ink"
                  />
                  <TransactionStatusBadge status={transaction.status} />
                </div>

                {transaction.status === 'FAILED' && transaction.failureReason && (
                  <Alert tone="error" title="Failure reason" className="mt-4">
                    {transaction.failureReason}
                  </Alert>
                )}

                {transaction.status === 'PENDING' && (
                  <Alert tone="warning" className="mt-4">
                    This transaction is still being processed.
                  </Alert>
                )}

                <DetailList className="mt-5">
                  <DetailRow label="Transaction ID">
                    <MonoText className="text-sm">#{transaction.id}</MonoText>
                  </DetailRow>
                  <DetailRow label="User ID">
                    <MonoText className="text-sm">{transaction.userId}</MonoText>
                  </DetailRow>
                  <DetailRow label="Transaction type">
                    {transaction.transactionType}
                  </DetailRow>
                  <DetailRow label="Sender account">
                    {transaction.senderAccountId ? (
                      <Link
                        to={`/accounts/${transaction.senderAccountId}`}
                        className="font-medium text-cobalt hover:underline"
                      >
                        <MonoText className="text-sm">
                          {transaction.senderAccountId}
                        </MonoText>
                      </Link>
                    ) : (
                      <span className="text-ink-muted">— (deposit)</span>
                    )}
                  </DetailRow>
                  <DetailRow label="Receiver account">
                    {transaction.receiverAccountId ? (
                      <Link
                        to={`/accounts/${transaction.receiverAccountId}`}
                        className="font-medium text-cobalt hover:underline"
                      >
                        <MonoText className="text-sm">
                          {transaction.receiverAccountId}
                        </MonoText>
                      </Link>
                    ) : (
                      <span className="text-ink-muted">— (withdrawal)</span>
                    )}
                  </DetailRow>
                  <DetailRow label="Created">
                    {formatDateTime(transaction.createdAt)}
                  </DetailRow>
                </DetailList>
              </>
            ) : null}
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader
            title="Idempotency"
            description="Guarantees this transaction was applied once"
          />
          <CardBody>
            {query.isLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : transaction ? (
              <>
                <p className="label-badge text-ink-muted">Reference key</p>
                <MonoText className="mt-1.5 block break-all text-[11px] leading-4 text-ink-body">
                  {transaction.idempotencyKey}
                </MonoText>
                <p className="mt-4 text-[13px] leading-[18px] text-ink-muted">
                  The platform records this key against the transaction, so resubmitting the
                  same request returns the original result instead of moving money twice.
                </p>
              </>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
