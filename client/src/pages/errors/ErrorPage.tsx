import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Lock, ServerCrash, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/useAuth';

function ErrorPage({
  code,
  icon: Icon,
  title,
  description,
  children,
}: {
  code: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-2">
          <Icon className="h-6 w-6 text-ink-muted" aria-hidden="true" />
        </div>

        <p className="label-badge mt-6 text-ink-subtle">Error {code}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {children ?? (
            <Button onClick={() => window.history.back()} variant="secondary">
              Go back
            </Button>
          )}
          <Link to={isAuthenticated ? '/dashboard' : '/login'}>
            <Button>{isAuthenticated ? 'Back to dashboard' : 'Go to sign in'}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function UnauthorizedPage() {
  return (
    <ErrorPage
      code="401"
      icon={Lock}
      title="Authentication required"
      description="Your session is no longer valid. Sign in again to continue."
    >
      <span />
    </ErrorPage>
  );
}

export function ForbiddenPage() {
  return (
    <ErrorPage
      code="403"
      icon={ShieldAlert}
      title="Access denied"
      description="Your role does not grant access to this area. If you believe this is a mistake, contact an administrator."
    />
  );
}

export function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      icon={FileQuestion}
      title="Page not found"
      description="The page you are looking for does not exist or may have been moved."
    />
  );
}

export function ServiceUnavailablePage() {
  return (
    <ErrorPage
      code="503"
      icon={ServerCrash}
      title="Service unavailable"
      description="A downstream banking service is temporarily unreachable. Please try again in a moment."
    />
  );
}
