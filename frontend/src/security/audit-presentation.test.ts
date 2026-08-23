import { describe, expect, it } from "vitest";
import {
  auditFieldLabel,
  formatAuditDateTime,
  formatAuditValue,
} from "./audit-presentation";

describe("audit presentation", () => {
  it("formats ISO timestamps as readable dates", () => {
    const rendered = formatAuditDateTime("2026-08-15T14:32:00Z");
    expect(rendered).toContain("15 août 2026");
    expect(rendered).not.toContain("T14:32:00Z");
  });

  it.each([
    ["status", "Statut"],
    ["credentialStatus", "État des identifiants"],
    ["marketOverrides", "Surcharges par marché"],
  ])("labels the %s field", (field, expected) => {
    expect(auditFieldLabel(field)).toBe(expected);
  });

  it.each([
    ["verified", "status", "Vérifié"],
    ["pro_verified", "badge", "Professionnel vérifié"],
    [
      "offline_payment_solicitation",
      "reason",
      "Demande de paiement hors plateforme",
    ],
    ["market_manager", "role", "Responsable Marché"],
    ["BE", "countries", "Belgique (BE)"],
  ])("labels audit value %s", (value, field, expected) => {
    expect(formatAuditValue(value, field)).toBe(expected);
  });

  it("masks secret-like values", () => {
    expect(formatAuditValue("sk-secret", "apiKey")).toBe("Valeur masquée");
  });
});
