import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Info } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardBody, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { MonoText } from '@/components/common/Money';
import { useCreateAccount } from '@/features/accounts/useAccounts';
import { normalizeApiError } from '@/utils/errors';
import { formatAccountNumber } from '@/utils/format';

/**
 * AccountRequestDTO accepts exactly two fields: userId and accountType.
 * Account number and opening balance are assigned by the service.
 */
const createAccountSchema = z.object({
  // Kept as a string so the field stays controlled; parsed on submit.
  userId: z
    .string()
    .trim()
    .min(1, 'Enter a user ID')
    .refine((value) => /^\d+$/.test(value), 'User ID must be a whole number')
    .refine((value) => Number(value) > 0, 'User ID must be greater than 0'),
  accountType: z.enum(['SAVINGS', 'CURRENT']),
});

type CreateAccountValues = z.infer<typeof createAccountSchema>;

export default function CreateAccountPage() {
  const navigate = useNavigate();
  const createAccount = useCreateAccount();

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

              <Input
                label="User ID"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="e.g. 1042"
                hint="Numeric ID of the user who will own this account"
                error={errors.userId?.message}
                {...register('userId')}
              />

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
              <Button type="submit" isLoading={createAccount.isPending}>
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
