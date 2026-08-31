import { describe, expect, it } from "vitest";
import {
  renderNotFoundDocument,
  resolveNotFoundPresentation,
} from "./not-found-presentation";

describe("not-found presentation", () => {
  it.each([
    ["/annonce/absente", "Annonce introuvable", "/recherche"],
    ["/boutique/inconnue", "Profil introuvable", "/professionnels"],
    ["/emploi/offre/absente", "Offre introuvable", "/emploi"],
    ["/collections/inconnue", "Collection introuvable", "/collections"],
    ["/auto/vehicule/inconnu", "Véhicule introuvable", "/auto"],
    ["/immo/bien/inconnu", "Bien introuvable", "/immo"],
    [
      "/education/professeur/inconnu",
      "Profil professeur introuvable",
      "/education",
    ],
    ["/route-inconnue", "Page introuvable", "/"],
  ])("maps %s to a safe recovery surface", (pathname, title, returnHref) => {
    expect(resolveNotFoundPresentation(undefined, pathname)).toMatchObject({
      title,
      returnHref,
    });
  });

  it("renders a token-backed, non-indexable document without inline element styles", () => {
    const html = renderNotFoundDocument(
      resolveNotFoundPresentation(undefined, "/collections/inconnue"),
    );

    expect(html).toContain("<title>Collection introuvable | Shongre</title>");
    expect(html).toContain('name="robots" content="noindex, nofollow"');
    expect(html).toContain('href="/collections"');
    expect(html).toContain("font-family: var(--font-inter), 'Inter Variable'");
    expect(html).not.toMatch(/<[a-z]+[^>]*\sstyle=/i);
  });
});
