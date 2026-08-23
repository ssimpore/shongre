import { describe, expect, it } from "vitest";
import { humanizeIdentifier, labelIdentifier } from "./identifier-label";

describe("identifier labels", () => {
  it.each([
    ["pending_review", "En cours d’examen"],
    ["billing_admin", "Gestionnaire de facturation"],
    ["maxActiveJobs", "Offres actives maximum"],
    ["job.manage", "Gérer les offres"],
    ["search_bump", "Remonter l’annonce"],
    ["video", "Visioconférence"],
    ["bank_payout", "Compte de versement"],
    ["potential_scam", "Arnaque potentielle"],
    ["team.manage", "Gérer l’équipe"],
    ["leads:respond", "Répondre aux demandes"],
  ])("maps %s to readable product copy", (identifier, expected) => {
    expect(labelIdentifier(identifier)).toBe(expected);
  });

  it("removes technical separators from an unknown identifier", () => {
    expect(humanizeIdentifier("future.API_status")).toBe("Future API status");
  });
});
