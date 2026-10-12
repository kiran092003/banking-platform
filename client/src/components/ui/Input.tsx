import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** `prefix` is omitted because HTML already defines it as a string attribute. */
export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  /** Rendered inside the 36px leading box, e.g. a ₹ sign or a lock icon. */
  prefix?: ReactNode;
  /** Rendered at the trailing edge, e.g. a password visibility toggle. */
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, prefix, suffix, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedById = `${inputId}-description`;
  const hasError = Boolean(error);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="label-badge mb-1.5 block text-ink-body"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {prefix && (
          <span
            className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-ink-muted"
            aria-hidden="true"
          >
            {prefix}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={hasError || undefined}
          aria-describedby={error || hint ? describedById : undefined}
          className={cn(
            'h-10 w-full rounded-base border bg-surface text-sm text-ink',
            'placeholder:text-ink-subtle',
            'transition-colors outline-none',
            'focus:border-cobalt focus:ring-[3px] focus:ring-cobalt/15',
            'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-subtle',
            hasError ? 'border-critical' : 'border-outline',
            prefix ? 'pl-9' : 'pl-3',
            suffix ? 'pr-10' : 'pr-3',
            className
          )}
          {...props}
        />

        {suffix && (
          <span className="absolute inset-y-0 right-0 flex w-10 items-center justify-center">
            {suffix}
          </span>
        )}
      </div>

      {(error || hint) && (
        <p
          id={describedById}
          className={cn('mt-1.5 text-[13px]', hasError ? 'text-critical' : 'text-ink-muted')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
