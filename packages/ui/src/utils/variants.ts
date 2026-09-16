import { extendTailwindMerge } from "tailwind-merge";
import {
  themeContainers,
  themeRadii,
  themeShadows,
  themeSpacing,
  themeText,
} from "@shongre/design-tokens";

export type ClassValue = string | false | null | undefined;

/*
 * Tailwind conflicts are resolved by stylesheet order, not attribute order.
 *
 * `cn` used to be `values.filter(Boolean).join(" ")`, so when a primitive
 * emitted its own utility and a caller passed a competing one, whichever class
 * the compiler happened to emit later won. That is invisible in review and in
 * every semantic test, and it shipped real defects three times — `Button`
 * (display), `FavoriteButton` (position) and the form fields (width) — each
 * patched afterwards with its own bespoke `*_SET_BY_CALLER` regex guard.
 *
 * It also produced a subtler failure the guards could not model. `Skeleton`
 * emits a height from its shape map and appends the caller's `className`, and
 * because `h-*` utilities are emitted in ascending numeric order, the base wins
 * only when the caller asks for something *smaller*. Five `h-3` overrides
 * against `shape="line"`'s `h-4` were dead code while two larger ones worked by
 * luck — the same API succeeding and failing within one file.
 *
 * `tailwind-merge` resolves all of it by class group, once, in the right
 * direction: last wins, which is what call sites already assume.
 */

/**
 * The project's named scales, read from the token package rather than copied.
 *
 * `tailwind-merge` only knows Tailwind's built-in scales, so without this a
 * custom value like `h-control-touch` is unrecognised and left alongside a
 * conflicting `h-8` — exactly the merge this exists to perform. Deriving the
 * lists from the same objects that generate `tokens.css` means a new token is
 * understood the moment it is declared, with no second list to keep in step.
 */
const named = (record: object, extra: string[] = []) => [
  ...Object.keys(record).filter((key) => !key.includes("--")),
  ...extra,
];

const spacingValues = named(themeSpacing);
const radiusValues = named(themeRadii);
const shadowValues = named(themeShadows);
const textValues = named(themeText);
const containerValues = named(themeContainers);

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // Sizing scales share `--spacing-*`, so every group below takes the same list.
      w: [{ w: [...spacingValues, ...containerValues] }],
      h: [{ h: spacingValues }],
      size: [{ size: spacingValues }],
      "min-w": [{ "min-w": [...spacingValues, ...containerValues] }],
      "min-h": [{ "min-h": spacingValues }],
      "max-w": [{ "max-w": [...spacingValues, ...containerValues] }],
      "max-h": [{ "max-h": spacingValues }],
      p: [{ p: spacingValues }],
      px: [{ px: spacingValues }],
      py: [{ py: spacingValues }],
      pt: [{ pt: spacingValues }],
      pr: [{ pr: spacingValues }],
      pb: [{ pb: spacingValues }],
      pl: [{ pl: spacingValues }],
      m: [{ m: spacingValues }],
      mx: [{ mx: spacingValues }],
      my: [{ my: spacingValues }],
      gap: [{ gap: spacingValues }],
      "gap-x": [{ "gap-x": spacingValues }],
      "gap-y": [{ "gap-y": spacingValues }],
      rounded: [{ rounded: radiusValues }],
      shadow: [{ shadow: shadowValues }],
      "font-size": [{ text: textValues }],
    },
  },
});

/**
 * Joins class names, with later values overriding earlier conflicting ones.
 *
 * Callers may assume attribute order wins: `cn(base, props.className)` lets a
 * call site override anything the primitive set.
 */
export function cn(...values: ClassValue[]): string {
  return twMerge(values.filter(Boolean).join(" "));
}

type VariantSchema = Record<string, Record<string, string>>;
type VariantSelection<TSchema extends VariantSchema> = {
  [TKey in keyof TSchema]?: keyof TSchema[TKey];
};

export interface VariantRecipe<TSchema extends VariantSchema> {
  base?: string;
  variants: TSchema;
  defaultVariants?: VariantSelection<TSchema>;
}

export function createVariants<const TSchema extends VariantSchema>({
  base = "",
  variants,
  defaultVariants = {},
}: VariantRecipe<TSchema>) {
  return (
    selection: VariantSelection<TSchema> & { className?: string } = {},
  ) => {
    const classes: ClassValue[] = [base];
    for (const key of Object.keys(variants) as Array<keyof TSchema>) {
      const value = selection[key] ?? defaultVariants[key];
      if (value !== undefined) classes.push(variants[key][value as string]);
    }
    classes.push(selection.className);
    return cn(...classes);
  };
}

export type VariantProps<TFactory> = TFactory extends (
  selection?: infer TSelection,
) => string
  ? Omit<TSelection, "className">
  : never;
