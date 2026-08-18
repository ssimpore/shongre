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
  'inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-fast rounded-xl cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:cursor-not-allowed active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const sizeStyles = {
  sm: 'text-xs px-3 py-1.5 gap-1.5 h-8 font-semibold',
  md: 'text-sm px-4 py-2 gap-2 h-10 font-bold',
  lg: 'text-base px-5 py-2.5 gap-2.5 h-12 font-bold',
};

const variantStyles = {
  primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-xs hover:shadow-sm',
  secondary: 'bg-bg-subtle text-stone-900 hover:bg-bg-muted active:bg-stone-300',
  outline: 'border border-border-base bg-bg-surface text-stone-900 hover:bg-bg-base hover:border-border-hover active:bg-bg-subtle shadow-2xs',
  ghost: 'bg-transparent text-stone-700 hover:text-stone-950 hover:bg-bg-subtle active:bg-bg-muted',
  danger: 'bg-danger text-white hover:bg-danger active:bg-red-800 shadow-xs',
  pro: 'bg-stone-900 text-white hover:bg-stone-800 shadow-xs',
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
