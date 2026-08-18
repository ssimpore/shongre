import React from 'react';
import { Loader2 } from 'lucide-react';
import { Link, LinkProps } from 'react-router-dom';

export interface ButtonVisualProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'pro';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

/**
 * A button must be nameable. Either it has visible `children` (the label), or it
 * is icon-only and must carry an explicit `aria-label`.
 *
 * Enforced in the type system because icon-only `<Button>`s with no label kept
 * shipping — the compiler now rejects them instead of an audit catching them
 * later. Reach for `IconButton` when the control is icon-only by design.
 */
type NameableProps =
  | { children: React.ReactNode }
  | { children?: undefined; 'aria-label': string };

type NativeButtonProps = ButtonVisualProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    to?: undefined;
    href?: undefined;
  };

type RouterLinkButtonProps = ButtonVisualProps &
  Omit<LinkProps, 'className' | 'children'> & {
    href?: undefined;
  };

type ExternalLinkButtonProps = ButtonVisualProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> & {
    href: string;
    to?: undefined;
  };

/**
 * `to` renders a router `<Link>` and `href` renders an `<a>`, both with button
 * styling. Navigation actions used to be written as `<Link><Button/></Link>`,
 * which nests a button inside a link — invalid HTML that gives screen readers
 * two overlapping controls for one target and breaks Enter/Space semantics.
 * Passing the destination to the button keeps one element, one role, one name.
 */
export type ButtonProps = (
  | NativeButtonProps
  | RouterLinkButtonProps
  | ExternalLinkButtonProps
) &
  NameableProps;

// `whitespace-nowrap` is load-bearing: the size variants below pin an exact
// height, so a label allowed to wrap spills out through the bottom edge.
const baseStyles =
  'inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-fast cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:cursor-not-allowed active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/**
 * Heights come from the shared control scale in `index.css`, not from ad-hoc
 * `h-*` values:
 *   md  → control-touch (44px) — the WCAG 2.5.5 target, the default
 *   lg  → control-lg    (48px) — page-level primary actions
 *
 * `lg` was `h-14`. 56px is not a step on that scale, and it showed: the
 * registration and pro-signup submit buttons towered over every other control
 * on their form, and in the newsletter band the button stood 8px taller than
 * the email field beside it. 48px is the scale's own large step and still reads
 * as the biggest control on the page.
 *
 * `sm` stays at `h-9` (36px) deliberately. It is off-scale too, but it is the
 * height dense admin tables and filter bars are laid out around, and moving it
 * is a change to those screens rather than to this one.
 */
const sizeStyles = {
  sm: 'text-xs px-4 py-1.5 gap-1.5 h-9 font-semibold rounded-xl',
  md: 'text-sm px-5 py-2 gap-2 h-control-touch font-bold rounded-xl',
  lg: 'text-base px-6 py-2.5 gap-2.5 h-control-lg font-bold rounded-2xl',
};

const variantStyles = {
  primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-sm hover:shadow-md hover:shadow-primary/20',
  secondary: 'bg-stone-50 text-stone-900 hover:bg-stone-100 active:bg-stone-200 shadow-2xs',
  outline: 'border-2 border-stone-200 bg-white text-stone-800 hover:bg-stone-50 hover:border-stone-300 active:bg-stone-100 shadow-2xs',
  ghost: 'bg-transparent text-stone-700 hover:text-stone-950 hover:bg-stone-100 active:bg-stone-200',
  danger: 'bg-danger text-white hover:bg-danger-hover active:bg-danger-active shadow-sm',
  pro: 'bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-950 shadow-sm hover:shadow-md hover:shadow-stone-900/10',
};

export const Button: React.FC<ButtonProps> = (props) => {
  const {
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    ...rest
  } = props;

  const classes = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
    fullWidth ? 'w-full' : ''
  } ${className}`;

  const content = (
    <>
      {isLoading ? (
        <Loader2 className="w-4 h-4 shrink-0 animate-spin text-current" />
      ) : (
        leftIcon && <span className="shrink-0 inline-flex items-center">{leftIcon}</span>
      )}
      {/* The children slot is itself a non-wrapping flex row. Call sites often
          pass an icon alongside the label instead of using `leftIcon`; as a plain
          <span> those became inline content that broke onto a second line inside
          the button's fixed height, leaving the label sitting on the bottom
          border. As a flex row the icon and label can never separate. */}
      <span className="inline-flex items-center gap-1.5 min-w-0">{children}</span>
      {!isLoading && rightIcon && (
        <span className="shrink-0 inline-flex items-center">{rightIcon}</span>
      )}
    </>
  );

  if ('to' in rest && rest.to !== undefined) {
    const { to, ...linkProps } = rest as Omit<RouterLinkButtonProps, keyof ButtonVisualProps>;
    return (
      <Link to={to} className={classes} {...linkProps}>
        {content}
      </Link>
    );
  }

  if ('href' in rest && rest.href !== undefined) {
    const { href, ...anchorProps } = rest as Omit<ExternalLinkButtonProps, keyof ButtonVisualProps>;
    return (
      <a href={href} className={classes} {...anchorProps}>
        {content}
      </a>
    );
  }

  const { disabled, ...buttonProps } = rest as Omit<NativeButtonProps, keyof ButtonVisualProps>;
  return (
    <button className={classes} disabled={disabled || isLoading} {...buttonProps}>
      {content}
    </button>
  );
};
