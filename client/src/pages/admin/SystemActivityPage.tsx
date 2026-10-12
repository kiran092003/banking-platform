import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { DetailList, DetailRow } from '@/components/common/DetailRow';
import { Money, MonoText } from '@/components/common/Money';
import { useAccounts } from '@/features/accounts/useAccounts';
import { formatDateTime } from '@/utils/format';
import { normalizeApiError } from '@/utils/errors';

/**
 * Derived from the account data the backend actually exposes. There is no
 * audit-log or event-stream endpoint, so nothing here is invented — the recent
 * activity below is account openings ordered by their real `createdAt`.
 */
export default function SystemActivityPage() {
  const accounts = useAccounts();
  const rows = accounts.data ?? [];

  const recentlyOpened = [...rows]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return (
    <>
      <PageHeader
        title="System activity"
        description="Platform state derived from the account service"
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'System activity' }]}
      />

      <Alert tone="info" className="mb-5">
        The platform exposes no audit-log or event-stream API. This view is built from the
        account data the backend does return — account openings ordered by their recorded
        creation time. Kafka transaction events are consumed by the notification service but
        are not readable over HTTP.
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recently opened accounts"
            description="Most recent account creations on the platform"
          />

          {accounts.isLoading ? (
            <TableSkeleton rows={6} columns={3} />
          ) : accounts.isError ? (
            <ErrorState
              error={normalizeApiError(accounts.error)}
              onRetry={() => void accounts.refetch()}
            />
          ) : (
            <ul className="divide-y divide-surface-2">
              {recentlyOpened.map((account) => (
                <li key={account.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      Account opened{' '}
                      <MonoText className="text-ink-muted">
                        {account.accountNumber}
                      </MonoText>
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-muted">
                      {account.accountType} · user{' '}
                      <MonoText>{account.userId}</MonoText> ·{' '}
                      {formatDateTime(account.createdAt)}
                    </p>
                  </div>
                  <Money value={account.balance} className="shrink-0 text-sm font-semibold" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader title="Service topology" description="As configured in the gateway" />
          <CardBody>
            <DetailList>
              <DetailRow label="API Gateway">
                <Badge tone="info">:8080</Badge>
              </DetailRow>
              <DetailRow label="Auth service">
                <MonoText className="text-sm">/auth/**</MonoText>
              </DetailRow>
              <DetailRow label="Account service">
                <MonoText className="text-sm">/account/**</MonoText>
              </DetailRow>
              <DetailRow label="Transaction service">
                <MonoText className="text-sm">/transaction/**</MonoText>
              </DetailRow>
              <DetailRow label="Notification service">
                <Badge tone="neutral">Kafka consumer only</Badge>
              </DetailRow>
            </DetailList>

            <p className="mt-4 text-[13px] leading-[18px] text-ink-muted">
              The browser only ever talks to the gateway. Individual services are never
              addressed directly.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
