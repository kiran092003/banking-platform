import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Receipt, Search, User, Wallet } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/features/auth/useAuth';
import { useAccounts, useMyAccount } from '@/features/accounts/useAccounts';
import { useTransactions } from '@/features/transactions/useTransactions';
import { useUserDirectory } from '@/features/users/useUsers';
import { formatAccountNumber, formatAmount } from '@/utils/format';

interface Suggestion {
  key: string;
  icon: typeof Wallet;
  title: string;
  subtitle: string;
  to: string;
}

const MAX_PER_GROUP = 4;

/**
 * The header search box, with live suggestions.
 *
 * It searches what the app already has in cache rather than calling a search
 * endpoint, because there is no such endpoint: accounts come back as one array
 * and transactions are paged. That is a real limit and the footer says so —
 * transactions are matched over the most recent page-full, not the whole
 * ledger, so an exact id also offers a "go straight there" row that works
 * whether or not the transaction is loaded.
 */
export function GlobalSearch() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [term, setTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // An admin sees every account; a user only ever their own.
  const allAccounts = useAccounts();
  const myAccount = useMyAccount();
  const directory = useUserDirectory();

  // The most recent transactions, which is what a header search can offer
  // without a dedicated search endpoint.
  const recentTransactions = useTransactions({ page: 0, size: 50 });

  const accounts = useMemo(() => {
    if (isAdmin) return allAccounts.data ?? [];
    return myAccount.data ? [myAccount.data] : [];
  }, [isAdmin, allAccounts.data, myAccount.data]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const query = term.trim().toLowerCase();
    if (query.length < 1) return [];

    const results: Suggestion[] = [];

    // ---- accounts ----
    for (const account of accounts) {
      if (results.filter((item) => item.key.startsWith('account')).length >= MAX_PER_GROUP) {
        break;
      }

      const matches =
        account.accountNumber.toLowerCase().includes(query) ||
        String(account.id) === query ||
        String(account.userId) === query;

      if (!matches) continue;

      results.push({
        key: `account-${account.id}`,
        icon: Wallet,
        title: formatAccountNumber(account.accountNumber),
        subtitle: `${account.accountType} · ${formatAmount(account.balance)}`,
        to: `/accounts/${account.id}`,
      });
    }

    // ---- transactions ----
    const transactions = recentTransactions.data?.transactions ?? [];
    let transactionCount = 0;

    for (const transaction of transactions) {
      if (transactionCount >= MAX_PER_GROUP) break;

      const matches =
        String(transaction.id).includes(query) ||
        transaction.transactionType.toLowerCase().includes(query) ||
        transaction.status.toLowerCase().includes(query) ||
        String(transaction.amount).includes(query);

      if (!matches) continue;

      transactionCount += 1;

      results.push({
        key: `transaction-${transaction.id}`,
        icon: Receipt,
        title: `#${transaction.id} · ${transaction.transactionType}`,
        subtitle: `${formatAmount(transaction.amount)} · ${transaction.status}`,
        to: `/transactions/${transaction.id}`,
      });
    }

    // ---- users, admin only ----
    if (isAdmin) {
      let userCount = 0;

      for (const user of directory.data ?? []) {
        if (userCount >= MAX_PER_GROUP) break;

        const matches =
          user.username.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query);

        if (!matches) continue;

        userCount += 1;

        results.push({
          key: `user-${user.id}`,
          icon: User,
          title: user.username,
          subtitle: `${user.email} · ${user.role}`,
          to: '/admin/users',
        });
      }
    }

    /*
     * A bare number is very likely a transaction id. Offer to open it directly
     * even when it is not in the loaded page, so the search is not limited to
     * the 50 most recent transactions for the one lookup people actually do.
     */
    if (/^\d+$/.test(query) && !results.some((item) => item.key === `transaction-${query}`)) {
      results.push({
        key: `goto-transaction-${query}`,
        icon: ArrowRight,
        title: `Go to transaction #${query}`,
        subtitle: 'Open by ID',
        to: `/transactions/${query}`,
      });
    }

    return results;
  }, [term, accounts, recentTransactions.data, directory.data, isAdmin]);

  // Close when focus or a click goes elsewhere.
  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen]);

  function go(suggestion: Suggestion) {
    setIsOpen(false);
    setTerm('');
    inputRef.current?.blur();
    navigate(suggestion.to);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = suggestions[Math.min(highlighted, suggestions.length - 1)];
      if (chosen) go(chosen);
    }
  }

  /*
   * Clamped during render rather than reset from an effect: the suggestion
   * list also shrinks when a query resolves, and an effect for that would
   * render once with a cursor pointing past the end.
   */
  const activeIndex = Math.min(highlighted, Math.max(suggestions.length - 1, 0));

  const showPanel = isOpen && term.trim().length > 0;

  return (
    <div ref={containerRef} className="relative hidden max-w-xs flex-1 sm:block">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setHighlighted(0);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search transactions, accounts…"
        aria-label="Search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        className="h-10 w-full rounded-base border border-outline bg-surface pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-cobalt focus:ring-[3px] focus:ring-cobalt/15"
      />

      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-card border border-hairline bg-surface shadow-[var(--shadow-tier3)]"
        >
          {suggestions.length === 0 ? (
            <p className="px-3 py-4 text-[13px] text-ink-muted">
              Nothing matching “{term.trim()}”.
            </p>
          ) : (
            <ul className="max-h-[320px] overflow-y-auto py-1">
              {suggestions.map((suggestion, index) => {
                const Icon = suggestion.icon;

                return (
                  <li key={suggestion.key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseEnter={() => setHighlighted(index)}
                      onClick={() => go(suggestion)}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                        index === activeIndex ? 'bg-surface-2' : 'hover:bg-surface-2'
                      )}
                    >
                      <Icon
                        className="h-4 w-4 shrink-0 text-ink-muted"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {suggestion.title}
                        </span>
                        <span className="block truncate text-[12px] text-ink-muted">
                          {suggestion.subtitle}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="border-t border-hairline px-3 py-2 text-[11px] leading-[15px] text-ink-subtle">
            Searches your accounts and recent transactions. Older transactions are
            reachable by ID.
          </p>
        </div>
      )}
    </div>
  );
}
