import type { Money } from "@shongre/contracts";
import {
  getCurrencyMinorUnitDigits,
  minorToMajorAmount,
} from "@shongre/shared";
import {
  DEFAULT_MARKET_CURRENCY,
  DEFAULT_MARKET_LOCALE,
} from "../configuration/market-baseline";

/**
 * Returns the locale-aware symbol used by `Intl` for a currency. Keeping this
 * next to the money formatter prevents components from growing their own
 * EUR/USD/GBP switch statements as new markets are enabled.
 */
export function formatCurrencySymbol(
  currency: string,
  locale: string = DEFAULT_MARKET_LOCALE,
): string {
  const cleanCurrency = currency.trim().toUpperCase();
  if (!cleanCurrency) return "";

  try {
    const currencyPart = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cleanCurrency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .formatToParts(0)
      .find((part) => part.type === "currency");
    return currencyPart?.value || cleanCurrency;
  } catch {
    return cleanCurrency;
  }
}

/** Human-readable currency name for regional preference controls. */
export function getCurrencyDisplayName(
  currency: string,
  locale: string = DEFAULT_MARKET_LOCALE,
): string {
  const cleanCurrency = currency.trim().toUpperCase();
  if (!cleanCurrency) return "";

  try {
    return (
      new Intl.DisplayNames([locale], { type: "currency" }).of(cleanCurrency) ||
      cleanCurrency
    );
  } catch {
    return cleanCurrency;
  }
}

/** Formats authoritative minor-unit money, including a legitimate zero value. */
export function formatMoney(
  money: Money,
  options: { locale?: string; currencyDisplay?: "symbol" | "code" } = {},
): string {
  const locale = options.locale || DEFAULT_MARKET_LOCALE;
  try {
    const fractionDigits = getCurrencyMinorUnitDigits(money.currency, locale);
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: money.currency,
      currencyDisplay: options.currencyDisplay || "symbol",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(minorToMajorAmount(money.amountMinor, money.currency, locale));
  } catch {
    return `${money.amountMinor} ${money.currency}`;
  }
}

/**
 * Format price in EUR or current market currency with proper non-breaking spaces and decimals
 */
