import React, { forwardRef, isValidElement, cloneElement, useId } from 'react';
import { cn } from '../utils/variants';
import {
  CONTROL_RADIUS_CLASS,
  ControlSize,
  controlHeightClasses,
} from '../utils/controlMetrics';

export interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Labelled form row.
 *
 * When it wraps a single element child, the field wires that control up for
 * assistive tech automatically: it gets an `id` matching the label, plus
 * `aria-describedby` for the hint/error and `aria-invalid` when in error. Fields
 * previously rendered the error text next to an input with nothing connecting
 * them, so screen-reader users never heard why a submit failed.
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  hint,
  required,
  htmlFor,
  children,
  className = '',
}) => {
  const generatedId = useId();
  const controlId = htmlFor ?? `field-${generatedId}`;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;

  const describedBy = [hint && !error ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  let control = children;
  if (isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const existingDescribedBy = child.props['aria-describedby'] as string | undefined;
    // `error` is a prop of our own controls only. Forwarding it to a plain DOM
    // child (a bare <input>, a custom wrapper) would render an invalid
    // `error="false"` attribute, so gate it on the component identity.
    const acceptsErrorProp =
      child.type === Input || child.type === Textarea || child.type === Select;

    control = cloneElement(child, {
      id: (child.props.id as string | undefined) ?? controlId,
      'aria-describedby':
        [existingDescribedBy, describedBy].filter(Boolean).join(' ') || undefined,
      'aria-invalid': error ? true : child.props['aria-invalid'],
      'aria-required': required ? true : child.props['aria-required'],
      ...(acceptsErrorProp ? { error: child.props.error ?? Boolean(error) } : {}),
    });
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={controlId}
          className="text-sm font-semibold text-stone-800 flex items-center justify-between"
        >
          <span>
            {label}
            {required && (
              <span className="text-primary ml-1" aria-hidden="true">
                *
              </span>
            )}
          </span>
        </label>
      )}
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-stone-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-danger font-medium">
          {error}
        </p>
      )}
    </div>
  );
};

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: ControlSize;
}

const fieldSizeClasses: Record<ControlSize, string> = {
  sm: `${controlHeightClasses.sm} px-3 text-xs`,
  compact: `${controlHeightClasses.compact} px-3.5 text-sm`,
  md: `${controlHeightClasses.md} px-4 text-sm`,
  lg: `${controlHeightClasses.lg} px-4 text-base sm:text-sm`,
};

const fieldStateClasses = (error?: boolean) =>
  error
    ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
    : 'border-border-base hover:border-border-hover focus:border-primary focus:ring-2 focus:ring-primary/20';

const FIELD_BASE_CLASSES =
  'w-full bg-bg-surface text-text-main border transition-all duration-normal placeholder:text-text-muted focus:bg-bg-surface focus:outline-none disabled:bg-bg-muted disabled:text-text-disabled disabled:cursor-not-allowed';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, leftIcon, rightIcon, size = 'md', ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3.5 text-stone-500 pointer-events-none flex items-center shrink-0">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          aria-invalid={error ? 'true' : undefined}
          className={cn(
            FIELD_BASE_CLASSES,
            CONTROL_RADIUS_CLASS,
            fieldSizeClasses[size],
            leftIcon ? 'pl-11' : '',
            rightIcon ? 'pr-11' : '',
            fieldStateClasses(error),
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 text-stone-500 flex items-center shrink-0">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, rows = 4, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          FIELD_BASE_CLASSES,
          CONTROL_RADIUS_CLASS,
          'min-h-control-touch p-4 text-base sm:text-sm',
          fieldStateClasses(error),
          className,
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

interface SelectBaseProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  error?: boolean;
  options?: { value: string | number; label: string }[];
  size?: ControlSize;
}

/**
 * A select must be nameable, the same way a `Button` must.
 *
 * Standalone filter selects shipped with no accessible name at all — a screen
 * reader announced "combo box" with no indication of what it filtered. Inside a
 * `FormField` the `id`/`htmlFor` pairing supplies the name, so passing `id` is
 * accepted as proof; anywhere else the call site must say what the control is
 * for. The compiler now asks the question instead of an audit finding it later.
 */
export type SelectProps = SelectBaseProps &
  (
    | { id: string }
    | { 'aria-label': string }
    | { 'aria-labelledby': string }
  );

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, children, options, size = 'md', ...props }, ref) => {
    return (
      <select
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          FIELD_BASE_CLASSES,
          CONTROL_RADIUS_CLASS,
          fieldSizeClasses[size],
          'cursor-pointer',
          fieldStateClasses(error),
          className,
        )}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
    );
  }
);
Select.displayName = 'Select';

