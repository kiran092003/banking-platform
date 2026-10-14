import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useChangePassword } from './useAuth';
import { PasswordChecklist } from './PasswordChecklist';
import { changePasswordSchema, type ChangePasswordFormValues } from './validation';
import { normalizeApiError } from '@/utils/errors';

/**
 * Lets the signed-in user replace their own password.
 *
 * The current password is asked for even though they are already signed in:
 * an access token lasts 15 minutes, so proving knowledge of the password is
 * what stops someone at a borrowed desk from taking the account over.
 *
 * A successful change ends the session — the backend revokes the refresh token
 * — so this routes to /login with a message rather than leaving the user in a
 * UI whose token is about to stop refreshing.
 */
export function ChangePasswordCard() {
  const navigate = useNavigate();
  const changePassword = useChangePassword();

  const [showPasswords, setShowPasswords] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPassword = watch('newPassword');

  const onSubmit = handleSubmit((values) => {
    changePassword.mutate(
      {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => {
          navigate('/login', {
            replace: true,
            state: { passwordChanged: true },
          });
        },
      }
    );
  });

  const submitError = changePassword.isError
    ? normalizeApiError(changePassword.error)
    : null;

  const visibilityToggle = (
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
  );

  const fieldType = showPasswords ? 'text' : 'password';

  return (
    <Card>
      <CardHeader
        title="Password"
        description="Change the password you sign in with"
      />
      <CardBody>
        {submitError && (
          <Alert tone="error" className="mb-5">
            {submitError.message}
          </Alert>
        )}

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Input
            label="Current password"
            type={fieldType}
            autoComplete="current-password"
            placeholder="••••••••"
            prefix={<Lock className="h-4 w-4" />}
            error={errors.currentPassword?.message}
            suffix={visibilityToggle}
            {...register('currentPassword')}
          />

          <Input
            label="New password"
            type={fieldType}
            autoComplete="new-password"
            placeholder="••••••••"
            prefix={<Lock className="h-4 w-4" />}
            error={errors.newPassword?.message}
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

          <Alert tone="info">
            Changing your password signs you out everywhere. You will need to sign in
            again with the new one.
          </Alert>

          <Button type="submit" isLoading={changePassword.isPending}>
            {changePassword.isPending ? 'Changing password…' : 'Change password'}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
