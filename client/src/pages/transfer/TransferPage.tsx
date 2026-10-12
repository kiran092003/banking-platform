import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, CheckCircle2, Clock, IndianRupee } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge, TransactionStatusBadge } from '@/components/ui/Badge';
import { DetailList, DetailRow } from '@/components/common/DetailRow';
import { Money, MonoText } from '@/components/common/Money';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { useMyAccount } from '@/features/accounts/useAccounts';
import { useCreateTransaction } from '@/features/transactions/useTransactions';
import { generateIdempotencyKey } from '@/utils/idempotency';
import { normalizeApiError } from '@/utils/errors';
import { formatAccountNumber, formatDateTime } from '@/utils/format';
import type { Transaction, TransactionType } from '@/types/transaction';
import { cn } from '@/utils/cn';

/**
 * Validation mirrors the backend's rules exactly
 * (CreateTransactionRequest + TransactionService.validateTransaction):
 *   amount >= 0.01, max 2 decimal places
 *   TRANSFER   needs a receiver, and it must differ from the sender
 *   DEPOSIT    must NOT carry a sender
 *   WITHDRAWAL must NOT carry a receiver
 */
const transferSchema = z
  .object({
    transactionType: z.enum(['TRANSFER', 'DEPOSIT', 'WITHDRAWAL']),
    receiverAccountId: z.string().trim().optional(),
    amount: z
      .string()
      .trim()
      .min(1, 'Enter an amount')
      .refine((value) => !Number.isNaN(Number(value)), 'Enter a valid amount')
      .refine((value) => Number(value) >= 0.01, 'Amount must be at least 0.01')
      .refine(
        (value) => /^\d+(\.\d{1,2})?$/.test(value),
        'Amount can have at most 2 decimal places'
      ),
  })
  .superRefine((values, ctx) => {
    if (values.transactionType !== 'TRANSFER') return;

    const receiver = values.receiverAccountId ?? '';
    if (receiver.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['receiverAccountId'],
        message: 'Enter the recipient account ID',
      });
      return;
    }

    const parsed = Number(receiver);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['receiverAccountId'],
        message: 'Account ID must be a whole number greater than 0',
      });
    }
  });

type TransferValues = z.infer<typeof transferSchema>;

type Step = 'details' | 'review' | 'result';

const TYPE_LABELS: Record<TransactionType, string> = {
  TRANSFER: 'Transfer',
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
};

