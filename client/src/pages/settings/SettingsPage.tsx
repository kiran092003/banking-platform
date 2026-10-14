import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DetailList, DetailRow } from '@/components/common/DetailRow';
import { MonoText } from '@/components/common/Money';
import { useAppDispatch } from '@/app/hooks';
import { signOutDialogSet } from '@/features/ui/uiSlice';
import { useAuth } from '@/features/auth/useAuth';
import { ChangePasswordCard } from '@/features/auth/ChangePasswordCard';

export default function SettingsPage() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();

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
              Username, email and role are still fixed: auth-service has no
              profile-update endpoint, and a role is an admin's to assign. The
              password is the one thing here a user can change themselves, and
              it has its own card below.
            */}
          </CardBody>
        </Card>

        <ChangePasswordCard />

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
              onClick={() => dispatch(signOutDialogSet(true))}
            >
              Sign out
            </Button>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
