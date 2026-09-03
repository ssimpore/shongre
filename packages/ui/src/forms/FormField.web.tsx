import React, { forwardRef, isValidElement, cloneElement, useId } from "react";
import { cn } from "../utils/variants";
import {
  CONTROL_RADIUS_CLASS,
  CONTROL_MOTION_CLASS,
  ControlSize,
  controlHeightClasses,
  controlMinHeightClasses,
} from "../utils/controlMetrics";

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
  className = "",
}) => {
  const generatedId = useId();
  const controlId = htmlFor ?? `field-${generatedId}`;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;

  const describedBy = [hint && !error ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  let control = children;
  if (isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    const existingDescribedBy = child.props["aria-describedby"] as
      string | undefined;
    // `error` is a prop of our own controls only. Forwarding it to a plain DOM
    // child (a bare <input>, a custom wrapper) would render an invalid
    // `error="false"` attribute, so gate it on the component identity.
    const acceptsErrorProp =
      child.type === Input || child.type === Textarea || child.type === Select;

    control = cloneElement(child, {
      id: (child.props.id as string | undefined) ?? controlId,
      "aria-describedby":
        [existingDescribedBy, describedBy].filter(Boolean).join(" ") ||
        undefined,
      "aria-invalid": error ? true : child.props["aria-invalid"],
      "aria-required": required ? true : child.props["aria-required"],
      ...(acceptsErrorProp
        ? { error: child.props.error ?? Boolean(error) }
        : {}),
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
        <p id={hintId} className="text-xs text-text-muted">
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

export interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: ControlSize;
}

/**
 * Each step pins `min-height` alongside `height`, and that pairing is what makes
 * the step real.
 *
 * `src/index.css` floors every bare `<input>`/`<select>` at `control-md` so a
 * native control dropped into a page is never smaller than the scale allows.
 * `min-height` beats a smaller `height`, though, so that floor silently ate the
 * `sm` step: `<Select size="sm">` asked for 32px and measured 40px on every
 * admin toolbar, and the base rule's own comment ("utility variants can
 * intentionally opt into another owned size") was not true for anything below
 * the floor. Restating the size as a utility puts it in `@layer utilities`,
 * which the cascade resolves after `@layer base`.
 *
 * Touch is unaffected: the coarse-pointer block redefines `--spacing-control-sm`
 * itself to the 44px touch token, so this resolves to 44px on a finger.
 */
const fieldSizeClasses: Record<ControlSize, string> = {
  sm: `${controlHeightClasses.sm} ${controlMinHeightClasses.sm} px-3 text-xs`,
  compact: `${controlHeightClasses.compact} ${controlMinHeightClasses.compact} px-3.5 text-sm`,
  md: `${controlHeightClasses.md} ${controlMinHeightClasses.md} px-4 text-sm`,
  lg: `${controlHeightClasses.lg} ${controlMinHeightClasses.lg} px-4 text-base sm:text-sm`,
};

const fieldStateClasses = (error?: boolean) =>
  error
    ? "border-danger focus:border-danger focus:ring-2 focus:ring-danger/20"
    : "border-border-base hover:border-border-hover focus:border-primary focus:ring-2 focus:ring-primary/20";

/**
 * A width supplied by the caller, which must win over the field default.
 *
 * `cn` concatenates; it does not resolve Tailwind conflicts. So a call site
 * passing `w-auto` still got `w-full` too, and Tailwind picks by stylesheet
 * order, where `.w-full` is emitted last — the vehicle-search "Trier par"
 * control stretched to the full toolbar and pushed its own label onto a second
 * line. Fields fill their container by default because that is right in a form
 * column; an inline toolbar control needs to say otherwise, and be believed.
 *
 * `Button` carries the same guard for `display`, and `FavoriteButton` for
 * `position` — same root cause each time.
 */
const WIDTH_SET_BY_CALLER =
  /(?:^|\s)(?:[a-z0-9-]+:)*w-(?:auto|fit|min|max|screen|px|\d|\[)/;

const FIELD_BASE_CLASSES = `bg-bg-surface text-text-main border shadow-2xs ${CONTROL_MOTION_CLASS} placeholder:text-text-muted hover:bg-bg-base focus:bg-bg-surface focus:shadow-xs focus:outline-none disabled:bg-bg-muted disabled:text-text-disabled disabled:cursor-not-allowed disabled:shadow-none`;

/** The default width, applied unless the caller already picked one. */
const fieldWidth = (className: string) =>
  WIDTH_SET_BY_CALLER.test(className) ? "" : "w-full";

/** Just the width utilities out of a caller's className. */
const WIDTH_TOKEN =
  /^(?:[a-z0-9-]+:)*w-(?:auto|fit|min|max|screen|px|full|\d.*|\[.*)$/;
const callerWidths = (className: string) =>
  className
    .split(/\s+/)
    .filter((t) => WIDTH_TOKEN.test(t))
    .join(" ");
const withoutWidths = (className: string) =>
  className
    .split(/\s+/)
    .filter((t) => t && !WIDTH_TOKEN.test(t))
    .join(" ");

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className = "", error, leftIcon, rightIcon, size = "md", ...props },
    ref,
  ) => {
    return (
      /* The wrapper owns the width so `leftIcon`/`rightIcon` stay positioned
         against the control's real box, and it is where a caller-supplied
         width has to land; the input itself then simply fills it. */
      <div
        className={cn(
          "relative flex items-center",
          WIDTH_SET_BY_CALLER.test(className)
            ? callerWidths(className)
            : "w-full",
        )}
      >
        {leftIcon && (
          <div className="absolute left-3.5 text-text-muted pointer-events-none flex items-center shrink-0">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          className={cn(
            "w-full",
            // width belongs to the wrapper above, not to the control
            FIELD_BASE_CLASSES,
            CONTROL_RADIUS_CLASS,
            fieldSizeClasses[size],
            leftIcon ? "pl-11" : "",
            rightIcon ? "pr-11" : "",
            fieldStateClasses(error),
            withoutWidths(className),
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 text-text-muted flex items-center shrink-0">
            {rightIcon}
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error, rows = 4, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={error ? "true" : undefined}
        className={cn(
          fieldWidth(className),
          FIELD_BASE_CLASSES,
          CONTROL_RADIUS_CLASS,
          "min-h-control-touch p-4 text-base sm:text-sm",
          fieldStateClasses(error),
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

interface SelectBaseProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "size"
> {
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
 *
 * An *ancestor* is the fourth legitimate source, and the most common one in
 * this product. Two shapes qualify, and only these two:
 *
 *   - a caller's own `<label>` wrapping the select, which names it through the
 *     accessible-name algorithm — `<label><span>Rayon</span><select/></label>`
 *     appears across every search and publish surface;
 *   - a `FormField` ancestor, which clones its child with the same generated
 *     `id` its `<label htmlFor>` points at.
 *
 * TypeScript can see neither, so `labelledByAncestor` is how the call site
 * states it: an explicit, greppable claim. It is no more permissive than the
 * `Checkbox` contract below, which accepts the wrapping-label case for exactly
 * the same reason. What holds the line is `e2e/accessibility.spec.ts` — only the
 * rendered tree can tell a real ancestor from a missing one.
 *
 * Do not reach for it to silence the compiler on a standalone filter select;
 * that is the exact bug this union was introduced to stop.
 */
export type SelectProps = SelectBaseProps &
  (
    | { id: string }
    | { "aria-label": string }
    | { "aria-labelledby": string }
    | { labelledByAncestor: true }
  );

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className = "", error, children, options, size = "md", ...props },
    ref,
  ) => {
    // A naming claim, not an attribute — React would render it on the element.
    delete (props as { labelledByAncestor?: unknown }).labelledByAncestor;
    return (
      <select
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        className={cn(
          fieldWidth(className),
          FIELD_BASE_CLASSES,
          CONTROL_RADIUS_CLASS,
          fieldSizeClasses[size],
          "cursor-pointer",
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
  },
);
Select.displayName = "Select";

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
  ({ label, description, className = "", id, ...props }, ref) => {
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
        className={`w-4 h-4 ${isBare ? "" : "mt-0.5"} rounded border-border-base text-primary focus:ring-primary cursor-pointer ${className}`}
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
          {label && (
            <span className="text-sm font-semibold text-text-main">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-text-muted">{description}</span>
          )}
        </div>
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";

interface SwitchBaseProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export type SwitchProps = SwitchBaseProps &
  (
    | { label: string; "aria-label"?: string }
    | { label?: undefined; "aria-label": string }
  );

/** Native checkbox semantics with the visual treatment of a switch. */
export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
  "aria-label": ariaLabel,
}) => {
  const generatedId = useId();
  const inputId = id ?? `switch-${generatedId}`;
  const descriptionId = description ? `${inputId}-description` : undefined;

  return (
    <label
      htmlFor={inputId}
      className={`relative flex min-h-control-touch items-center justify-between gap-4 select-none ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
    >
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-medium text-text-main">{label}</span>
          )}
          {description && (
            <span id={descriptionId} className="text-xs text-text-muted">
              {description}
            </span>
          )}
        </div>
      )}
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        className="peer absolute inset-0 z-raised h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        aria-describedby={descriptionId}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span
        className={`flex h-6 w-11 shrink-0 items-center rounded-full bg-stone-400 p-1 ${CONTROL_MOTION_CLASS} peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus`}
      >
        <span
          className={`h-icon-md w-icon-md rounded-full bg-bg-surface shadow-sm ${CONTROL_MOTION_CLASS} ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </label>
  );
};
