import { describe, it, expect } from "vitest";
import {
  formatRelativeTimestamp,
  formatRelativeDate,
  formatPrice,
  formatDate,
  formatMoney,
  formatCurrencySymbol,
  getCurrencyDisplayName,
  formatPhoneNumber,
  formatLogTimestamp,
  plural,
} from "./formatters";

describe("formatRelativeTimestamp", () => {
  const baseDate = new Date("2026-08-17T12:00:00Z");

  it("handles under 45 seconds / just now", () => {
    const recent = new Date("2026-08-17T11:59:30Z");
    expect(formatRelativeTimestamp(recent, { referenceDate: baseDate })).toBe(
      "À l'instant",
    );
    expect(
      formatRelativeTimestamp(recent, {
        referenceDate: baseDate,
        locale: "en-US",
      }),
    ).toBe("Just now");
  });

  it("formats minutes ago properly in French and English", () => {
    const tenMinAgo = new Date("2026-08-17T11:50:00Z");
    expect(
      formatRelativeTimestamp(tenMinAgo, { referenceDate: baseDate }),
    ).toBe("Il y a 10 minutes");
    expect(
      formatRelativeTimestamp(tenMinAgo, {
        referenceDate: baseDate,
        style: "short",
      }),
    ).toBe("Il y a 10 min");
    expect(
      formatRelativeTimestamp(tenMinAgo, {
        referenceDate: baseDate,
        locale: "en-US",
      }),
    ).toBe("10 minutes ago");
    expect(
      formatRelativeTimestamp(tenMinAgo, {
        referenceDate: baseDate,
        locale: "en-US",
        style: "short",
      }),
    ).toBe("10m ago");

    const oneMinAgo = new Date("2026-08-17T11:59:00Z");
    expect(
      formatRelativeTimestamp(oneMinAgo, { referenceDate: baseDate }),
    ).toBe("Il y a 1 minute");
    expect(
      formatRelativeTimestamp(oneMinAgo, {
        referenceDate: baseDate,
        locale: "en-US",
      }),
    ).toBe("1 minute ago");
  });

  it("formats hours ago properly in French and English", () => {
    const twoHoursAgo = new Date("2026-08-17T10:00:00Z");
    expect(
      formatRelativeTimestamp(twoHoursAgo, { referenceDate: baseDate }),
    ).toBe("Il y a 2 heures");
    expect(
      formatRelativeTimestamp(twoHoursAgo, {
        referenceDate: baseDate,
        style: "short",
      }),
    ).toBe("Il y a 2 h");
    expect(
      formatRelativeTimestamp(twoHoursAgo, {
        referenceDate: baseDate,
        locale: "en-US",
      }),
    ).toBe("2 hours ago");
    expect(
      formatRelativeTimestamp(twoHoursAgo, {
        referenceDate: baseDate,
        locale: "en-US",
        style: "short",
      }),
    ).toBe("2h ago");

    const oneHourAgo = new Date("2026-08-17T11:00:00Z");
    expect(
      formatRelativeTimestamp(oneHourAgo, { referenceDate: baseDate }),
    ).toBe("Il y a 1 heure");
    expect(
      formatRelativeTimestamp(oneHourAgo, {
        referenceDate: baseDate,
        locale: "en-US",
      }),
    ).toBe("1 hour ago");
  });

  it("formats days ago properly in French and English", () => {
    const yesterday = new Date("2026-08-16T12:00:00Z");
    expect(
      formatRelativeTimestamp(yesterday, { referenceDate: baseDate }),
    ).toBe("Hier");
    expect(
      formatRelativeTimestamp(yesterday, {
        referenceDate: baseDate,
        numeric: "always",
      }),
    ).toBe("Il y a 1 jour");
    expect(
      formatRelativeTimestamp(yesterday, {
        referenceDate: baseDate,
        locale: "en-US",
      }),
    ).toBe("Yesterday");

    const threeDaysAgo = new Date("2026-08-14T12:00:00Z");
    expect(
      formatRelativeTimestamp(threeDaysAgo, { referenceDate: baseDate }),
    ).toBe("Il y a 3 jours");
    expect(
      formatRelativeTimestamp(threeDaysAgo, {
        referenceDate: baseDate,
        locale: "en-US",
      }),
    ).toBe("3 days ago");
  });

  it("formats weeks ago properly", () => {
    const twoWeeksAgo = new Date("2026-08-03T12:00:00Z");
    expect(
      formatRelativeTimestamp(twoWeeksAgo, { referenceDate: baseDate }),
    ).toBe("Il y a 2 semaines");
    expect(
      formatRelativeTimestamp(twoWeeksAgo, {
        referenceDate: baseDate,
        locale: "en-US",
      }),
    ).toBe("2 weeks ago");

    const oneWeekAgo = new Date("2026-08-10T12:00:00Z");
    expect(
      formatRelativeTimestamp(oneWeekAgo, { referenceDate: baseDate }),
    ).toBe("Il y a 1 semaine");
    expect(
      formatRelativeTimestamp(oneWeekAgo, {
        referenceDate: baseDate,
        locale: "en-US",
      }),
    ).toBe("1 week ago");
  });

  it("formats months and years properly", () => {
    const twoMonthsAgo = new Date("2026-06-17T12:00:00Z");
    expect(
      formatRelativeTimestamp(twoMonthsAgo, { referenceDate: baseDate }),
    ).toBe("Il y a 2 mois");
    expect(
      formatRelativeTimestamp(twoMonthsAgo, {
        referenceDate: baseDate,
        locale: "en-US",
      }),
    ).toBe("2 months ago");

    const twoYearsAgo = new Date("2024-08-17T12:00:00Z");
    expect(
      formatRelativeTimestamp(twoYearsAgo, { referenceDate: baseDate }),
    ).toBe("Il y a 2 ans");
    expect(
      formatRelativeTimestamp(twoYearsAgo, {
        referenceDate: baseDate,
        locale: "en-US",
      }),
    ).toBe("2 years ago");
  });

  it("handles invalid dates or null gracefully", () => {
    expect(formatRelativeTimestamp(null)).toBe("");
    expect(formatRelativeTimestamp(undefined)).toBe("");
    expect(formatRelativeTimestamp("invalid-date")).toBe("invalid-date");
  });
});

