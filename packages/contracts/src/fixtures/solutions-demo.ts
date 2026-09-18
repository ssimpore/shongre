import {
  createSolutionInputSchema,
  solutionDefinitionSchema,
  type CreateSolutionInput,
  type SolutionDefinition,
} from "../schemas/solutions";

/**
 * The Shongre product catalogue as it stands before an administrator touches
 * it: the three products the platform ships, on the markets that carry them.
 *
 * Production catalogue entries are authored in `/admin/solutions` and audited
 * there; these records exist so a fresh local database and the in-memory demo
 * repositories describe the same platform, and so `/solutions` never opens on
 * an empty catalogue in a scenario. Every record satisfies the same schema and
 * lifecycle rules an administrator's entry must.
 */
const CATALOG_PUBLISHED_AT = "2026-08-01T09:00:00.000Z";

/*
 * Each product's launch destination is its own public landing page — the
 * place a visitor reads about it, signs in, and activates it. Session and
 * entitlement gates live inside the products, so the catalogue lets a
 * visitor discover them; `entitlementKey` names the product access the
 * workspace will require.
 */
const catalogEntry = (
  input: Omit<
    CreateSolutionInput,
    "requiresAuthentication" | "requiresEntitlement" | "releaseNotes"
  > & {
    requiresAuthentication?: boolean;
    requiresEntitlement?: boolean;
  },
): CreateSolutionInput =>
  createSolutionInputSchema.parse({
    requiresAuthentication: false,
    requiresEntitlement: false,
    releaseNotes: [
      {
        id: `${input.slug}-catalog-v1`,
        title: "Entrée au catalogue Shongre Solutions",
        body: "Première publication de la solution dans le catalogue.",
        publishedAt: CATALOG_PUBLISHED_AT,
      },
    ],
    ...input,
  });

export const DEMO_SOLUTION_CATALOG: readonly CreateSolutionInput[] = [
  catalogEntry({
    name: "Shongre Marketplace",
    slug: "marketplace",
    shortDescription:
      "La marketplace locale pour acheter et vendre entre particuliers et professionnels.",
    description:
      "Petites annonces, paiement suivi, livraison et retrait, boutiques professionnelles : la marketplace Shongre est la place de marché locale de chaque pays où Shongre est lancé.",
    icon: "marketplace",
    category: "Marketplace",
    lifecycle: "AVAILABLE",
    markets: ["FR", "BE", "CH"],
    languages: ["fr", "en"],
    audiences: ["Particuliers", "Professionnels"],
    capabilities: [
      "Annonces et recherche locale",
      "Paiement et livraison suivis",
      "Boutiques professionnelles",
    ],
    launchApplicationId: "marketplace",
    launchPath: "/",
    sortOrder: 10,
    catalogVisible: true,
    featured: true,
  }),
  catalogEntry({
    name: "Shongre Prospects",
    slug: "prospects",
    shortDescription:
      "Découverte de prospects, preuves et import CRM pour les équipes commerciales.",
    description:
      "Prospects rassemble la découverte d’entreprises, la revue des preuves et l’import dans le CRM Shongre, avec une organisation et une équipe partagées avec les autres produits.",
    icon: "prospects",
    category: "Développement commercial",
    lifecycle: "AVAILABLE",
    markets: ["FR", "BE", "CH"],
    languages: ["fr", "en"],
    audiences: ["Professionnels", "Équipes commerciales"],
    capabilities: [
      "Découverte de prospects",
      "Revue des preuves",
      "Import CRM",
    ],
    launchApplicationId: "prospects",
    launchPath: "/",
    entitlementKey: "prospects.enabled",
    sortOrder: 20,
    catalogVisible: true,
    featured: false,
  }),
  catalogEntry({
    name: "Shongre Facturation",
    slug: "facturation",
    shortDescription:
      "Facturation structurée multi-marché : clients, brouillons, finalisation et exports.",
    description:
      "Facturation couvre les clients, les brouillons, la finalisation, les exports et le suivi des paiements, en s’appuyant sur l’organisation et l’équipe Shongre existantes.",
    icon: "facturation",
    category: "Gestion",
    lifecycle: "AVAILABLE",
    markets: ["FR", "BE", "CH"],
    languages: ["fr", "en"],
    audiences: ["Professionnels", "Indépendants"],
    capabilities: [
      "Clients et brouillons",
      "Finalisation et exports",
      "Suivi des paiements",
    ],
    launchApplicationId: "facturation",
    launchPath: "/",
    entitlementKey: "invoicing.enabled",
    sortOrder: 30,
    catalogVisible: true,
    featured: false,
  }),
];

/**
 * The same catalogue as stored records, for the in-memory repository: fixed
 * identities and timestamps, so a scenario opens the same entries every run.
 */
export const DEMO_SOLUTION_DEFINITIONS: readonly SolutionDefinition[] =
  DEMO_SOLUTION_CATALOG.map((input, index) =>
    solutionDefinitionSchema.parse({
      ...input,
      id: `solution_${input.slug}`,
      createdAt: CATALOG_PUBLISHED_AT,
      updatedAt: CATALOG_PUBLISHED_AT,
      sortOrder: input.sortOrder ?? (index + 1) * 10,
    }),
  );
