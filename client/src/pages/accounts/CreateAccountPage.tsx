import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Info } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardBody, CardFooter } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { MonoText } from '@/components/common/Money';
import { useAccounts, useCreateAccount } from '@/features/accounts/useAccounts';
import { useUserDirectory } from '@/features/users/useUsers';
import { normalizeApiError } from '@/utils/errors';
import { formatAccountNumber } from '@/utils/format';

/**
 * AccountRequestDTO accepts exactly two fields: userId and accountType.
 * Account number and opening balance are assigned by the service.
 */
const createAccountSchema = z.object({
  /*
   * The picker's option values are user ids, so this stays a string (a <select>
   * value always is) and is parsed on submit. The numeric checks are a safety
   * net rather than input validation — the value can only come from an option
   * this page rendered.
   */
  userId: z
    .string()
    .trim()
    .min(1, 'Select a user')
    .refine((value) => /^\d+$/.test(value), 'Select a user')
    .refine((value) => Number(value) > 0, 'Select a user'),
  accountType: z.enum(['SAVINGS', 'CURRENT']),
});

type CreateAccountValues = z.infer<typeof createAccountSchema>;

export default function CreateAccountPage() {
  const navigate = useNavigate();
  const createAccount = useCreateAccount();

  /*
   * The picker lists users by name instead of making an admin look an id up in
   * the database. Existing accounts are loaded alongside so users who already
   * hold one can be left out: account-service rejects a second account with a
   * 409 (existsByUserId, regardless of the account's status), so offering them
   * would only produce a guaranteed failure.
   */
  const directory = useUserDirectory();
  const accounts = useAccounts();

  const { options: userOptions, withAccountCount } = useMemo(() => {
    const users = directory.data ?? [];
    const takenUserIds = new Set((accounts.data ?? []).map((account) => account.userId));

    const selectable = users.filter((user) => !takenUserIds.has(user.id));

    return {
      options: selectable.map((user) => ({
        // Value is the id the API wants; the label is what the admin reads.
        value: String(user.id),
        label: `${user.username} — ${user.email}`,
      })),
      withAccountCount: users.length - selectable.length,
    };
  }, [directory.data, accounts.data]);

  const isLoadingPicker = directory.isLoading || accounts.isLoading;
  const pickerError = directory.isError
    ? normalizeApiError(directory.error)
    : accounts.isError
      ? normalizeApiError(accounts.error)
      : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAccountValues>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: { userId: '', accountType: 'SAVINGS' },
  });

  const onSubmit = handleSubmit((values) => {
    createAccount.mutate({
      userId: Number(values.userId),
      accountType: values.accountType,
    });
  });

  const submitError = createAccount.isError ? normalizeApiError(createAccount.error) : null;
  const created = createAccount.data;

  return (
    <>
      <PageHeader
        title="Create account"
        description="Open a new bank account for an existing platform user"
        breadcrumbs={[{ label: 'Accounts', to: '/accounts' }, { label: 'Create account' }]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <Card>
          <form onSubmit={onSubmit} noValidate>
            <CardBody className="space-y-4">
              {submitError && (
                <Alert tone="error" title="Could not create account">
                  {submitError.status === 409
                    ? 'An account already exists for this user.'
                    : submitError.message}
                </Alert>
              )}

              {pickerError && (
                <Alert tone="error" title="Could not load the user list">
                  {pickerError.message}
                </Alert>
              )}

              <Select
                label="Account holder"
                placeholder={
                  isLoadingPicker
                    ? 'Loading users…'
                    : userOptions.length === 0
                      ? 'No users available'
                      : 'Select a user'
                }
                options={userOptions}
                disabled={isLoadingPicker || userOptions.length === 0}
                hint={
                  withAccountCount > 0
                    ? `${withAccountCount} ${withAccountCount === 1 ? 'user' : 'users'} already hold an account and are not listed.`
                    : 'The user who will own this account'
                }
                error={errors.userId?.message}
                {...register('userId')}
              />

              {!isLoadingPicker && !pickerError && userOptions.length === 0 && (
                <Alert tone="info" title="Every user already has an account">
                  Accounts are one per user. Register a new user before opening another
                  account.
                </Alert>
              )}

              <Select
                label="Account type"
                options={[
                  { value: 'SAVINGS', label: 'SAVINGS' },
                  { value: 'CURRENT', label: 'CURRENT' },
                ]}
                error={errors.accountType?.message}
                {...register('accountType')}
              />

              <Alert tone="info">
                <span className="flex items-start gap-1.5">
                  <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Account number and opening balance are assigned automatically by the system.
                </span>
              </Alert>
            </CardBody>

            <CardFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/accounts')}
                disabled={createAccount.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={createAccount.isPending}
                disabled={isLoadingPicker || userOptions.length === 0}
              >
                {createAccount.isPending ? 'Creating…' : 'Create account'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {created && (
          <Card className="h-fit border-positive-border bg-positive-bg">
            <CardBody>
              <Badge tone="success" withDot>
                {created.status}
              </Badge>
              <h2 className="mt-3 text-base font-semibold text-ink">Account created</h2>
              <p className="mt-1 text-[13px] text-ink-muted">
                The account is active and ready to transact.
              </p>

              <MonoText className="mt-4 block text-base text-ink">
                {formatAccountNumber(created.accountNumber)}
              </MonoText>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link to={`/accounts/${created.id}`}>
                  <Button size="sm">View account</Button>
                </Link>
                <Link to="/accounts">
                  <Button size="sm" variant="secondary">
                    Back to accounts
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
