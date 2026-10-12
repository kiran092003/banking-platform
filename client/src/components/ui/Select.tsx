import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, placeholder, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const describedById = `${selectId}-description`;
  const hasError = Boolean(error);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="label-badge mb-1.5 block text-ink-body">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={hasError || undefined}
          aria-describedby={error || hint ? describedById : undefined}
          className={cn(
            'h-10 w-full appearance-none rounded-base border bg-surface pl-3 pr-9 text-sm text-ink',
            'transition-colors outline-none',
            'focus:border-cobalt focus:ring-[3px] focus:ring-cobalt/15',
            'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-subtle',
            hasError ? 'border-critical' : 'border-outline',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
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
