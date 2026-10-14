import { filterFieldClass } from './ColumnFilter';

/**
 * The controls that go inside a <ColumnFilter> popover.
 *
 * Kept together so every column filter in the app offers the same three
 * shapes — pick from a set, match text, fall in a range — rather than each
 * table inventing its own.
 */

/** One-of-a-set, e.g. a status or a role. `''` means no filter. */
export function SelectFilter({
  value,
  onChange,
  options,
  allLabel = 'All',
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className={filterFieldClass}
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Substring match. `''` means no filter. */
export function TextFilter({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={label}
      /* eslint-disable-next-line jsx-a11y/no-autofocus -- the popover exists
         solely for this field, and it is opened by a deliberate click. */
      autoFocus
      className={filterFieldClass}
    />
  );
}

/**
 * An inclusive range, for numbers or dates. Either end may be left blank for
 * an open-ended range.
 */
export function RangeFilter({
  type,
  min,
  max,
  onMinChange,
  onMaxChange,
  label,
  minPlaceholder = 'Min',
  maxPlaceholder = 'Max',
}: {
  type: 'number' | 'date';
  min: string;
  max: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  label: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <input
        type={type}
        value={min}
        onChange={(event) => onMinChange(event.target.value)}
        placeholder={type === 'number' ? minPlaceholder : undefined}
        aria-label={`${label}, from`}
        className={filterFieldClass}
      />
      <input
        type={type}
        value={max}
        onChange={(event) => onMaxChange(event.target.value)}
        placeholder={type === 'number' ? maxPlaceholder : undefined}
        aria-label={`${label}, to`}
        className={filterFieldClass}
      />
    </div>
  );
}
