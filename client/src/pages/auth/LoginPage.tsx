import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useLogin } from '@/features/auth/useAuth';
import { loginSchema, type LoginFormValues } from '@/features/auth/validation';
import { normalizeApiError } from '@/utils/errors';

interface LocationState {
  from?: string;
  sessionExpired?: boolean;
  registered?: boolean;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => {
        navigate(state.from ?? '/dashboard', { replace: true });
      },
    });
  });

  const submitError = login.isError ? normalizeApiError(login.error) : null;

  return (
    <AuthLayout>
      <div className="w-full max-w-[420px]">
        <div className="rounded-card border border-hairline bg-surface p-6 shadow-[var(--shadow-tier1)] sm:p-8">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
            Sign in to your account
          </h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            Enter your credentials to continue
          </p>

          {state.registered && (
            <Alert tone="success" className="mt-5">
              Your account was created. Sign in to continue.
            </Alert>
          )}

          {state.sessionExpired && !submitError && (
            <Alert tone="warning" className="mt-5">
              Your session expired. Please sign in again.
            </Alert>
          )}

          {submitError && (
            <Alert tone="error" className="mt-5">
              {submitError.status === 401
                ? 'Invalid username or password'
                : submitError.message}
            </Alert>
          )}

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <Input
              label="Username"
              autoComplete="username"
              placeholder="your.username"
              prefix={<User className="h-4 w-4" />}
              error={errors.username?.message}
              {...register('username')}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[13px] text-ink-body">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded-micro border-outline text-cobalt focus:ring-cobalt"
                />
                Remember me
              </label>

              {/* No password-reset endpoint exists in auth-service yet. */}
              <span
                title="Password recovery is not available yet"
                className="cursor-not-allowed text-[13px] font-medium text-ink-subtle"
              >
                Forgot password?
              </span>
            </div>

            <Button type="submit" fullWidth isLoading={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 border-t border-hairline pt-5 text-center text-[13px] text-ink-muted">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-cobalt hover:underline">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
