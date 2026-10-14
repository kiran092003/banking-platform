import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { passwordRules } from './validation';

/**
 * Live view of the backend's password rules, ticking off as they are met.
 *
 * Shared by registration and the change-password form so both show the same
 * requirements in the same shape. The rules come from `passwordRules`, which
 * mirrors the @Pattern on the DTOs — the server remains authoritative.
 */
export function PasswordChecklist({ value }: { value: string }) {
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
