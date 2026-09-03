import React from "react";

export interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 country code. */
  countryCode: string;
  /** Visual size; the aspect ratio stays fixed across platforms. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-3 w-4",
  md: "h-3.5 w-5",
  lg: "h-4 w-6",
} as const;

function FlagArtwork({ countryCode }: { countryCode: string }) {
  switch (countryCode) {
    case "FR":
      return (
        <>
          <path fill="#0055A4" d="M0 0h8v18H0z" />
          <path fill="#FFF" d="M8 0h8v18H8z" />
          <path fill="#EF4135" d="M16 0h8v18h-8z" />
        </>
      );
    case "BE":
      return (
        <>
          <path fill="#2D2926" d="M0 0h8v18H0z" />
          <path fill="#FFCD00" d="M8 0h8v18H8z" />
          <path fill="#C8102E" d="M16 0h8v18h-8z" />
        </>
      );
    case "DE":
      return (
        <>
          <path fill="#000" d="M0 0h24v6H0z" />
          <path fill="#D00" d="M0 6h24v6H0z" />
          <path fill="#FFCE00" d="M0 12h24v6H0z" />
        </>
      );
    case "ES":
      return (
        <>
          <path fill="#AA151B" d="M0 0h24v18H0z" />
          <path fill="#F1BF00" d="M0 4.5h24v9H0z" />
        </>
      );
    case "GB":
      return (
        <>
          <path fill="#012169" d="M0 0h24v18H0z" />
          <path stroke="#FFF" strokeWidth="4" d="m0 0 24 18M24 0 0 18" />
          <path stroke="#C8102E" strokeWidth="2" d="m0 0 24 18M24 0 0 18" />
          <path stroke="#FFF" strokeWidth="6" d="M12 0v18M0 9h24" />
          <path stroke="#C8102E" strokeWidth="3.5" d="M12 0v18M0 9h24" />
        </>
      );
    case "IT":
      return (
        <>
          <path fill="#009246" d="M0 0h8v18H0z" />
          <path fill="#FFF" d="M8 0h8v18H8z" />
          <path fill="#CE2B37" d="M16 0h8v18h-8z" />
        </>
      );
    case "NL":
      return (
        <>
          <path fill="#AE1C28" d="M0 0h24v6H0z" />
          <path fill="#FFF" d="M0 6h24v6H0z" />
          <path fill="#21468B" d="M0 12h24v6H0z" />
        </>
      );
    case "CH":
      return (
        <>
          <path fill="#D52B1E" d="M0 0h24v18H0z" />
          <path fill="#FFF" d="M10 3h4v12h-4zM6 7h12v4H6z" />
        </>
      );
    case "LU":
      return (
        <>
          <path fill="#EF3340" d="M0 0h24v6H0z" />
          <path fill="#FFF" d="M0 6h24v6H0z" />
          <path fill="#00A3E0" d="M0 12h24v6H0z" />
        </>
      );
    case "SN":
      return (
        <>
          <path fill="#00853F" d="M0 0h8v18H0z" />
          <path fill="#FDEF42" d="M8 0h8v18H8z" />
          <path fill="#E31B23" d="M16 0h8v18h-8z" />
          <path
            fill="#00853F"
            d="m12 4.7 1.05 2.14 2.36.34-1.7 1.66.4 2.34L12 10.07l-2.11 1.11.4-2.34-1.7-1.66 2.36-.34z"
          />
        </>
      );
    case "BF":
      return (
        <>
          <path fill="#EF2B2D" d="M0 0h24v9H0z" />
          <path fill="#009E49" d="M0 9h24v9H0z" />
          <path
            fill="#FCD116"
            d="m12 4.7 1.05 2.14 2.36.34-1.7 1.66.4 2.34L12 10.07l-2.11 1.11.4-2.34-1.7-1.66 2.36-.34z"
          />
        </>
      );
    default:
      return (
        <>
          <path fill="#F5F5F4" d="M0 0h24v18H0z" />
          <circle cx="12" cy="9" r="5" fill="none" stroke="#78716C" />
          <path
            fill="none"
            stroke="#78716C"
            d="M7 9h10M12 4a8 8 0 0 0 0 10M12 4a8 8 0 0 1 0 10"
          />
        </>
      );
  }
}

/**
 * A font-independent country flag.
 *
 * Flag emoji are regional-indicator glyphs: Apple combines them into a flag,
 * while Windows can render the two country letters instead. Keeping the small
 * set of supported-market artwork in SVG makes the control deterministic on
 * macOS, Windows and Linux without a third-party image request.
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({
  countryCode,
  size = "md",
  className = "",
}) => {
  const normalizedCode = countryCode.trim().toUpperCase();

  return (
    <svg
      viewBox="0 0 24 18"
      className={`inline-block shrink-0 overflow-hidden rounded-sm ${SIZE_CLASSES[size]} ${className}`}
      aria-hidden="true"
      focusable="false"
      data-country-code={normalizedCode}
    >
      <FlagArtwork countryCode={normalizedCode} />
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="17"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
      />
    </svg>
  );
};
