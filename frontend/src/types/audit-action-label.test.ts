import { describe, expect, it } from "vitest";
import { auditActionLabel } from ".";

describe("auditActionLabel", () => {
  it.each([
    ["MARKET_CONFIG_UPDATE", "Configuration du marché modifiée"],
    ["AUTO_FLAG_SUSPICIOUS_PRICE", "Prix suspect signalé automatiquement"],
  ])("renders %s as readable French copy", (action, expected) => {
    expect(auditActionLabel(action)).toBe(expected);
  });

  it("keeps unknown event types legible", () => {
    expect(auditActionLabel("FUTURE_AUDIT_EVENT")).toBe("FUTURE AUDIT EVENT");
  });
});