export function formatPrice(
  amount: number,
  options: {
    showCurrency?: boolean;
    isFreeDonation?: boolean;
    locale?: string;
    currency?: string;
    marketCode?: string;
  } = {},
): string {
  if (options.isFreeDonation || amount === 0) {
    return "Don / Gratuit";
  }

  const locale = options.locale || DEFAULT_MARKET_LOCALE;
  const currency = options.currency || DEFAULT_MARKET_CURRENCY;

  const formatted = new Intl.NumberFormat(locale, {
    style: options.showCurrency !== false ? "currency" : "decimal",
    currency: currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return formatted;
}

export interface RelativeTimestampOptions {
  locale?: string;
  referenceDate?: Date | string | number;
  style?: "long" | "short" | "narrow";
  numeric?: "auto" | "always";
  /**
   * If true (default), returns natural conversational relative text (e.g. "Il y a 2 heures", "2 hours ago", "Hier").
   * If false, returns just the unit without prefix/suffix (e.g. "2 heures", "2 hours").
   */
  addPrefix?: boolean;
}

/**
 * Formats a date, ISO string, or timestamp into a relative time representation (e.g. "Il y a 2 heures", "2 hours ago", "À l'instant").
 * Applies consistently across all ad listing cards and metadata sections.
 */
export function formatRelativeTimestamp(
  dateInput: string | number | Date | null | undefined,
  options: RelativeTimestampOptions = {},
): string {
  if (!dateInput) return "";

  try {
    const targetDate =
      typeof dateInput === "object" && dateInput instanceof Date
        ? dateInput
        : new Date(dateInput);
    if (isNaN(targetDate.getTime())) {
      return typeof dateInput === "string" ? dateInput : "";
    }

    const refDate = options.referenceDate
      ? typeof options.referenceDate === "object" &&
        options.referenceDate instanceof Date
        ? options.referenceDate
        : new Date(options.referenceDate)
      : new Date();

    const locale = options.locale || DEFAULT_MARKET_LOCALE;
    const isFrench = locale.toLowerCase().startsWith("fr");
    const isEnglish = locale.toLowerCase().startsWith("en");
    const style = options.style || "long";
    const numeric = options.numeric || "auto";
    const addPrefix = options.addPrefix !== false;

    const diffMs = refDate.getTime() - targetDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.max(1, Math.round(diffDays / 30.4375));
    const diffYears = Math.max(1, Math.round(diffDays / 365.25));

    // Under 45 seconds or future
    if (diffSeconds < 45) {
      if (isFrench) return "À l'instant";
      if (isEnglish) return "Just now";
      return "À l'instant";
    }

    // Minutes (< 60 minutes)
    if (diffMinutes < 60) {
      if (isFrench) {
        if (style === "short" || style === "narrow") {
          return addPrefix ? `Il y a ${diffMinutes} min` : `${diffMinutes} min`;
        }
        const unit = diffMinutes === 1 ? "minute" : "minutes";
        return addPrefix
          ? `Il y a ${diffMinutes} ${unit}`
          : `${diffMinutes} ${unit}`;
      }
      if (isEnglish) {
        if (style === "short" || style === "narrow") {
          return addPrefix ? `${diffMinutes}m ago` : `${diffMinutes}m`;
        }
        const unit = diffMinutes === 1 ? "minute" : "minutes";
        return addPrefix
          ? `${diffMinutes} ${unit} ago`
          : `${diffMinutes} ${unit}`;
      }
      try {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric, style });
        return rtf.format(-diffMinutes, "minute");
      } catch {
        return `Il y a ${diffMinutes} min`;
      }
    }

    // Hours (< 24 hours)
    if (diffHours < 24) {
      if (isFrench) {
        if (style === "short" || style === "narrow") {
          return addPrefix ? `Il y a ${diffHours} h` : `${diffHours} h`;
        }
        const unit = diffHours === 1 ? "heure" : "heures";
        return addPrefix
          ? `Il y a ${diffHours} ${unit}`
          : `${diffHours} ${unit}`;
      }
      if (isEnglish) {
        if (style === "short" || style === "narrow") {
          return addPrefix ? `${diffHours}h ago` : `${diffHours}h`;
        }
        const unit = diffHours === 1 ? "hour" : "hours";
        return addPrefix ? `${diffHours} ${unit} ago` : `${diffHours} ${unit}`;
      }
      try {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric, style });
        return rtf.format(-diffHours, "hour");
      } catch {
        return `Il y a ${diffHours} h`;
      }
    }

    // Days (< 7 days)
    if (diffDays < 7) {
      if (isFrench) {
        if (diffDays === 1 && numeric === "auto") {
          return "Hier";
        }
        if (style === "short" || style === "narrow") {
          return addPrefix ? `Il y a ${diffDays} j` : `${diffDays} j`;
        }
        const unit = diffDays === 1 ? "jour" : "jours";
        return addPrefix ? `Il y a ${diffDays} ${unit}` : `${diffDays} ${unit}`;
      }
      if (isEnglish) {
        if (diffDays === 1 && numeric === "auto") {
          return "Yesterday";
        }
        if (style === "short" || style === "narrow") {
          return addPrefix ? `${diffDays}d ago` : `${diffDays}d`;
        }
        const unit = diffDays === 1 ? "day" : "days";
        return addPrefix ? `${diffDays} ${unit} ago` : `${diffDays} ${unit}`;
      }
      try {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric, style });
        return rtf.format(-diffDays, "day");
      } catch {
        return `Il y a ${diffDays} j`;
      }
    }

    // Weeks (< 30 days)
    if (diffDays < 30) {
      const weeks = Math.max(1, diffWeeks);
      if (isFrench) {
        if (style === "short" || style === "narrow") {
          return addPrefix ? `Il y a ${weeks} sem.` : `${weeks} sem.`;
        }
        const unit = weeks === 1 ? "semaine" : "semaines";
        return addPrefix ? `Il y a ${weeks} ${unit}` : `${weeks} ${unit}`;
      }
      if (isEnglish) {
        if (style === "short" || style === "narrow") {
          return addPrefix ? `${weeks}w ago` : `${weeks}w`;
        }
        const unit = weeks === 1 ? "week" : "weeks";
        return addPrefix ? `${weeks} ${unit} ago` : `${weeks} ${unit}`;
      }
      try {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric, style });
        return rtf.format(-weeks, "week");
      } catch {
        return `Il y a ${weeks} sem.`;
      }
    }

    // Months (< 365 days)
    if (diffDays < 365) {
      const months = Math.min(11, Math.max(1, diffMonths));
      if (isFrench) {
        return addPrefix ? `Il y a ${months} mois` : `${months} mois`;
      }
      if (isEnglish) {
        if (style === "short" || style === "narrow") {
          return addPrefix ? `${months}mo ago` : `${months}mo`;
        }
        const unit = months === 1 ? "month" : "months";
        return addPrefix ? `${months} ${unit} ago` : `${months} ${unit}`;
      }
      try {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric, style });
        return rtf.format(-months, "month");
      } catch {
        return `Il y a ${months} mois`;
      }
    }

    // Years (>= 365 days)
    const years = Math.max(1, diffYears);
    if (isFrench) {
      if (style === "short" || style === "narrow") {
        return addPrefix ? `Il y a ${years} an` : `${years} an`;
      }
      const unit = years === 1 ? "an" : "ans";
      return addPrefix ? `Il y a ${years} ${unit}` : `${years} ${unit}`;
    }
    if (isEnglish) {
      if (style === "short" || style === "narrow") {
        return addPrefix ? `${years}y ago` : `${years}y`;
      }
      const unit = years === 1 ? "year" : "years";
      return addPrefix ? `${years} ${unit} ago` : `${years} ${unit}`;
    }
    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric, style });
      return rtf.format(-years, "year");
    } catch {
      return `Il y a ${years} an${years > 1 ? "s" : ""}`;
    }
  } catch {
    return typeof dateInput === "string" ? dateInput : "";
  }
}

