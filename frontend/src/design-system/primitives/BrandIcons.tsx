import type { SVGProps } from "react";

type BrandIconProps = SVGProps<SVGSVGElement>;

const commonProps = {
  "aria-hidden": true,
  focusable: false,
  viewBox: "0 0 24 24",
} as const;

export function AppleBrandIcon(props: BrandIconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path
        fill="currentColor"
        d="M17.1 12.6c0-2.4 2-3.6 2.1-3.7a4.6 4.6 0 0 0-3.6-1.9c-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.8a4.9 4.9 0 0 0-4.1 2.5c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.5 1.3-.1 1.8-.8 3.4-.8 1.5 0 2 .8 3.4.8 1.4 0 2.3-1.2 3.1-2.5a11 11 0 0 0 1.4-2.9 4.2 4.2 0 0 1-2.1-4.3ZM14.6 5.4A4.3 4.3 0 0 0 15.7 2a4.7 4.7 0 0 0-3.1 1.6 4 4 0 0 0-1.1 3.2 3.9 3.9 0 0 0 3.1-1.4Z"
      />
    </svg>
  );
}

export function GooglePlayBrandIcon(props: BrandIconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path
        fill="currentColor"
        d="M4.6 3.2a1.4 1.4 0 0 0-.4 1v15.6c0 .4.2.8.5 1l9-8.8-9.1-8.8Zm10.2 9.9-2.3 2.3-6.1 5.9c.3 0 .7-.1 1-.3l10.8-6.2-3.4-1.7Zm3.4-3.9L7.4 3c-.3-.2-.7-.3-1-.3l8.4 8.2 3.4-1.7Zm1.2.7-3.5 2.1 3.5 2.1c.9.5.9 1.3.9 2.1s0-5 0-4.2c0-.8 0-1.6-.9-2.1Z"
      />
    </svg>
  );
}

export function InstagramBrandIcon(props: BrandIconProps) {
  return (
    <svg
      {...commonProps}
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookBrandIcon(props: BrandIconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path
        fill="currentColor"
        d="M13.7 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.7 1.8-1.7h1.9V2.5c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.8v2.3H6.8V13h3.1v9h3.8Z"
      />
    </svg>
  );
}

export function LinkedInBrandIcon(props: BrandIconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path
        fill="currentColor"
        d="M5.3 7.8A2.3 2.3 0 1 0 5.3 3a2.3 2.3 0 0 0 0 4.7ZM3.3 21h4V9.2h-4V21Zm6.4 0h4v-6.6c0-1.7.3-3.4 2.5-3.4s2.2 2 2.2 3.5V21h4v-7.3c0-3.6-.8-6.4-5-6.4-2 0-3.4 1.1-4 2.1h-.1V9.2H9.7V21Z"
      />
    </svg>
  );
}

export function YouTubeBrandIcon(props: BrandIconProps) {
  return (
    <svg {...commonProps} {...props}>
      <path
        fill="currentColor"
        d="M22 8.1a3 3 0 0 0-2.1-2.2C18 5.4 12 5.4 12 5.4s-6 0-7.9.5A3 3 0 0 0 2 8.1 31 31 0 0 0 1.5 12c0 1.3.2 2.6.5 3.9a3 3 0 0 0 2.1 2.2c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.2c.3-1.3.5-2.6.5-3.9s-.2-2.6-.5-3.9ZM10 15.3V8.7l5.2 3.3-5.2 3.3Z"
      />
    </svg>
  );
}