describe("formatRelativeDate compatibility", () => {
  it("delegates to formatRelativeTimestamp", () => {
    const dateStr = "2026-08-17T10:00:00Z";
    expect(formatRelativeDate(dateStr)).toBeDefined();
    expect(typeof formatRelativeDate(dateStr)).toBe("string");
  });
});

describe("other formatters", () => {
  it("formats prices properly", () => {
    expect(formatPrice(120)).toContain("120");
    expect(formatPrice(0)).toBe("Don / Gratuit");
    expect(formatPrice(50)).toContain("50");
  });

  it("formats minor-unit money without treating zero as a donation", () => {
    expect(
      formatMoney({ amountMinor: 0, currency: "EUR" }, { locale: "fr-FR" }),
    ).toContain("0");
    expect(
      formatMoney(
        { amountMinor: 1_425_050, currency: "EUR" },
        { locale: "fr-FR" },
      ),
    ).toContain("14 250,50");
  });

  it.each([
    ["en-US", "JPY", 12_345, /12,345/],
    ["en-US", "EUR", 12_345, /123\.45/],
    ["en-US", "BHD", 12_345, /12\.345/],
  ])(
    "uses the ISO minor-unit exponent for %s/%s",
    (locale, currency, amountMinor, expected) => {
      expect(formatMoney({ amountMinor, currency }, { locale })).toMatch(
        expected,
      );
    },
  );

  it("derives currency labels and symbols from Intl", () => {
    expect(formatCurrencySymbol("EUR", "fr-FR")).toBe("€");
    expect(getCurrencyDisplayName("EUR", "en-US")).toBe("Euro");
  });

  it.each([
    ["fr-FR", "EUR", /1[\s.]?500/, /€/],
    ["fr-BE", "EUR", /1[\s.]?500/, /€/],
    ["fr-CH", "CHF", /1[\s']?500/, /CHF/],
    ["fr-SN", "XOF", /150[\s.]?000/, /(F\s*CFA|XOF)/],
    ["fr-BF", "XOF", /150[\s.]?000/, /(F\s*CFA|XOF)/],
  ])(
    "formats authoritative minor units for %s/%s",
    (locale, currency, amount, unit) => {
      const formatted = formatMoney(
        { amountMinor: 150_000, currency },
        { locale },
      ).replace(/\u202f|\u00a0/g, " ");
      expect(formatted).toMatch(amount);
      expect(formatted).toMatch(unit);
    },
  );

  it("formats dates properly", () => {
    expect(formatDate("2026-08-17T10:00:00Z")).toBeDefined();
  });

  it("formats phone numbers properly", () => {
    expect(formatPhoneNumber("0612345678")).toBe("06 12 34 56 78");
  });
});

describe("plural", () => {
  it('keeps the singular at 1 — the "1 rubriques" bug', () => {
    expect(plural(1, "rubrique")).toBe("1 rubrique");
  });

  it("treats 0 as singular, per French usage", () => {
    expect(plural(0, "annonce")).toBe("0 annonce");
  });

  it("pluralises from 2 upward", () => {
    expect(plural(2, "rubrique")).toBe("2 rubriques");
    expect(plural(17, "annonce")).toBe("17 annonces");
  });

  it("accepts an irregular plural form", () => {
    expect(plural(2, "journal", "journaux")).toBe("2 journaux");
    expect(plural(1, "journal", "journaux")).toBe("1 journal");
  });
});

describe("formatLogTimestamp", () => {
  it("qualifies older entries with a date so ordering stays legible", () => {
    // Four audit entries spanning six days used to render as bare clock times
    // (16:32, 11:15, 18:45, 13:20), which reads as unsorted.
    const older = formatLogTimestamp("2020-08-12T16:45:00Z");
    expect(older).toMatch(/\d/);
    expect(older).not.toMatch(/^\d{2}:\d{2}$/);
    expect(older).toContain("2020");
  });

  it("uses relative wording for today and yesterday", () => {
    const now = new Date();
    expect(formatLogTimestamp(now.toISOString())).toContain("Aujourd'hui");
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(formatLogTimestamp(yesterday.toISOString())).toContain("Hier");
  });

  it("omits seconds", () => {
    expect(formatLogTimestamp("2020-08-12T16:45:30Z")).not.toMatch(
      /:\d{2}:\d{2}/,
    );
  });

  it("returns the input unchanged when it is not a date", () => {
    expect(formatLogTimestamp("not-a-date")).toBe("not-a-date");
  });
});