/**
 * Format date in localized format or relative time (e.g. "Il y a 2 heures", "Hier", "Il y a 3 jours")
 */
export function formatRelativeDate(
  isoDateString: string,
  locale?: string,
): string {
  return formatRelativeTimestamp(isoDateString, { locale });
}

/**
 * Format date in full localized date string (e.g. "17 août 2026")
 */
export function formatDate(isoDateString: string, locale?: string): string {
  try {
    const date = new Date(isoDateString);
    const activeLocale = locale || DEFAULT_MARKET_LOCALE;
    return date.toLocaleDateString(activeLocale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDateString;
  }
}

/**
 * French pluralisation for counted nouns.
 *
 * Counts were concatenated with a hard-coded `s`, which shipped "1 rubriques" to
 * the homepage. French treats 0 as singular ("0 rubrique"), unlike English — so
 * this cannot be `n === 1 ? …` alone.
 *
 *   plural(1, 'rubrique')            → "1 rubrique"
 *   plural(4, 'rubrique')            → "4 rubriques"
 *   plural(0, 'annonce')             → "0 annonce"
 *   plural(2, 'journal', 'journaux') → "2 journaux"
 */
export function plural(
  count: number,
  singular: string,
  pluralForm?: string,
): string {
  const isPlural = Math.abs(count) >= 2;
  const word = isPlural ? (pluralForm ?? `${singular}s`) : singular;
  return `${count} ${word}`;
}

/**
 * Timestamp for log and event rows: date-qualified, so a correctly sorted list
 * never *looks* unsorted.
 *
 * A bare `toLocaleTimeString` renders entries spanning several days as bare
 * clock times ("16:32", "11:15", "18:45"), which reads as random order. Today
 * and yesterday stay relative because that is how people scan recent activity;
 * anything older carries its date. Seconds are omitted — they were always `:00`
 * and added noise without information.
 */
export function formatLogTimestamp(
  isoDateString: string,
  locale?: string,
): string {
  try {
    const date = new Date(isoDateString);
    if (Number.isNaN(date.getTime())) return isoDateString;
    const activeLocale = locale || DEFAULT_MARKET_LOCALE;
    const time = date.toLocaleTimeString(activeLocale, {
      hour: "2-digit",
      minute: "2-digit",
    });

    const startOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayDelta = Math.round(
      (startOfDay(new Date()) - startOfDay(date)) / 86_400_000,
    );

    if (dayDelta === 0) return `Aujourd'hui ${time}`;
    if (dayDelta === 1) return `Hier ${time}`;

    const sameYear = date.getFullYear() === new Date().getFullYear();
    const day = date.toLocaleDateString(activeLocale, {
      day: "numeric",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
    });
    return `${day} ${time}`;
  } catch {
    return isoDateString;
  }
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10 && cleaned.startsWith("0")) {
    return cleaned.replace(
      /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
      "$1 $2 $3 $4 $5",
    );
  }
  return phone;
}

/**
 * Calculate buyer protection fee
 */
export function calculateBuyerFee(
  price: number,
  feePercent: number,
  fixedFee: number,
): number {
  if (price <= 0) return 0;
  const variable = price * feePercent;
  return Math.round((variable + fixedFee) * 100) / 100;
}
