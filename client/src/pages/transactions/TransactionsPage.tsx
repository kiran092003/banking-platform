import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Receipt } from 'lucide-react';
import { ColumnFilter } from '@/components/ui/ColumnFilter';
import { RangeFilter, SelectFilter } from '@/components/ui/filterControls';
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

/** The ISO day after `day`, so an inclusive "to" can use an exclusive bound. */
function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() + 1);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function TransactionsPage() {
  const navigate = useNavigate();

  // Every one of these maps to a real query parameter on the backend.
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [status, setStatus] = useState<TransactionStatus | 'ALL'>('ALL');
  const [transactionType, setTransactionType] = useState<TransactionType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<TransactionSortField>('createdAt');
  const [direction, setDirection] = useState<SortDirection>('DESC');

  /*
   * Amount and date bounds, as typed. Kept as strings because that is what the
   * inputs give; they are converted on the way into the query below, where a
   * blank or unparseable box becomes "no bound" rather than a zero.
   *
   * This list is deliberately short. The history endpoint filters on type,
   * status, createdAt and amount, and nothing else, so Sender and Receiver
   * have no funnel: a filter there could only narrow the page on screen and
   * would read as "no results" when the match is two pages away.
   */
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');

  /** A blank or junk box means no bound, never 0. */
  function toAmount(value: string): number | undefined {
    if (value.trim() === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  }

  const query = useTransactions({
    page,
    size,
    status: status === 'ALL' ? undefined : status,
    transactionType: transactionType === 'ALL' ? undefined : transactionType,
    minAmount: toAmount(minAmount),
    maxAmount: toAmount(maxAmount),
    // The backend takes ISO date-times. A date box gives a plain day, so the
    // range runs from the start of `from` to the start of the day AFTER `to`,
    // because createdAtBefore is exclusive and the day itself must be included.
    from: createdFrom ? `${createdFrom}T00:00:00` : undefined,
    to: createdTo ? `${nextDay(createdTo)}T00:00:00` : undefined,
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
  const isFiltered =
    status !== 'ALL' ||
    transactionType !== 'ALL' ||
    minAmount !== '' ||
    maxAmount !== '' ||
    createdFrom !== '' ||
    createdTo !== '';

  function clearAllFilters() {
    setStatus('ALL');
    setTransactionType('ALL');
    setMinAmount('');
    setMaxAmount('');
    setCreatedFrom('');
    setCreatedTo('');
    setPage(0);
  }

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

      {/*
        Status and type used to be selects here. They are column filters now,
        so the funnel marks which column is narrowing the table.
      */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
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
                  onClick={clearAllFilters}
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
                      filter={
                        <ColumnFilter
                          label="Type"
                          isActive={transactionType !== 'ALL'}
                          onClear={() => {
                            setTransactionType('ALL');
                            setPage(0);
                          }}
                        >
                          <SelectFilter
                            label="Transaction type"
                            allLabel="All types"
                            options={[
                              { value: 'TRANSFER', label: 'Transfer' },
                              { value: 'DEPOSIT', label: 'Deposit' },
                              { value: 'WITHDRAWAL', label: 'Withdrawal' },
                            ]}
                            value={transactionType === 'ALL' ? '' : transactionType}
                            onChange={(value) => {
                              setTransactionType((value || 'ALL') as TransactionType | 'ALL');
                              setPage(0);
                            }}
                          />
                        </ColumnFilter>
                      }
                    />
                    {/*
                      No funnel on Sender or Receiver: the history endpoint has
                      no parameter for either, so a filter here could only
                      narrow the rows already on screen.
                    */}
                    <Th>Sender</Th>
                    <Th>Receiver</Th>
                    <SortableTh
                      label="Amount"
                      align="right"
                      isActive={sortBy === 'amount'}
                      direction={direction}
                      onSort={() => toggleSort('amount')}
                      filter={
                        <ColumnFilter
                          label="Amount"
                          isActive={minAmount !== '' || maxAmount !== ''}
                          onClear={() => {
                            setMinAmount('');
                            setMaxAmount('');
                            setPage(0);
                          }}
                        >
                          <RangeFilter
                            type="number"
                            label="Amount"
                            min={minAmount}
                            max={maxAmount}
                            onMinChange={(value) => {
                              setMinAmount(value);
                              setPage(0);
                            }}
                            onMaxChange={(value) => {
                              setMaxAmount(value);
                              setPage(0);
                            }}
                          />
                        </ColumnFilter>
                      }
                    />
                    <SortableTh
                      label="Status"
                      isActive={sortBy === 'status'}
                      direction={direction}
                      onSort={() => toggleSort('status')}
                      filter={
                        <ColumnFilter
                          label="Status"
                          isActive={status !== 'ALL'}
                          onClear={() => {
                            setStatus('ALL');
                            setPage(0);
                          }}
                        >
                          <SelectFilter
                            label="Transaction status"
                            allLabel="All statuses"
                            options={[
                              { value: 'SUCCESS', label: 'Success' },
                              { value: 'PENDING', label: 'Pending' },
                              { value: 'FAILED', label: 'Failed' },
                            ]}
                            value={status === 'ALL' ? '' : status}
                            onChange={(value) => {
                              setStatus((value || 'ALL') as TransactionStatus | 'ALL');
                              setPage(0);
                            }}
                          />
                        </ColumnFilter>
                      }
                    />
                    <SortableTh
                      label="Created"
                      isActive={sortBy === 'createdAt'}
                      direction={direction}
                      onSort={() => toggleSort('createdAt')}
                      filter={
                        <ColumnFilter
                          label="Created"
                          isActive={createdFrom !== '' || createdTo !== ''}
                          onClear={() => {
                            setCreatedFrom('');
                            setCreatedTo('');
                            setPage(0);
                          }}
                        >
                          <RangeFilter
                            type="date"
                            label="Created"
                            min={createdFrom}
                            max={createdTo}
                            onMinChange={(value) => {
                              setCreatedFrom(value);
                              setPage(0);
                            }}
                            onMaxChange={(value) => {
                              setCreatedTo(value);
                              setPage(0);
                            }}
                          />
                        </ColumnFilter>
                      }
                    />
                    <Th align="right">Actions</Th>
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
                      <Td align="right">
                        <Link
                          to={`/transactions/${transaction.id}`}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`View transaction ${transaction.id}`}
                          title="View transaction"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-base text-ink-muted transition-colors hover:bg-surface-2 hover:text-cobalt"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Td>
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
