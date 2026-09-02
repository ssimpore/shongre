export interface RelativeTimeOptions {
  locale?: string;
  referenceDate?: Date | string | number;
  style?: "long" | "short" | "narrow";
  /** Include relative direction copy such as "il y a" or "dans". */
  includeDirection?: boolean;
}

export function formatRelativeTime(
  input: Date | string | number,
  options: RelativeTimeOptions = {},
): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime()))
    return typeof input === "string" ? input : "";
  const reference =
    options.referenceDate instanceof Date
      ? options.referenceDate
      : new Date(options.referenceDate ?? Date.now());
  const seconds = Math.round((date.getTime() - reference.getTime()) / 1000);
  const absolute = Math.abs(seconds);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_629_800],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat(options.locale ?? "fr-FR", {
    numeric: "auto",
    style: options.style ?? "long",
  });
  const format = (value: number, unit: Intl.RelativeTimeFormatUnit) => {
    if (options.includeDirection !== false) {
      return formatter.format(value, unit);
    }

    return new Intl.NumberFormat(options.locale ?? "fr-FR", {
      style: "unit",
      unit,
      unitDisplay: options.style ?? "long",
    }).format(Math.abs(value));
  };
  if (absolute < 45) return format(0, "second");
  const [unit, divisor] = units.find(([, size]) => absolute >= size) ?? [
    "second",
    1,
  ];
  return format(Math.round(seconds / divisor), unit);
}
