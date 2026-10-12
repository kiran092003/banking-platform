import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { DetailList, DetailRow } from '@/components/common/DetailRow';
import { MonoText } from '@/components/common/Money';
import { useAuth, useLogout } from '@/features/auth/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();
  const logout = useLogout();

  return (
    <>
      <PageHeader title="Settings" description="Your profile and session" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile" description="Derived from your access token" />
          <CardBody>
            <DetailList>
              <DetailRow label="Username">{user?.username ?? '—'}</DetailRow>
              <DetailRow label="User ID">
                <MonoText className="text-sm">{user?.userId ?? '—'}</MonoText>
              </DetailRow>
              <DetailRow label="Role">
                <Badge tone={user?.role === 'ADMIN' ? 'info' : 'neutral'}>
                  {user?.role ?? '—'}
                </Badge>
              </DetailRow>
            </DetailList>

            {/*
              auth-service exposes register, login, refresh and logout only —
              there is no profile-update or change-password endpoint.
            */}
            <Alert tone="info" className="mt-5">
              Profile editing and password changes are not available: the auth service exposes
              only registration, sign-in, token refresh and sign-out.
            </Alert>
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Session" description="Sign out on this device" />
          <CardBody>
            <p className="text-[13px] leading-[18px] text-ink-muted">
              Signing out revokes your refresh token on the server, so it cannot be reused,
              and clears all cached data from this browser.
            </p>
            <Button
              variant="destructive"
              className="mt-5"
              isLoading={logout.isPending}
              onClick={() => logout.mutate()}
            >
              {logout.isPending ? 'Signing out…' : 'Sign out'}
            </Button>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
