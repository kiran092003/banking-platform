import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useLogout } from './useAuth';

/**
 * Confirmation step in front of signing out.
 *
 * Owns the logout mutation rather than taking it as a prop, so the two places
 * that can sign a user out — the sidebar and Settings — cannot drift apart in
 * wording or in what happens on confirm.
 *
 * Dismissal is blocked while the call is in flight: `loggedOut` is dispatched
 * in `onSettled`, so letting the dialog close mid-flight would leave the user
 * looking at a signed-in UI a moment before it is torn down.
 */
export function SignOutDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const logout = useLogout();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isDismissDisabled={logout.isPending}
      title="Sign out?"
      description="Do you want to sign out?"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={logout.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            isLoading={logout.isPending}
            onClick={() => logout.mutate()}
          >
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </Button>
        </>
      }
    />
  );
}
