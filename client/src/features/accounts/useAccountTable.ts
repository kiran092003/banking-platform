import { useMemo, useState } from 'react';
import type { Account, AccountStatus, AccountType } from '@/types/account';
import type { SortDirection } from '@/types/transaction';

export type AccountSortField = 'accountNumber' | 'accountType' | 'balance' | 'status' | 'createdAt';

/**
 * One entry per filterable column. Everything is a string because every value
 * comes straight from an <input> or <select>; `''` consistently means "no
 * filter on this column", which keeps the active-filter test trivial.
 */
export interface AccountColumnFilters {
  accountNumber: string;
  accountType: string;
  userId: string;
  balanceMin: string;
  balanceMax: string;
  status: string;
  createdFrom: string;
  createdTo: string;
}

export type AccountFilterKey = keyof AccountColumnFilters;

const EMPTY_FILTERS: AccountColumnFilters = {
  accountNumber: '',
  accountType: '',
  userId: '',
  balanceMin: '',
  balanceMax: '',
  status: '',
  createdFrom: '',
  createdTo: '',
};

const PAGE_SIZE_DEFAULT = 10;

/** Parses a filter box into a number, treating junk as "no bound". */
function toNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Search, filter, sort and pagination for accounts.
 *
 * GET /account/accounts returns a plain array with no pagination, sorting or
 * filtering parameters, so all of it happens client-side over the full list.
 * That is also why every column here can be filtered honestly: the whole data
 * set is in memory, so a column filter narrows all the accounts and not just
 * the page on screen.
 *
 * If the backend ever grows a paged accounts endpoint this hook is the only
 * thing that needs to change — but note that the column filters would then
 * need matching query parameters rather than being applied here.
 */
export function useAccountTable(accounts: Account[] | undefined) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<AccountColumnFilters>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState<AccountSortField>('createdAt');
  const [direction, setDirection] = useState<SortDirection>('DESC');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(PAGE_SIZE_DEFAULT);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    const accountNumberTerm = filters.accountNumber.trim().toLowerCase();
    const userIdTerm = filters.userId.trim();
    const balanceMin = toNumber(filters.balanceMin);
    const balanceMax = toNumber(filters.balanceMax);

    const rows = (accounts ?? []).filter((account) => {
      // ---- column filters ----
      if (filters.status && account.status !== filters.status) return false;
      if (filters.accountType && account.accountType !== filters.accountType) return false;

      if (
        accountNumberTerm &&
        !account.accountNumber.toLowerCase().includes(accountNumberTerm)
      ) {
        return false;
      }

      if (userIdTerm && !String(account.userId).includes(userIdTerm)) return false;

      if (balanceMin !== null && account.balance < balanceMin) return false;
      if (balanceMax !== null && account.balance > balanceMax) return false;

      /*
       * The date boxes give a plain yyyy-mm-dd, and createdAt is an instant.
       * Comparing the date part as text avoids a timezone round trip: both
       * sides are already rendered in the viewer's zone by `toDate`.
       */
      if (filters.createdFrom || filters.createdTo) {
        const created = new Date(account.createdAt);

        if (Number.isNaN(created.getTime())) return false;

        const localDay = [
          created.getFullYear(),
          String(created.getMonth() + 1).padStart(2, '0'),
          String(created.getDate()).padStart(2, '0'),
        ].join('-');

        if (filters.createdFrom && localDay < filters.createdFrom) return false;
        if (filters.createdTo && localDay > filters.createdTo) return false;
      }

      // ---- toolbar search, across the identifying columns ----
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
  }, [accounts, search, filters, sortBy, direction]);

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

  /** Sets one column's filter. Any change returns to the first page. */
  function setFilter(key: AccountFilterKey, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  }

  /** Clears one column. Range columns pass both of their keys. */
  function clearFilters(keys: AccountFilterKey[]) {
    setFilters((current) => {
      const next = { ...current };
      for (const key of keys) next[key] = '';
      return next;
    });
    setPage(0);
  }

  const hasColumnFilter = Object.values(filters).some((value) => value !== '');

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
    filters,
    /** True when filters are hiding results that do exist. */
    isFiltered: search.trim() !== '' || hasColumnFilter,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(0);
    },
    setFilter,
    clearFilters,
    resetFilters: () => {
      setSearch('');
      setFilters(EMPTY_FILTERS);
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

/** Option lists shared by the column filters and anything else that needs them. */
export const ACCOUNT_STATUS_OPTIONS: { value: AccountStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'CLOSED', label: 'Closed' },
];

export const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'CURRENT', label: 'Current' },
];
