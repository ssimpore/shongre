import React from 'react';
import { cn } from '../utils/variants';

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  size?:
    | 'display-lg'
    | 'display-md'
    | 'display-sm'
    | 'heading-xl'
    | 'heading-lg'
    | 'heading-md'
    | 'heading-sm'
    | 'heading-xs';
  family?: 'sans' | 'display';
  tone?: 'main' | 'secondary' | 'inverse' | 'primary';
}

const headingSizes = {
  'display-lg': 'text-display-lg font-extrabold tracking-tighter',
  'display-md': 'text-display-md font-extrabold tracking-tighter',
  'display-sm': 'text-display-sm font-bold tracking-tight',
  'heading-xl': 'text-heading-xl font-extrabold tracking-tight',
  'heading-lg': 'text-heading-lg font-bold tracking-tight',
  'heading-md': 'text-heading-md font-bold tracking-tight',
  'heading-sm': 'text-heading-sm font-bold',
  'heading-xs': 'text-heading-xs font-semibold',
} as const;

const tones = {
  main: 'text-text-main',
  secondary: 'text-text-secondary',
  inverse: 'text-text-inverse',
  primary: 'text-primary',
} as const;

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  (
    { as: Component = 'h2', size = 'heading-md', family = 'sans', tone = 'main', className, ...props },
    ref,
  ) => (
    <Component
      ref={ref}
      className={cn(headingSizes[size], family === 'display' ? 'font-display' : 'font-sans', tones[tone], className)}
      {...props}
    />
  ),
);
Heading.displayName = 'Heading';

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'p' | 'span' | 'div' | 'label';
  size?: 'body-lg' | 'body-md' | 'body-sm' | 'label-md' | 'label-sm' | 'caption' | 'overline';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  tone?: 'main' | 'secondary' | 'muted' | 'disabled' | 'inverse' | 'primary' | 'success' | 'warning' | 'danger';
}

const textSizes = {
  'body-lg': 'text-body-lg',
  'body-md': 'text-body-md',
  'body-sm': 'text-body-sm',
  'label-md': 'text-label-md',
  'label-sm': 'text-label-sm',
  caption: 'text-caption',
  overline: 'text-overline uppercase tracking-wider',
} as const;

const textTones = {
  ...tones,
  muted: 'text-text-muted',
  disabled: 'text-text-disabled',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

export const Text = React.forwardRef<HTMLElement, TextProps>(
  (
    { as: Component = 'p', size = 'body-md', weight = 'normal', tone = 'main', className, ...props },
    ref,
  ) => (
    <Component
      ref={ref as never}
      className={cn(textSizes[size], `font-${weight}`, textTones[tone], className)}
      {...props}
    />
  ),
);
Text.displayName = 'Text';
