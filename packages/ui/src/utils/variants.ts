export type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
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