function StepIndicator({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'review', label: 'Review' },
    { id: 'result', label: 'Result' },
  ];
  const activeIndex = steps.findIndex((item) => item.id === step);

  return (
    <ol className="mb-6 flex items-center gap-2 text-[13px]">
      {steps.map((item, index) => (
        <li key={item.id} className="flex items-center gap-2">
          {index > 0 && <span className="h-px w-6 bg-hairline" aria-hidden="true" />}
          <span
            className={cn(
              'flex items-center gap-1.5 font-medium',
              index === activeIndex
                ? 'text-cobalt'
                : index < activeIndex
                  ? 'text-ink-body'
                  : 'text-ink-subtle'
            )}
            aria-current={index === activeIndex ? 'step' : undefined}
          >
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold',
                index === activeIndex
                  ? 'bg-cobalt text-white'
                  : index < activeIndex
                    ? 'bg-positive-bg text-positive-text'
                    : 'bg-surface-2 text-ink-subtle'
              )}
            >
              {index + 1}
            </span>
            {item.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function TransferPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialType = ((): TransactionType => {
    const requested = searchParams.get('type');
    return requested === 'DEPOSIT' || requested === 'WITHDRAWAL' ? requested : 'TRANSFER';
  })();

  const [step, setStep] = useState<Step>('details');
  const [reviewed, setReviewed] = useState<TransferValues | null>(null);
  const [result, setResult] = useState<Transaction | null>(null);

  /**
   * One idempotency key per transfer attempt. Retrying the SAME attempt reuses
   * it so a network-level retry can never debit twice; editing the details and
   * reviewing again mints a fresh one.
   */
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey);

  const myAccount = useMyAccount();
  const createTransaction = useCreateTransaction();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { transactionType: initialType, receiverAccountId: '', amount: '' },
  });

  const transactionType = watch('transactionType');
  const amountValue = watch('amount');

  const account = myAccount.data;

  // Client-side guard only; the backend remains authoritative on balance.
  const exceedsBalance = useMemo(() => {
    if (!account || transactionType === 'DEPOSIT') return false;
    const parsed = Number(amountValue);
    return Number.isFinite(parsed) && parsed > account.balance;
  }, [account, amountValue, transactionType]);

  const onReview = handleSubmit((values) => {
    setReviewed(values);
    setIdempotencyKey(generateIdempotencyKey());
    setStep('review');
  });

  function submitTransaction() {
    if (!reviewed || !account) return;

    const amount = Number(reviewed.amount);

    createTransaction.mutate(
      {
        transactionType: reviewed.transactionType,
        amount,
        idempotencyKey,
        // Null vs omitted matters: the backend rejects the wrong side being set.
        senderAccountId:
          reviewed.transactionType === 'DEPOSIT' ? null : account.id,
        receiverAccountId:
          reviewed.transactionType === 'TRANSFER'
            ? Number(reviewed.receiverAccountId)
            : reviewed.transactionType === 'DEPOSIT'
              ? account.id
              : null,
      },
      {
        onSuccess: (transaction) => {
          setResult(transaction);
          setStep('result');
        },
        onError: () => {
          setStep('result');
        },
      }
    );
  }

  function restart() {
    setStep('details');
    setReviewed(null);
    setResult(null);
    createTransaction.reset();
    setIdempotencyKey(generateIdempotencyKey());
  }

  // ---------------------------------------------------------------------
  // Gate: every transaction type needs the user's own account
  // ---------------------------------------------------------------------

  if (myAccount.isLoading) {
    return (
      <>
        <PageHeader title="Transfer money" />
        <Card className="max-w-[520px]">
          <CardBody className="space-y-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-11 w-full" />
          </CardBody>
        </Card>
      </>
    );
  }

  if (myAccount.isError || !account) {
    const normalized = normalizeApiError(myAccount.error);
    return (
      <>
        <PageHeader title="Transfer money" />
        <Card className="max-w-[560px]">
          {normalized.status === 404 ? (
            <EmptyState
              title="No account to transact with"
              description="An administrator needs to open a bank account for you before you can transfer, deposit or withdraw."
              action={
                <Link to="/dashboard">
                  <Button variant="secondary" size="sm">
                    Back to dashboard
                  </Button>
                </Link>
              }
            />
          ) : (
            <ErrorState error={normalized} onRetry={() => void myAccount.refetch()} />
          )}
        </Card>
      </>
    );
  }

  const isAccountInactive = account.status !== 'ACTIVE';

  return (
    <>
      <PageHeader
        title="Transfer money"
        description="Move funds between accounts on the platform"
      />

      <StepIndicator step={step} />

      {isAccountInactive && (
        <Alert tone="error" title="Your account is not active" className="mb-4 max-w-[560px]">
          Transactions can only be made from an ACTIVE account. Current status:{' '}
          {account.status}.
        </Alert>
      )}

      {/* ---------------- STEP 1: DETAILS ---------------- */}
      {step === 'details' && (
        <Card className="max-w-[520px]">
          <CardHeader
            title="Transaction details"
            description="Funds move immediately once authorised"
          />
          <form onSubmit={onReview} noValidate>
            <CardBody className="space-y-4">
              <Select
                label="Transaction type"
                options={[
                  { value: 'TRANSFER', label: 'Transfer to another account' },
                  { value: 'DEPOSIT', label: 'Deposit into my account' },
                  { value: 'WITHDRAWAL', label: 'Withdraw from my account' },
                ]}
                error={errors.transactionType?.message}
                {...register('transactionType')}
              />

              {/* From / to is fixed by the backend's ownership rules. */}
              <div className="rounded-base border border-hairline bg-canvas p-3">
                <p className="label-badge text-ink-muted">
                  {transactionType === 'DEPOSIT' ? 'Into account' : 'From account'}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                  <MonoText className="text-sm text-ink">
                    {formatAccountNumber(account.accountNumber)}
                  </MonoText>
                  <span className="text-[13px] text-ink-muted">
                    {account.accountType} · Balance <Money value={account.balance} />
                  </span>
                </div>
              </div>

              {transactionType === 'TRANSFER' && (
                <Input
                  label="Recipient account ID"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="e.g. 2"
                  hint="The recipient's numeric account ID. The platform does not expose account-number lookup to customers."
                  error={errors.receiverAccountId?.message}
                  {...register('receiverAccountId')}
                />
              )}

              <Input
                label="Amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                prefix={<IndianRupee className="h-4 w-4" />}
                error={errors.amount?.message}
                {...register('amount')}
              />

              {exceedsBalance && (
                <Alert tone="warning" title="Amount exceeds your balance">
                  Your available balance is <Money value={account.balance} />. The bank will
                  reject this transaction.
                </Alert>
              )}
            </CardBody>

            <CardFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isAccountInactive}>
                Continue
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* ---------------- STEP 2: REVIEW ---------------- */}
      {step === 'review' && reviewed && (
        <Card className="max-w-[520px]">
          <CardHeader
            title="Review transfer"
            description="Confirm the details before authorising"
          />
          <CardBody>
            <div className="text-center">
              <Money
                value={Number(reviewed.amount)}
                className="block text-[36px] font-bold leading-[44px] tracking-[-0.025em] text-ink"
              />
              <Badge tone="info" className="mt-2">
                {reviewed.transactionType}
              </Badge>
            </div>

            <DetailList className="mt-6">
              {reviewed.transactionType !== 'DEPOSIT' && (
                <DetailRow label="From account">
                  <MonoText className="text-sm">
                    {formatAccountNumber(account.accountNumber)}
                  </MonoText>
                </DetailRow>
              )}

              {reviewed.transactionType === 'TRANSFER' && (
                <DetailRow label="To account ID">
                  <MonoText className="text-sm">{reviewed.receiverAccountId}</MonoText>
                </DetailRow>
              )}

              {reviewed.transactionType === 'DEPOSIT' && (
                <DetailRow label="Into account">
                  <MonoText className="text-sm">
                    {formatAccountNumber(account.accountNumber)}
                  </MonoText>
                </DetailRow>
              )}

              <DetailRow label="Transaction type">
                {TYPE_LABELS[reviewed.transactionType]}
              </DetailRow>

              <DetailRow label="Reference">
                <MonoText className="text-[11px] text-ink-muted">{idempotencyKey}</MonoText>
              </DetailRow>
            </DetailList>

            <Alert tone="warning" className="mt-5">
              <span className="flex items-start gap-1.5">
                <Clock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                This transaction is processed immediately and cannot be reversed.
              </span>
            </Alert>
          </CardBody>

          <CardFooter>
            <Button
              variant="ghost"
              onClick={() => setStep('details')}
              disabled={createTransaction.isPending}
            >
              Back
            </Button>
            <Button onClick={submitTransaction} isLoading={createTransaction.isPending}>
              {createTransaction.isPending ? 'Authorising…' : 'Confirm transfer'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ---------------- STEP 3: RESULT ---------------- */}
      {step === 'result' && (
        <Card className="max-w-[520px]">
          <CardBody>
            {createTransaction.isError ? (
              <TransferFailure
                message={normalizeApiError(createTransaction.error).message}
                onRetry={submitTransaction}
                isRetrying={createTransaction.isPending}
              />
            ) : result ? (
              <TransferResult transaction={result} onNewTransfer={restart} />
            ) : null}
          </CardBody>
        </Card>
      )}
    </>
  );
}

/** A 201 can still carry a FAILED status — the service records the attempt. */
function TransferResult({
  transaction,
  onNewTransfer,
}: {
  transaction: Transaction;
  onNewTransfer: () => void;
}) {
  const isSuccess = transaction.status === 'SUCCESS';
  const isPending = transaction.status === 'PENDING';

  return (
    <div>
      <div className="text-center">
        <div
          className={cn(
            'mx-auto flex h-12 w-12 items-center justify-center rounded-full',
            isSuccess ? 'bg-positive' : isPending ? 'bg-warning' : 'bg-critical'
          )}
        >
          {isSuccess ? (
            <CheckCircle2 className="h-6 w-6 text-white" aria-hidden="true" />
          ) : isPending ? (
            <Clock className="h-6 w-6 text-white" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-6 w-6 text-white" aria-hidden="true" />
          )}
        </div>

        <h2 className="mt-4 text-xl font-semibold tracking-[-0.015em] text-ink">
          {isSuccess
            ? 'Transfer successful'
            : isPending
              ? 'Transfer pending'
              : 'Transfer failed'}
        </h2>

        <Money
          value={transaction.amount}
          className="mt-3 block text-[32px] font-bold leading-10 tracking-[-0.025em] text-ink"
        />
        <div className="mt-2 flex justify-center">
          <TransactionStatusBadge status={transaction.status} />
        </div>
      </div>

      {transaction.status === 'FAILED' && transaction.failureReason && (
        <Alert tone="error" title="Reason" className="mt-5">
          {transaction.failureReason}
        </Alert>
      )}

      <DetailList className="mt-5">
        <DetailRow label="Transaction ID">
          <MonoText className="text-sm">#{transaction.id}</MonoText>
        </DetailRow>
        <DetailRow label="Type">{transaction.transactionType}</DetailRow>
        <DetailRow label="Timestamp">{formatDateTime(transaction.createdAt)}</DetailRow>
        <DetailRow label="Status">
          <TransactionStatusBadge status={transaction.status} />
        </DetailRow>
      </DetailList>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to={`/transactions/${transaction.id}`} className="flex-1">
          <Button variant="secondary" fullWidth>
            View transaction
          </Button>
        </Link>
        {transaction.status === 'FAILED' ? (
          <Button fullWidth className="flex-1" onClick={onNewTransfer}>
            Try again
          </Button>
        ) : (
          <Link to="/dashboard" className="flex-1">
            <Button fullWidth>Back to dashboard</Button>
          </Link>
        )}
      </div>
    </div>
  );
}

/** Request-level failure: the call itself was rejected (422, 503, network…). */
function TransferFailure({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <div>
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-critical">
          <AlertCircle className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-[-0.015em] text-ink">
          Transfer failed
        </h2>
      </div>

      <Alert tone="error" className="mt-5">
        {message}
      </Alert>

      <p className="mt-3 text-center text-[13px] text-ink-muted">
        Retrying reuses the same reference, so your account cannot be debited twice.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/dashboard" className="flex-1">
          <Button variant="secondary" fullWidth>
            Back to dashboard
          </Button>
        </Link>
        <Button fullWidth className="flex-1" onClick={onRetry} isLoading={isRetrying}>
          {isRetrying ? 'Retrying…' : 'Try again'}
        </Button>
      </div>
    </div>
  );
}
