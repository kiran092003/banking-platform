import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useRegister } from '@/features/auth/useAuth';
import {
  passwordRules,
  registerSchema,
  type RegisterFormValues,
} from '@/features/auth/validation';
import { normalizeApiError } from '@/utils/errors';
import { cn } from '@/utils/cn';

/*
 * There is no role selector here by design. Registration always creates a
 * USER — the backend ignores any role sent to /auth/register — and an existing
 * administrator promotes an account from Admin > Users and roles. A public
 * form that could grant ADMIN would be a privilege-escalation hole, and a
 * dev-only flag guarding it still leaves the backend accepting the field.
 */

function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="mt-2 grid gap-1.5" aria-label="Password requirements">
      {passwordRules.map((rule) => {
        const met = rule.test(value);
        return (
          <li key={rule.label} className="flex items-center gap-2 text-[13px]">
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                met ? 'bg-positive-bg' : 'bg-surface-2'
              )}
            >
              {met ? (
                <Check className="h-2.5 w-2.5 text-positive-text" aria-hidden="true" />
              ) : (
                <span className="h-1 w-1 rounded-full bg-ink-subtle" aria-hidden="true" />
              )}
            </span>
            <span className={met ? 'text-positive-text' : 'text-ink-muted'}>
              {rule.label}
            </span>
            <span className="sr-only">{met ? ' — met' : ' — not met'}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');

  const onSubmit = handleSubmit((values) => {
    registerMutation.mutate(
      {
        username: values.username,
        email: values.email,
        password: values.password,
      },
      {
        onSuccess: () => {
          navigate('/login', { replace: true, state: { registered: true } });
        },
      }
    );
  });

  const submitError = registerMutation.isError
    ? normalizeApiError(registerMutation.error)
    : null;

  return (
    <AuthLayout>
      <div className="w-full max-w-[440px]">
        <div className="rounded-card border border-hairline bg-surface p-6 shadow-[var(--shadow-tier1)] sm:p-8">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
            Create your account
          </h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            Open a secure banking profile in minutes
          </p>

          {submitError && (
            <Alert tone="error" className="mt-5">
              {submitError.status === 409
                ? 'That username or email is already registered.'
                : submitError.message}
            </Alert>
          )}

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <Input
              label="Username"
              autoComplete="username"
              placeholder="your.username"
              prefix={<User className="h-4 w-4" />}
              hint="3 to 50 characters"
              error={errors.username?.message}
              {...register('username')}
            />

            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              prefix={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                prefix={<Lock className="h-4 w-4" />}
                error={errors.password?.message}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="rounded-micro p-1 text-ink-muted transition-colors hover:text-ink"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                }
                {...register('password')}
              />
              <PasswordChecklist value={passwordValue} />
            </div>

            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              prefix={<Lock className="h-4 w-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Alert tone="info">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                New profiles are created with standard customer access.
              </span>
            </Alert>

            <Button type="submit" fullWidth isLoading={registerMutation.isPending}>
              {registerMutation.isPending ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 border-t border-hairline pt-5 text-center text-[13px] text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-cobalt hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
