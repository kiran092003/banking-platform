import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { TransactionStatusBadge } from '@/components/ui/Badge';
import { Money, MonoText } from '@/components/common/Money';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import {
  MobileCardList,
  MobileCardRow,
  SortableTh,
  Table,
  TableFrame,
  TableScroll,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@/components/ui/Table';
import { useTransactions } from '@/features/transactions/useTransactions';
import { formatDateTime } from '@/utils/format';
import { normalizeApiError } from '@/utils/errors';
import type {
  SortDirection,
  TransactionSortField,
  TransactionStatus,
  TransactionType,
} from '@/types/transaction';

export default function TransactionsPage() {
  const navigate = useNavigate();

  // Every one of these maps to a real query parameter on the backend.
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [status, setStatus] = useState<TransactionStatus | 'ALL'>('ALL');
  const [transactionType, setTransactionType] = useState<TransactionType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<TransactionSortField>('createdAt');
  const [direction, setDirection] = useState<SortDirection>('DESC');

  const query = useTransactions({
    page,
    size,
    status: status === 'ALL' ? undefined : status,
    transactionType: transactionType === 'ALL' ? undefined : transactionType,
    sortBy,
    direction,
  });

  function toggleSort(field: TransactionSortField) {
    if (field === sortBy) {
      setDirection((current) => (current === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      setDirection('DESC');
    }
    setPage(0);
  }

  const data = query.data;
  const transactions = data?.transactions ?? [];
  const isFiltered = status !== 'ALL' || transactionType !== 'ALL';

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Your complete transaction history"
        action={
          <Link to="/transfer">
            <Button>New transfer</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as TransactionStatus | 'ALL');
            setPage(0);
          }}
          aria-label="Filter by status"
          className="h-10 rounded-base border border-outline bg-surface px-3 text-sm text-ink outline-none focus:border-cobalt focus:ring-[3px] focus:ring-cobalt/15"
        >
          <option value="ALL">All statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>

        <select
          value={transactionType}
          onChange={(event) => {
            setTransactionType(event.target.value as TransactionType | 'ALL');
            setPage(0);
          }}
          aria-label="Filter by transaction type"
          className="h-10 rounded-base border border-outline bg-surface px-3 text-sm text-ink outline-none focus:border-cobalt focus:ring-[3px] focus:ring-cobalt/15"
        >
          <option value="ALL">All types</option>
          <option value="TRANSFER">Transfer</option>
          <option value="DEPOSIT">Deposit</option>
          <option value="WITHDRAWAL">Withdrawal</option>
        </select>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus('ALL');
              setTransactionType('ALL');
              setPage(0);
            }}
          >
            Clear filters
          </Button>
        )}

        {/* Refetching a page keeps the old rows visible, so flag the update. */}
        {query.isFetching && !query.isLoading && (
          <span className="text-[13px] text-ink-muted">Updating…</span>
        )}
      </div>

      <TableFrame>
        {query.isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : query.isError ? (
          <ErrorState
            error={normalizeApiError(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={isFiltered ? 'No matching transactions' : 'No transactions yet'}
            description={
              isFiltered
                ? 'Try adjusting or clearing your filters.'
                : 'Once you transfer, deposit or withdraw, your activity will appear here.'
            }
            action={
              isFiltered ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setStatus('ALL');
                    setTransactionType('ALL');
                    setPage(0);
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Link to="/transfer">
                  <Button size="sm">Make a transfer</Button>
                </Link>
              )
            }
          />
        ) : (
          <>
            <TableScroll className="hidden md:block">
              <Table>
                <Thead>
                  <Tr className="h-10">
                    <SortableTh
                      label="ID"
                      isActive={sortBy === 'id'}
                      direction={direction}
                      onSort={() => toggleSort('id')}
                    />
                    <SortableTh
                      label="Type"
                      isActive={sortBy === 'transactionType'}
                      direction={direction}
                      onSort={() => toggleSort('transactionType')}
                    />
                    <Th>Sender</Th>
                    <Th>Receiver</Th>
                    <SortableTh
                      label="Amount"
                      align="right"
                      isActive={sortBy === 'amount'}
                      direction={direction}
                      onSort={() => toggleSort('amount')}
                    />
                    <SortableTh
                      label="Status"
                      isActive={sortBy === 'status'}
                      direction={direction}
                      onSort={() => toggleSort('status')}
                    />
                    <SortableTh
                      label="Created"
                      isActive={sortBy === 'createdAt'}
                      direction={direction}
                      onSort={() => toggleSort('createdAt')}
                    />
                  </Tr>
                </Thead>

                <Tbody>
                  {transactions.map((transaction) => (
                    <Tr
                      key={transaction.id}
                      isInteractive
                      onClick={() => navigate(`/transactions/${transaction.id}`)}
                    >
                      <Td>
                        <MonoText className="text-ink">#{transaction.id}</MonoText>
                      </Td>
                      <Td>{transaction.transactionType}</Td>
                      <Td>
                        <MonoText>{transaction.senderAccountId ?? '—'}</MonoText>
                      </Td>
                      <Td>
                        <MonoText>{transaction.receiverAccountId ?? '—'}</MonoText>
                      </Td>
                      <Td align="right">
                        <Money
                          value={transaction.amount}
                          className="font-semibold text-ink"
                        />
                      </Td>
                      <Td>
                        <TransactionStatusBadge status={transaction.status} />
                      </Td>
                      <Td>{formatDateTime(transaction.createdAt)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableScroll>

            <MobileCardList>
              {transactions.map((transaction) => (
                <MobileCardRow
                  key={transaction.id}
                  onClick={() => navigate(`/transactions/${transaction.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        {transaction.transactionType}
                      </p>
                      <MonoText className="mt-0.5 block text-ink-muted">
                        #{transaction.id}
                      </MonoText>
                    </div>
                    <TransactionStatusBadge status={transaction.status} />
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="text-[13px] text-ink-muted">
                      {formatDateTime(transaction.createdAt)}
                    </p>
                    <Money
                      value={transaction.amount}
                      className="text-base font-semibold text-ink"
                    />
                  </div>
                </MobileCardRow>
              ))}
            </MobileCardList>

            {data && (
              <Pagination
                page={data.page}
                size={data.size}
                totalElements={data.totalElements}
                totalPages={data.totalPages}
                isFirst={data.first}
                isLast={data.last}
                onPageChange={setPage}
                onSizeChange={(value) => {
                  setSize(value);
                  setPage(0);
                }}
              />
            )}
          </>
        )}
      </TableFrame>
    </>
  );
}
