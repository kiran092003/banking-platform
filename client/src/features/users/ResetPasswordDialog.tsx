import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { PasswordChecklist } from '@/features/auth/PasswordChecklist';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/features/auth/validation';
import { useResetUserPassword } from './useUsers';
import { normalizeApiError } from '@/utils/errors';
import type { UserSummary } from '@/types/user';

/**
 * Administrative password reset: the platform's answer to a forgotten
 * password.
 *
 * There is no email channel, so recovery cannot be a self-service link — an
 * admin sets a password here and hands it to the user out of band, and the
 * user replaces it from Settings afterwards. That hand-off is the weak point,
 * which is why the dialog says so rather than pretending otherwise.
 *
 * `user` doubles as the open/closed state: a non-null target means open. The
 * caller keys this component on the target's id, so pointing it at a different
 * user remounts it with an empty form — one admin's half-typed password can
 * never carry over into a reset of somebody else.
 */
export function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: UserSummary | null;
  onClose: () => void;
}) {
  const resetPassword = useResetUserPassword();
  const [showPasswords, setShowPasswords] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const newPassword = watch('newPassword');

  function close() {
    if (resetPassword.isPending) return;
    onClose();
  }

  const onSubmit = handleSubmit((values) => {
    if (!user) return;

    resetPassword.mutate(
      { userId: user.id, newPassword: values.newPassword },
      { onSuccess: () => onClose() }
    );
  });

  const submitError = resetPassword.isError
    ? normalizeApiError(resetPassword.error)
    : null;

  const fieldType = showPasswords ? 'text' : 'password';

  return (
    <Modal
      isOpen={user !== null}
      onClose={close}
      isDismissDisabled={resetPassword.isPending}
      title="Reset password"
      description={user ? `${user.username} — ${user.email}` : undefined}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={close}
            disabled={resetPassword.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onSubmit}
            isLoading={resetPassword.isPending}
          >
            {resetPassword.isPending ? 'Resetting…' : 'Reset password'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Alert tone="warning" title="You are setting someone else's password">
          <span className="flex items-start gap-1.5">
            <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Give it to {user?.username ?? 'them'} through a channel you trust, and ask
            them to change it from Settings once they are in.
          </span>
        </Alert>

        <Input
          label="New password"
          type={fieldType}
          autoComplete="new-password"
          placeholder="••••••••"
          prefix={<Lock className="h-4 w-4" />}
          error={errors.newPassword?.message}
          suffix={
            <button
              type="button"
              onClick={() => setShowPasswords((value) => !value)}
              aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
              className="rounded-micro p-1 text-ink-muted transition-colors hover:text-ink"
            >
              {showPasswords ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          }
          {...register('newPassword')}
        />

        {newPassword.length > 0 && <PasswordChecklist value={newPassword} />}

        <Input
          label="Confirm new password"
          type={fieldType}
          autoComplete="new-password"
          placeholder="••••••••"
          prefix={<Lock className="h-4 w-4" />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <p className="text-[13px] leading-[18px] text-ink-muted">
          Their current session ends immediately: the refresh token is revoked, so they
          cannot keep using the app with the old password.
        </p>

        {submitError && <Alert tone="error">{submitError.message}</Alert>}
      </form>
    </Modal>
  );
}