interface CheckboxBaseProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  description?: string;
}

/**
 * A checkbox must end up with a name, from one of three places: its own `label`
 * prop, a caller's `<label>` wrapping it, or an explicit `aria-label` when the
 * describing text is a sibling rather than an ancestor. The wrapping case is
 * legitimate and common here, so this is not narrowed in the type the way
 * `Button` and `Select` are — `e2e/accessibility.spec.ts` is what holds the
 * line, since only the rendered tree can tell the three cases apart.
 */
export type CheckboxProps = CheckboxBaseProps;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', id, ...props }, ref) => {
    // The id used to be derived from the first 15 characters of the label
    // (`cb-Livraison-dispo`), so two checkboxes whose labels share an opening
    // phrase produced the same id — and a duplicate id silently breaks the
    // label/input association for both. `useId` is unique by construction.
    const generatedId = useId();
    const inputId = id || `cb-${generatedId}`;

    // A checkbox with a visible label gets a generous target for free, because
    // the wrapping label is clickable. A bare one (table row selectors, compact
    // filters) is only 16px, so the wrapper carries the minimum itself.
    const isBare = !label && !description;

    const input = (
      <input
        ref={ref}
        type="checkbox"
        id={inputId}
        className={`w-4 h-4 ${isBare ? '' : 'mt-0.5'} rounded border-border-base text-primary focus:ring-primary cursor-pointer ${className}`}
        {...props}
      />
    );

    // Without a visible label there is nothing for a `<label>` to hold, and a
    // great many bare checkboxes sit *inside* a caller's own `<label>` — nesting
    // one label in another, which no browser resolves into a usable name. A
    // plain span keeps the enlarged hit area without inventing that structure;
    // the type signature guarantees an `aria-label` is present instead.
    if (isBare) {
      return (
        <span className="inline-flex items-center justify-center min-w-6 min-h-6 pointer-coarse:min-w-control-touch pointer-coarse:min-h-control-touch">
          {input}
        </span>
      );
    }

    return (
      <label
        htmlFor={inputId}
        className="flex items-start gap-2.5 cursor-pointer select-none min-h-6"
      >
        {input}
        <div className="flex flex-col">
          {label && <span className="text-sm font-semibold text-stone-900">{label}</span>}
          {description && <span className="text-xs text-stone-500">{description}</span>}
        </div>
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

interface SwitchBaseProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export type SwitchProps = SwitchBaseProps &
  ({ label: string; 'aria-label'?: string } | { label?: undefined; 'aria-label': string });

/** Native checkbox semantics with the visual treatment of a switch. */
export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
  'aria-label': ariaLabel,
}) => {
  const generatedId = useId();
  const inputId = id ?? `switch-${generatedId}`;

  return (
    <label
      htmlFor={inputId}
      className={`flex min-h-control-touch items-center justify-between gap-4 select-none ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
    >
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-medium text-stone-900">{label}</span>}
          {description && <span className="text-xs text-stone-500">{description}</span>}
        </div>
      )}
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className="flex h-6 w-11 shrink-0 items-center rounded-full bg-stone-400 p-1 transition-colors duration-normal peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
        <span
          className={`h-icon-md w-icon-md rounded-full bg-white shadow-sm transition-transform duration-normal ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </label>
  );
};
