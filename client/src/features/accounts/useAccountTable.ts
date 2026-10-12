import { useMemo, useState } from 'react';
import type { Account, AccountStatus, AccountType } from '@/types/account';
import type { SortDirection } from '@/types/transaction';

export type AccountSortField = 'accountNumber' | 'accountType' | 'balance' | 'status' | 'createdAt';

const PAGE_SIZE_DEFAULT = 10;

/**
 * Search, filter, sort and pagination for accounts.
 *
 * GET /account/accounts returns a plain array with no pagination, sorting or
 * filtering parameters, so all of it happens client-side over the full list.
 * If the backend ever grows a paged accounts endpoint this hook is the only
 * thing that needs to change.
 */
export function useAccountTable(accounts: Account[] | undefined) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<AccountType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<AccountSortField>('createdAt');
  const [direction, setDirection] = useState<SortDirection>('DESC');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(PAGE_SIZE_DEFAULT);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    const rows = (accounts ?? []).filter((account) => {
      if (statusFilter !== 'ALL' && account.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && account.accountType !== typeFilter) return false;
      if (!term) return true;

      return (
        account.accountNumber.toLowerCase().includes(term) ||
        String(account.id).includes(term) ||
        String(account.userId).includes(term)
      );
    });

    const sorted = [...rows].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'balance':
          comparison = a.balance - b.balance;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        default:
          comparison = String(a[sortBy]).localeCompare(String(b[sortBy]));
      }

      return direction === 'ASC' ? comparison : -comparison;
    });

    return sorted;
  }, [accounts, search, statusFilter, typeFilter, sortBy, direction]);

  const totalElements = filtered.length;
  const totalPages = Math.ceil(totalElements / size);
  // Clamp so deleting or filtering never strands the user on an empty page.
  const safePage = Math.min(page, Math.max(totalPages - 1, 0));
  const rows = filtered.slice(safePage * size, safePage * size + size);

  function toggleSort(field: AccountSortField) {
    if (field === sortBy) {
      setDirection((current) => (current === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      setDirection('ASC');
    }
    setPage(0);
  }

  return {
    rows,
    totalElements,
    totalPages,
    page: safePage,
    size,
    isFirst: safePage === 0,
    isLast: safePage >= totalPages - 1,
    sortBy,
    direction,
    search,
    statusFilter,
    typeFilter,
    /** True when filters are hiding results that do exist. */
    isFiltered: search.trim() !== '' || statusFilter !== 'ALL' || typeFilter !== 'ALL',
    setSearch: (value: string) => {
      setSearch(value);
      setPage(0);
    },
    setStatusFilter: (value: AccountStatus | 'ALL') => {
      setStatusFilter(value);
      setPage(0);
    },
    setTypeFilter: (value: AccountType | 'ALL') => {
      setTypeFilter(value);
      setPage(0);
    },
    setPage,
    setSize: (value: number) => {
      setSize(value);
      setPage(0);
    },
    toggleSort,
  };
}
