import { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, Users } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { RoleBadge } from '@/components/ui/Badge';
import { MonoText } from '@/components/common/Money';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Pagination } from '@/components/ui/Pagination';
import {
  MobileCardList,
  MobileCardRow,
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
import { useUpdateUserRole, useUsers } from '@/features/users/useUsers';
import { normalizeApiError } from '@/utils/errors';
import type { Role } from '@/types/auth';
import { ASSIGNABLE_ROLES, type UserSummary } from '@/types/user';

const ROLE_FILTERS: { label: string; value: Role | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Users', value: 'USER' },
  { label: 'Admins', value: 'ADMIN' },
  { label: 'Support', value: 'SUPPORT' },
];

const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((role) => ({ value: role, label: role }));

/**
 * The user directory and role assignment, ADMIN only.
 *
 * Granting ADMIN happens here and nowhere else: registration always creates a
 * USER. The two rules the backend enforces — you cannot change your own role,
 * and the last admin cannot be demoted — are reflected in the UI so an admin
 * sees why an action is unavailable instead of discovering it in a 409.
 */
export default function AdminUsersPage() {
  const { user } = useAuth();

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const params = useMemo(
    () => ({
      page,
      size,
      search,
      role: roleFilter === 'ALL' ? undefined : roleFilter,
    }),
    [page, size, search, roleFilter]
  );

  const query = useUsers(params);
  const updateRole = useUpdateUserRole();

  const [target, setTarget] = useState<UserSummary | null>(null);
  const [pendingRole, setPendingRole] = useState<Role>('USER');

  const data = query.data;
  const rows = data?.users ?? [];
  const isFiltered = search.trim().length > 0 || roleFilter !== 'ALL';

  function openRoleDialog(row: UserSummary) {
    setTarget(row);
    setPendingRole(row.role);
    updateRole.reset();
  }

  function closeRoleDialog() {
    if (updateRole.isPending) return;
    setTarget(null);
    updateRole.reset();
  }

  function submitRoleChange() {
    if (!target) return;

    updateRole.mutate(
      { userId: target.id, role: pendingRole },
      {
        onSuccess: () => {
          setTarget(null);
        },
      }
    );
  }

  /** An admin cannot change their own role — the backend refuses it with a 409. */
  function isSelf(row: UserSummary) {
    return user?.userId === row.id;
  }

  const dialogError = updateRole.isError ? normalizeApiError(updateRole.error) : null;

  return (
    <>
      <PageHeader
        title="Users"
        description="Directory and role assignment across the platform"
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Users' }]}
      />

      <Alert tone="info" title="How a role change takes effect" className="mb-5">
        <p>
          Registration always creates a standard <MonoText>USER</MonoText>. Granting{' '}
          <MonoText>ADMIN</MonoText> here is the only way to create another administrator.
        </p>
        <p className="mt-2">
          The role is carried in the access token, so a promoted user gains admin access
          when their token next refreshes — within 15 minutes, or immediately if they sign
          out and back in.
        </p>
      </Alert>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by username or email"
            aria-label="Search users"
            className="h-10 w-full rounded-base border border-outline bg-surface pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-subtle focus:border-cobalt focus:ring-[3px] focus:ring-cobalt/15"
          />
        </div>

        <div
          role="group"
          aria-label="Filter by role"
          className="inline-flex h-10 items-center gap-0.5 rounded-base bg-surface-2 p-0.5"
        >
          {ROLE_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={roleFilter === option.value}
              onClick={() => {
                setRoleFilter(option.value);
                setPage(0);
              }}
              className={
                roleFilter === option.value
                  ? 'h-9 rounded-[6px] bg-surface px-3 text-[13px] font-medium text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'h-9 rounded-[6px] px-3 text-[13px] text-ink-muted transition-colors hover:text-ink'
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <TableFrame>
        {query.isLoading ? (
          <TableSkeleton rows={6} columns={4} />
        ) : query.isError ? (
          <ErrorState
            error={normalizeApiError(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={isFiltered ? 'No matching users' : 'No users yet'}
            description={
              isFiltered
                ? 'Try adjusting your search or role filter.'
                : 'Registered users will appear here.'
            }
            action={
              isFiltered ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchInput('');
                    setRoleFilter('ALL');
                    setPage(0);
                  }}
                >
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
                    <Th>Username</Th>
                    <Th>Email</Th>
                    <Th>User ID</Th>
                    <Th>Role</Th>
                    <Th align="right">Actions</Th>
                  </Tr>
                </Thead>

                <Tbody>
                  {rows.map((row) => (
                    <Tr key={row.id}>
                      <Td>
                        <span className="font-medium text-ink">{row.username}</span>
                        {isSelf(row) && (
                          <span className="ml-2 text-[13px] text-ink-muted">(you)</span>
                        )}
                      </Td>
                      <Td>{row.email}</Td>
                      <Td>
                        <MonoText>{row.id}</MonoText>
                      </Td>
                      <Td>
                        <RoleBadge role={row.role} />
                      </Td>
                      <Td align="right">
                        {isSelf(row) ? (
                          <span
                            className="text-[13px] text-ink-subtle"
                            title="You cannot change your own role"
                          >
                            Not available
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openRoleDialog(row)}
                            className="text-[13px] font-medium text-cobalt hover:underline"
                          >
                            Change role
                          </button>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableScroll>

            {/* Mobile cards */}
            <MobileCardList>
              {rows.map((row) => (
                <MobileCardRow key={row.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {row.username}
                        {isSelf(row) && (
                          <span className="ml-2 text-[13px] text-ink-muted">(you)</span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-ink-muted">
                        {row.email}
                      </p>
                    </div>
                    <RoleBadge role={row.role} />
                  </div>

                  {!isSelf(row) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => openRoleDialog(row)}
                    >
                      Change role
                    </Button>
                  )}
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

      <Modal
        isOpen={target !== null}
        onClose={closeRoleDialog}
        isDismissDisabled={updateRole.isPending}
        title="Change role"
        description={target ? `${target.username} — ${target.email}` : undefined}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeRoleDialog}
              disabled={updateRole.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submitRoleChange}
              isLoading={updateRole.isPending}
              disabled={target?.role === pendingRole}
            >
              {updateRole.isPending ? 'Saving…' : 'Save role'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={pendingRole}
            onChange={(event) => setPendingRole(event.target.value as Role)}
            hint={
              target?.role === pendingRole ? 'This is the role they already have.' : undefined
            }
          />

          {pendingRole === 'ADMIN' && target?.role !== 'ADMIN' && (
            <Alert tone="warning" title="This grants full administrative access">
              <span className="flex items-start gap-1.5">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                An administrator can read every account, open and close accounts, and
                promote other users to administrator.
              </span>
            </Alert>
          )}

          {target?.role === 'ADMIN' && pendingRole !== 'ADMIN' && (
            <Alert tone="warning" title="This removes administrative access">
              They lose the admin console when their access token next refreshes. The
              backend refuses this if they are the last remaining administrator.
            </Alert>
          )}

          {dialogError && <Alert tone="error">{dialogError.message}</Alert>}
        </div>
      </Modal>
    </>
  );
}
