import { Link, useNavigate } from 'react-router-dom';
import { Eye, Plus, Search, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { AccountStatusBadge } from '@/components/ui/Badge';
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
import { useAuth } from '@/features/auth/useAuth';
import { ColumnFilter } from '@/components/ui/ColumnFilter';
import {
  RangeFilter,
  SelectFilter,
  TextFilter,
} from '@/components/ui/filterControls';
import { useAccounts, useMyAccount } from '@/features/accounts/useAccounts';
import {
  ACCOUNT_STATUS_OPTIONS,
  ACCOUNT_TYPE_OPTIONS,
  useAccountTable,
} from '@/features/accounts/useAccountTable';
import { formatAccountNumber, formatDate } from '@/utils/format';
import { normalizeApiError } from '@/utils/errors';
import type { Account } from '@/types/account';

export default function AccountsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // ADMIN sees every account; a USER can only ever read their own.
  const allAccounts = useAccounts();
  const myAccount = useMyAccount();

  const sourceAccounts: Account[] | undefined = isAdmin
    ? allAccounts.data
    : myAccount.data
      ? [myAccount.data]
      : undefined;

  const isLoading = isAdmin ? allAccounts.isLoading : myAccount.isLoading;
  const isError = isAdmin ? allAccounts.isError : myAccount.isError;
  const error = isAdmin ? allAccounts.error : myAccount.error;
  const refetch = isAdmin ? allAccounts.refetch : myAccount.refetch;

  const normalizedError = isError ? normalizeApiError(error) : null;
  const isMissingAccount = !isAdmin && normalizedError?.status === 404;

  const table = useAccountTable(sourceAccounts);

  function openAccount(id: number) {
    navigate(`/accounts/${id}`);
  }

  return (
    <>
      <PageHeader
        title="Accounts"
        description={
          isAdmin
            ? 'Every account managed on the banking platform'
            : 'Your bank accounts and balances'
        }
        action={
          isAdmin ? (
            <Link to="/accounts/new">
              <Button>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create account
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={table.search}
            onChange={(event) => table.setSearch(event.target.value)}
            placeholder="Search by account number, account ID or user ID"
            aria-label="Search accounts"
            className="h-10 w-full rounded-base border border-outline bg-surface pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-cobalt focus:ring-[3px] focus:ring-cobalt/15"
          />
        </div>

        {/*
          Status and type used to sit here as standalone selects. They now live
          in their own column headers, where the funnel shows which column is
          narrowing the table. This box stays: it searches across the three
          identifying columns at once, which no single column filter does.
        */}
        {table.isFiltered && (
          <Button variant="secondary" size="sm" onClick={table.resetFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <TableFrame>
        {isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : isMissingAccount ? (
          <EmptyState
            icon={Wallet}
            title="No account yet"
            description="An administrator needs to open a bank account for you before you can transact."
          />
        ) : normalizedError ? (
          <ErrorState error={normalizedError} onRetry={() => void refetch()} />
        ) : table.totalElements === 0 ? (
          <EmptyState
            icon={Wallet}
            title={table.isFiltered ? 'No matching accounts' : 'No accounts yet'}
            description={
              table.isFiltered
                ? 'Try adjusting your search or filters.'
                : isAdmin
                  ? 'Create the first account to get started.'
                  : 'An administrator needs to open an account for you.'
            }
            action={
              table.isFiltered ? (
                <Button variant="secondary" size="sm" onClick={table.resetFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <TableScroll className="hidden md:block">
              <Table>
                <Thead>
                  <Tr className="h-10">
                    <SortableTh
                      label="Account number"
                      isActive={table.sortBy === 'accountNumber'}
                      direction={table.direction}
                      onSort={() => table.toggleSort('accountNumber')}
                      filter={
                        <ColumnFilter
                          label="Account number"
                          isActive={table.filters.accountNumber !== ''}
                          onClear={() => table.clearFilters(['accountNumber'])}
                        >
                          <TextFilter
                            label="Account number contains"
                            placeholder="e.g. 4949"
                            value={table.filters.accountNumber}
                            onChange={(value) => table.setFilter('accountNumber', value)}
                          />
                        </ColumnFilter>
                      }
                    />
                    <SortableTh
                      label="Type"
                      isActive={table.sortBy === 'accountType'}
                      direction={table.direction}
                      onSort={() => table.toggleSort('accountType')}
                      filter={
                        <ColumnFilter
                          label="Type"
                          isActive={table.filters.accountType !== ''}
                          onClear={() => table.clearFilters(['accountType'])}
                        >
                          <SelectFilter
                            label="Account type"
                            allLabel="All types"
                            options={ACCOUNT_TYPE_OPTIONS}
                            value={table.filters.accountType}
                            onChange={(value) => table.setFilter('accountType', value)}
                          />
                        </ColumnFilter>
                      }
                    />
                    {isAdmin && (
                      <Th
                        filter={
                          <ColumnFilter
                            label="User ID"
                            isActive={table.filters.userId !== ''}
                            onClear={() => table.clearFilters(['userId'])}
                          >
                            <TextFilter
                              label="User ID contains"
                              placeholder="e.g. 3"
                              value={table.filters.userId}
                              onChange={(value) => table.setFilter('userId', value)}
                            />
                          </ColumnFilter>
                        }
                      >
                        User ID
                      </Th>
                    )}
                    <SortableTh
                      label="Balance"
                      align="right"
                      isActive={table.sortBy === 'balance'}
                      direction={table.direction}
                      onSort={() => table.toggleSort('balance')}
                      filter={
                        <ColumnFilter
                          label="Balance"
                          isActive={
                            table.filters.balanceMin !== '' || table.filters.balanceMax !== ''
                          }
                          onClear={() => table.clearFilters(['balanceMin', 'balanceMax'])}
                        >
                          <RangeFilter
                            type="number"
                            label="Balance"
                            min={table.filters.balanceMin}
                            max={table.filters.balanceMax}
                            onMinChange={(value) => table.setFilter('balanceMin', value)}
                            onMaxChange={(value) => table.setFilter('balanceMax', value)}
                          />
                        </ColumnFilter>
                      }
                    />
                    <SortableTh
                      label="Status"
                      isActive={table.sortBy === 'status'}
                      direction={table.direction}
                      onSort={() => table.toggleSort('status')}
                      filter={
                        <ColumnFilter
                          label="Status"
                          isActive={table.filters.status !== ''}
                          onClear={() => table.clearFilters(['status'])}
                        >
                          <SelectFilter
                            label="Account status"
                            allLabel="All statuses"
                            options={ACCOUNT_STATUS_OPTIONS}
                            value={table.filters.status}
                            onChange={(value) => table.setFilter('status', value)}
                          />
                        </ColumnFilter>
                      }
                    />
                    <SortableTh
                      label="Created"
                      isActive={table.sortBy === 'createdAt'}
                      direction={table.direction}
                      onSort={() => table.toggleSort('createdAt')}
                      filter={
                        <ColumnFilter
                          label="Created"
                          isActive={
                            table.filters.createdFrom !== '' || table.filters.createdTo !== ''
                          }
                          onClear={() => table.clearFilters(['createdFrom', 'createdTo'])}
                        >
                          <RangeFilter
                            type="date"
                            label="Created"
                            min={table.filters.createdFrom}
                            max={table.filters.createdTo}
                            onMinChange={(value) => table.setFilter('createdFrom', value)}
                            onMaxChange={(value) => table.setFilter('createdTo', value)}
                          />
                        </ColumnFilter>
                      }
                    />
                    <Th align="right">Actions</Th>
                  </Tr>
                </Thead>

                <Tbody>
                  {table.rows.map((account) => (
                    <Tr key={account.id} isInteractive onClick={() => openAccount(account.id)}>
                      <Td>
                        <MonoText className="text-ink">
                          {formatAccountNumber(account.accountNumber)}
                        </MonoText>
                      </Td>
                      <Td>{account.accountType}</Td>
                      {isAdmin && (
                        <Td>
                          <MonoText>{account.userId}</MonoText>
                        </Td>
                      )}
                      <Td align="right">
                        <Money value={account.balance} className="font-semibold text-ink" />
                      </Td>
                      <Td>
                        <AccountStatusBadge status={account.status} />
                      </Td>
                      <Td>{formatDate(account.createdAt)}</Td>
                      <Td align="right">
                        <Link
                          to={`/accounts/${account.id}`}
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`View account ${formatAccountNumber(account.accountNumber)}`}
                          title="View account"
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

            {/* Mobile cards — a 7-column ledger is unusable on a phone. */}
            <MobileCardList>
              {table.rows.map((account) => (
                <MobileCardRow key={account.id} onClick={() => openAccount(account.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <MonoText className="text-ink">
                      {formatAccountNumber(account.accountNumber)}
                    </MonoText>
                    <AccountStatusBadge status={account.status} />
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div className="text-[13px] text-ink-muted">
                      <p>{account.accountType}</p>
                      <p className="mt-0.5">Opened {formatDate(account.createdAt)}</p>
                    </div>
                    <Money value={account.balance} className="text-base font-semibold text-ink" />
                  </div>
                </MobileCardRow>
              ))}
            </MobileCardList>

            <Pagination
              page={table.page}
              size={table.size}
              totalElements={table.totalElements}
              totalPages={table.totalPages}
              isFirst={table.isFirst}
              isLast={table.isLast}
              onPageChange={table.setPage}
              onSizeChange={table.setSize}
            />
          </>
        )}
      </TableFrame>
    </>
  );
}
