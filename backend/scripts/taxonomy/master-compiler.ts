import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import readWorkbook from "read-excel-file/node";
import {
  CANONICAL_TAXONOMY_ALIASES,
  CANONICAL_TAXONOMY_IDENTITIES,
} from "@shongre/contracts/taxonomy-catalog";

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const VERSION = "4.0.0";
const COMPILER_VERSION = "2.0.0";
const NORMALIZED_SOURCE_PATH = path.join(
  REPOSITORY_ROOT,
  "backend/taxonomy/v4/taxonomy-v4.normalized.json",
);
const CROSSWALK_PATH = path.join(
  REPOSITORY_ROOT,
  "backend/taxonomy/v4/crosswalk.reviewed.json",
);
const PRIVATE_BUNDLE_PATH = path.join(
  REPOSITORY_ROOT,
  "backend/src/modules/taxonomy/generated/taxonomy-v4.private.ts",
);
const PUBLIC_BUNDLE_PATH = path.join(
  REPOSITORY_ROOT,
  "packages/contracts/src/fixtures/generated/taxonomy-v4.public.json",
);
const PUBLIC_BUNDLE_MODULE_PATH = path.join(
  REPOSITORY_ROOT,
  "packages/contracts/src/fixtures/generated/taxonomy-v4.public.ts",
);
const IMPORT_REPORT_PATH = path.join(
  REPOSITORY_ROOT,
  "docs/architecture/generated/taxonomy-v4-import-report.json",
);
const SEED_PATH = path.join(
  REPOSITORY_ROOT,
  "backend/supabase/seed/taxonomy-v4.generated.sql",
);

const CORE_SHEETS = [
  "01_VERTICALS",
  "02_CATEGORIES",
  "03_LISTING_TYPES",
  "04_ATTRIBUTE_GROUPS",
  "05_ATTRIBUTES",
  "06_ATTRIBUTE_OPTIONS",
  "07_CATEGORY_ATTRIBUTES",
  "08_DEPENDENCIES",
  "09_VALIDATIONS",
  "10_FILTERS",
  "11_SORT_OPTIONS",
  "12_PUBLICATION_FLOW",
  "13_CARD_FIELDS",
  "14_DETAIL_FIELDS",
  "15_SEARCH_FIELDS",
  "16_LOCATION_RULES",
  "17_SELLER_RULES",
  "18_PRIVATE_VS_PRO",
  "19_COUNTRY_RULES",
  "20_REGULATORY_FIELDS",
  "21_REFERENCE_DATA",
] as const;

const ADVISORY_SHEETS = [
  "00_SUMMARY",
  "22_LEBONCOIN_BENCHMARK",
  "23_SHONGRE_EXISTING",
  "24_GAP_ANALYSIS",
  "25_DUPLICATIONS",
  "26_HARDCODED_ITEMS",
  "27_MISSING_ITEMS",
  "28_READINESS",
  "29_DATA_DICTIONARY",
  "30_FUTURE_IMPLEMENTATION_ORDER",
] as const;

const EXPECTED_COUNTS = {
  verticals: 18,
  categories: 276,
  listingTypes: 208,
  attributeGroups: 56,
  attributes: 323,
  optionRows: 732,
  compactBindings: 1194,
  resolvedBindings: 10751,
  dependencies: 122,
  validations: 505,
  filters: 242,
  sortOptions: 86,
  publicationFlow: 846,
  cardFields: 130,
  detailFields: 790,
  searchFields: 341,
  locationRules: 20,
  sellerRules: 47,
  privateVsPro: 20,
  countryRules: 108,
  regulatoryRules: 30,
  referenceData: 42,
} as const;

const SHEET_FOR_COUNT: Record<keyof typeof EXPECTED_COUNTS, string | null> = {
  verticals: "01_VERTICALS",
  categories: "02_CATEGORIES",
  listingTypes: "03_LISTING_TYPES",
  attributeGroups: "04_ATTRIBUTE_GROUPS",
  attributes: "05_ATTRIBUTES",
  optionRows: "06_ATTRIBUTE_OPTIONS",
  compactBindings: "07_CATEGORY_ATTRIBUTES",
  resolvedBindings: null,
  dependencies: "08_DEPENDENCIES",
  validations: "09_VALIDATIONS",
  filters: "10_FILTERS",
  sortOptions: "11_SORT_OPTIONS",
  publicationFlow: "12_PUBLICATION_FLOW",
  cardFields: "13_CARD_FIELDS",
  detailFields: "14_DETAIL_FIELDS",
  searchFields: "15_SEARCH_FIELDS",
  locationRules: "16_LOCATION_RULES",
  sellerRules: "17_SELLER_RULES",
  privateVsPro: "18_PRIVATE_VS_PRO",
  countryRules: "19_COUNTRY_RULES",
  regulatoryRules: "20_REGULATORY_FIELDS",
  referenceData: "21_REFERENCE_DATA",
};

const ALLOWED_MARKETS = ["FR", "BE", "CH", "SN", "BF"] as const;
const ACTIVE_MARKETS = new Set(["FR", "BE", "CH"]);
const CONTEXT_FIELDS = new Set(["*", "intent", "country", "seller_type"]);
const SYSTEM_FIELDS = new Set([
  "published_at",
  "q",
  "radius_km",
  "has_photo",
  "price_drop",
  "published_since",
  "is_sponsored",
]);
const PUBLIC_DEPENDENCY_EFFECTS = new Set([
  "SHOW",
  "HIDE",
  "REQUIRE",
  "OPTIONAL",
  "FILTER_OPTIONS",
  "CLEAR_VALUE",
  "SET_VALUE",
  "SHOW_NOTICE",
]);

const VERTICAL_ICONS: Record<string, string> = {
  vehicles: "car",
  real_estate: "building",
  jobs: "briefcase-business",
  services: "wrench",
  fashion: "shirt",
  home_garden: "house",
  electronics: "smartphone",
  leisure_culture: "book-open",
  holidays: "palmtree",
  education: "graduation-cap",
  pets: "paw-print",
  professional_equipment: "hard-hat",
  agriculture: "tractor",
  baby_family: "baby",
  sports_outdoors: "dumbbell",
  events_tickets: "ticket",
  free_exchange: "gift",
  energy_transition: "leaf",
};

const MASTER_V3_TARGET_OVERRIDES: Record<
  string,
  { targetId: string; disposition: string; rationale: string }
> = {
  "vehicles.cars.citadines": {
    targetId: "vehicles.cars.city_cars",
    disposition: "renamed",
    rationale:
      "The master preserves the city-car category with a stable English identifier.",
  },
  "vehicles.cars.berlines": {
    targetId: "vehicles.cars.sedans",
    disposition: "renamed",
    rationale:
      "The master preserves the sedan category with a stable English identifier.",
  },
  "vehicles.cars.breaks": {
    targetId: "vehicles.cars.estates",
    disposition: "renamed",
    rationale:
      "The master preserves the estate category with a stable English identifier.",
  },
  "vehicles.cars.coupes_cabriolets": {
    targetId: "vehicles.cars.coupes_convertibles",
    disposition: "renamed",
    rationale:
      "The master preserves the coupe and convertible category under its canonical identifier.",
  },
  "vehicles.cars.utilitaires": {
    targetId: "vehicles.utility.vans",
    disposition: "renamed",
    rationale:
      "Legacy utility listings map to the master vans and utility-vehicles leaf.",
  },
  "vehicles.parts": {
    targetId: "vehicles.parts.auto_parts",
    disposition: "split_requires_reclassification",
    rationale:
      "The former mixed parts node is split; auto parts are the safest compatibility route.",
  },
  "services.home_repairs": {
    targetId: "services.local_services.home_repairs",
    disposition: "renamed",
    rationale: "The service now sits below the canonical local-services group.",
  },
  "services.tutoring": {
    targetId: "education.academic.primary_homework",
    disposition: "moved",
    rationale:
      "Tutoring is owned by the dedicated education vertical in the master.",
  },
  "services.events": {
    targetId: "services.local_services.event_services",
    disposition: "renamed",
    rationale:
      "Event services now sit below the canonical local-services group.",
  },
  "fashion.women": {
    targetId: "fashion.clothing.women",
    disposition: "moved",
    rationale: "Women's fashion is a final clothing category in the master.",
  },
  "fashion.men": {
    targetId: "fashion.clothing.men",
    disposition: "moved",
    rationale: "Men's fashion is a final clothing category in the master.",
  },
  baby_kids: {
    targetId: "baby_family",
    disposition: "renamed",
    rationale: "The master renames the vertical to Baby & Family.",
  },
  "baby_kids.strollers": {
    targetId: "baby_family.equipment.strollers",
    disposition: "moved",
    rationale: "Strollers move into the canonical baby-equipment hierarchy.",
  },
  "baby_kids.toys": {
    targetId: "baby_family.maternity.early_learning",
    disposition: "narrowed",
    rationale: "Baby toys map to the master's early-learning leaf.",
  },
  "leisure_culture.books": {
    targetId: "leisure_culture.books_media.books",
    disposition: "moved",
    rationale: "Books now sit below the canonical Books & Media group.",
  },
  "sports_outdoors.water_sports": {
    targetId: "sports_outdoors.water_winter.water_sports",
    disposition: "moved",
    rationale: "Water sports now sit below the Water & Winter sports group.",
  },
  professional_btp: {
    targetId: "professional_equipment",
    disposition: "broadened",
    rationale:
      "The master replaces the narrow BTP root with Professional Equipment.",
  },
  pro_it_telecom: {
    targetId: "professional_equipment.office_retail.pro_it",
    disposition: "moved",
    rationale: "Professional IT is a final professional-equipment category.",
  },
  deals_donations: {
    targetId: "free_exchange.offers.free_items",
    disposition: "renamed",
    rationale: "Donation listings map to the master free-items leaf.",
  },
};

const PREVIOUS_V4_TARGET_OVERRIDES: Record<string, string> = {
  "vehicles.quads_buggys": "vehicles.motos.quads",
  "vehicles.camions": "vehicles.utility.vans",
  "vehicles.caravaning.remorques": "vehicles.caravaning",
  "vehicles.caravaning.mobil_homes": "holidays.outdoor.mobile_home",
  "vehicles.nautisme.semi_rigides_annexes": "vehicles.nautical.small_craft",
  "vehicles.nautisme.jet_skis": "vehicles.nautical.personal_watercraft",
  "vehicles.nautisme.remorques_bateau": "vehicles.parts.caravan_nautical_parts",
  "vehicles.cycles.accessories": "sports_outdoors.outdoor.cycling_equipment",
  "vehicles.auto_parts": "vehicles.parts.auto_parts",
  "vehicles.auto_parts.pneus_jantes": "vehicles.parts.auto_parts",
  "vehicles.auto_parts.pieces_moteur": "vehicles.parts.auto_parts",
  "vehicles.auto_parts.carrosserie": "vehicles.parts.auto_parts",
  "vehicles.auto_parts.interieur_auto": "vehicles.parts.auto_parts",
  "vehicles.auto_parts.audio_gps_auto": "vehicles.parts.auto_parts",
  "vehicles.auto_parts.entretien_outillage_auto": "vehicles.parts.auto_parts",
  "vehicles.auto_parts.accessoires_auto": "vehicles.parts.auto_parts",
  "vehicles.motorcycle_parts": "vehicles.parts.moto_parts",
  "vehicles.motorcycle_parts.casques": "vehicles.parts.moto_parts",
  "vehicles.motorcycle_parts.equipement_pilote": "vehicles.parts.moto_parts",
  "vehicles.motorcycle_parts.pieces_moto": "vehicles.parts.moto_parts",
  "vehicles.equipement_caravaning": "vehicles.parts.caravan_nautical_parts",
  "vehicles.equipement_nautisme": "vehicles.parts.caravan_nautical_parts",
  "real_estate.appartements": "real_estate.sales.apartments",
  "real_estate.maisons": "real_estate.sales.houses",
  "real_estate.chambres_colocation": "real_estate.shared.room_offer",
  "real_estate.commercial.commerces": "real_estate.commercial.retail",
  "real_estate.commercial.entrepots_locaux_activite":
    "real_estate.commercial.warehouses",
  "jobs.alternance_stages": "jobs.offers",
  "jobs.missions_freelance": "jobs",
  "jobs.recherches_d_emploi": "jobs.candidates.candidate_profile",
  "services.home_repairs": "services.local_services.home_repairs",
  "services.demenagement_transport": "services.local_services.moving",
  "services.events": "services.local_services.event_services",
  "services.beaute_bien_etre": "services.local_services.personal_care",
  "services.informatique_web": "services.local_services.digital_it",
  "services.reparation": "services.local_services.electronics_repair",
  "services.services_aux_entreprises": "services.local_services.other_services",
  "services.location_de_materiel": "services.local_services.other_services",
  "services.covoiturage": "services.local_services.other_services",
  "services.services_animaliers": "services.local_services.pet_services",
  "fashion.vetements_professionnels": "fashion.clothing.unisex",
  "home_garden.luminaires": "home_garden.decoration.decor",
  "home_garden.jardin_plantes": "home_garden.diy_garden.garden",
  "home_garden.materiaux_de_construction": "home_garden.diy_garden.materials",
  "electronics.photo_video_drone": "electronics.audio_hifi.photo",
  "electronics.objets_connectes": "electronics.smart_home.home_automation",
  "electronics.network_storage": "electronics.computers.components",
  "electronics.accessoires_electronique":
    "electronics.smartphones.phone_accessories",
  "sports_outdoors.water_sports": "sports_outdoors.water_winter.water_sports",
  "sports_outdoors.sports_d_hiver":
    "sports_outdoors.water_winter.winter_sports",
  "sports_outdoors.chasse_peche": "sports_outdoors.equestrian_fishing.fishing",
  "leisure_culture.books": "leisure_culture.books_media.books",
  "leisure_culture.cd_vinyles_dvd": "leisure_culture.books_media.music_media",
  "leisure_culture.antiquites_et_art": "leisure_culture.collection.antiques",
  "leisure_culture.jeux_de_societe_modelisme":
    "leisure_culture.toys_creative.toys_games",
  "leisure_culture.vins_et_gastronomie":
    "leisure_culture.gastronomy.wine_gastronomy",
  "pets.equides": "pets.animals.horses",
  "pets.autres_animaux": "pets.animals.small_animals",
  "pets.animaux_perdus_trouves": "pets.lost_found",
  "services.tutoring": "education.academic.primary_homework",
  "education.formations_professionnelles":
    "education.professional.digital_data",
  "education.ateliers_et_stages": "education.professional.business",
  "education.coaching_et_concours": "education.professional.exam_preparation",
  baby_kids: "baby_family",
  "baby_kids.vetements_bebe_enfant": "baby_family.clothing.baby_clothing",
  "baby_kids.toys": "baby_family.maternity.early_learning",
  "baby_kids.repas_et_soins": "baby_family.equipment.feeding_care",
  "baby_kids.scolarite": "home_garden.school_office.school",
  "vacations.locations_saisonnieres": "holidays.accommodation",
  "vacations.chambres_d_hotes": "holidays.accommodation.guest_house",
  "vacations.campings": "holidays.outdoor.camping",
  "vacations.hebergements_insolites": "holidays.accommodation.unusual",
  "vacations.echanges_de_maison": "holidays.accommodation.house_villa",
  "professional_btp.poids_lourds": "vehicles.utility.vans",
  "professional_btp.equipement_industriel": "professional_equipment.industrial",
  "professional_btp.equipement_de_commerce":
    "professional_equipment.office_retail.retail",
  community: "free_exchange",
  "community.annonces_de_quartier": "free_exchange.offers.wanted",
  "community.evenements_locaux": "events_tickets.events.local_events",
  "community.objets_perdus_trouves": "free_exchange.offers.wanted",
  "community.mutual_aid": "free_exchange.offers.free_items",
  "community.bons_plans_locaux": "free_exchange.offers.free_items",
  other: "free_exchange",
  "other.autres_annonces": "free_exchange.offers.wanted",
};

const FLOW_INTENTS: Record<string, string> = {
  animal_transfer: "SELL",
  candidate_profile: "JOB_SEEK",
  education_offer: "COURSE_OFFER",
  event_listing: "NOTICE",
  holiday_rental: "RENT_OUT",
  job_offer: "JOB_OFFER",
  lost_found: "NOTICE",
  product_sale: "SELL",
  professional_equipment: "SELL",
  property_commercial: "BUSINESS_SALE",
  property_rent: "RENT_OUT",
  property_sale: "SELL",
  service_offer: "SERVICE_OFFER",
  ticket_resale: "SELL",
  training_offer: "COURSE_OFFER",
  vehicle_light: "SELL",
  vehicle_sale: "SELL",
};

const INTENT_LABELS: Record<string, { "fr-FR": string; "en-US": string }> = {
  SELL: { "fr-FR": "Vendre", "en-US": "Sell" },
  WANTED: { "fr-FR": "Rechercher", "en-US": "Wanted" },
  DONATE: { "fr-FR": "Donner", "en-US": "Give away" },
  EXCHANGE: { "fr-FR": "Échanger", "en-US": "Exchange" },
  RENT_OUT: { "fr-FR": "Louer", "en-US": "Rent out" },
  RENT_SEEK: { "fr-FR": "Rechercher une location", "en-US": "Seek a rental" },
  SERVICE_OFFER: { "fr-FR": "Proposer un service", "en-US": "Offer a service" },
  NOTICE: { "fr-FR": "Publier une annonce", "en-US": "Publish a notice" },
  COURSE_OFFER: { "fr-FR": "Proposer un cours", "en-US": "Offer a course" },
  JOB_OFFER: {
    "fr-FR": "Publier une offre d’emploi",
    "en-US": "Publish a job",
  },
  BUSINESS_SALE: {
    "fr-FR": "Céder ou louer un actif professionnel",
    "en-US": "Offer a business asset",
  },
  JOB_SEEK: {
    "fr-FR": "Publier un profil candidat",
    "en-US": "Publish a candidate profile",
  },
};

const MASTER_UI_COMPONENTS = new Set([
  "segmented_control",
  "text_input",
  "rich_textarea",
  "select",
  "number_input",
  "autocomplete",
  "hierarchical_select",
  "textarea",
  "switch",
  "multiselect",
  "money_input",
  "country_select",
  "location_autocomplete",
  "postal_code_input",
  "address_autocomplete",
  "hidden_geo",
  "radius_input",
  "image_uploader",
  "video_uploader",
  "file_uploader",
  "url_input",
  "schedule_editor",
  "business_id_input",
  "year_picker",
  "date_picker",
  "secure_text_input",
  "computed_readonly",
  "energy_rating",
  "time_picker",
  "structured_textarea",
  "tags_input",
  "evidence_editor",
  "status_badge",
  "document_status",
  "datetime_picker",
  "barcode_input",
]);

type Cell = string | number | boolean | Date | null;
type SourceRow = Record<string, Cell>;
type WorkbookSheet = { sheet: string; data: Cell[][] };
type PreviousCategory = {
  id: string;
  parentId?: string;
  slug: string;
  labels: Record<string, string>;
};
type CrosswalkRow = {
  sourceId: string;
  canonicalId: string;
  disposition: string;
  rationale: string;
};
type TaxonomyComparison = {
  previousCounts: {
    categories: number;
    listingTypes: number;
    attributes: number;
  };
  exactIdsPreserved: {
    categories: number;
    listingTypes: number;
    attributes: number;
  };
  added: {
    categories: number;
    listingTypes: number;
    attributes: number;
  };
  removedOrRedirected: {
    categories: number;
    listingTypes: number;
    attributes: number;
  };
};
type Crosswalk = {
  version: string;
  reviewStatus: "candidate" | "reviewed";
  reviewedAt: string | null;
  baselineComparison: TaxonomyComparison;
  workbookCategories: CrosswalkRow[];
  v3Nodes: CrosswalkRow[];
  previousV4Nodes: CrosswalkRow[];
};

function compareTaxonomyIdentities(
  previous: {
    categories?: Array<{ id: string }>;
    listingTypes?: Array<{ id: string }>;
    attributes?: Array<{ id: string }>;
  },
  current: {
    categoryIds: Set<string>;
    listingTypeIds: Set<string>;
    attributeIds: Set<string>;
  },
): TaxonomyComparison {
  const previousCategoryIds = previous.categories?.map((row) => row.id) ?? [];
  const previousListingTypeIds =
    previous.listingTypes?.map((row) => row.id) ?? [];
  const previousAttributeIds = previous.attributes?.map((row) => row.id) ?? [];
  const countPreserved = (ids: string[], currentIds: Set<string>) =>
    ids.filter((id) => currentIds.has(id)).length;
  const added = (currentIds: Set<string>, previousIds: string[]) =>
    [...currentIds].filter((id) => !previousIds.includes(id)).length;
  const removed = (previousIds: string[], currentIds: Set<string>) =>
    previousIds.filter((id) => !currentIds.has(id)).length;

  return {
    previousCounts: {
      categories: previousCategoryIds.length,
      listingTypes: previousListingTypeIds.length,
      attributes: previousAttributeIds.length,
    },
    exactIdsPreserved: {
      categories: countPreserved(previousCategoryIds, current.categoryIds),
      listingTypes: countPreserved(
        previousListingTypeIds,
        current.listingTypeIds,
      ),
      attributes: countPreserved(previousAttributeIds, current.attributeIds),
    },
    added: {
      categories: added(current.categoryIds, previousCategoryIds),
      listingTypes: added(current.listingTypeIds, previousListingTypeIds),
      attributes: added(current.attributeIds, previousAttributeIds),
    },
    removedOrRedirected: {
      categories: removed(previousCategoryIds, current.categoryIds),
      listingTypes: removed(previousListingTypeIds, current.listingTypeIds),
      attributes: removed(previousAttributeIds, current.attributeIds),
    },
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function asString(value: Cell, field: string): string {
  assert(value !== null && value !== "", `Missing required ${field}.`);
  return String(value).trim();
}

function optionalString(value: Cell): string | undefined {
  if (value === null || value === "") return undefined;
  return String(value).trim();
}

function asBoolean(value: Cell, field: string): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toUpperCase() === "TRUE") return true;
    if (value.toUpperCase() === "FALSE") return false;
  }
  throw new Error(`Invalid boolean ${field}: ${String(value)}`);
}

function optionalBoolean(value: Cell): boolean | undefined {
  if (value === null || value === "") return undefined;
  return asBoolean(value, "optional boolean");
}

function asNumber(value: Cell, field: string): number {
  const result = typeof value === "number" ? value : Number(value);
  assert(Number.isFinite(result), `Invalid number ${field}: ${String(value)}`);
  return result;
}

function optionalNumber(value: Cell): number | undefined {
  if (value === null || value === "") return undefined;
  return asNumber(value, "optional number");
}

function splitList(value: Cell): string[] {
  const source = optionalString(value);
  return source
    ? source
        .split(/[|,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim();
}

function parseRows(sheet: WorkbookSheet): SourceRow[] {
  const [headerRow, ...dataRows] = sheet.data;
  assert(headerRow, `Sheet ${sheet.sheet} has no header.`);
  const headers = headerRow.map((value) =>
    asString(value, `${sheet.sheet} header`),
  );
  assert(
    new Set(headers).size === headers.length,
    `Duplicate header in ${sheet.sheet}.`,
  );
  return dataRows
    .filter((row) => row.some((value) => value !== null && value !== ""))
    .map((row) =>
      Object.fromEntries(
        headers.map((header, index) => [header, row[index] ?? null]),
      ),
    );
}

function uniqueIds(rows: SourceRow[], key: string, label: string): void {
  const ids = rows.map((row) => asString(row[key], `${label}.${key}`));
  assert(new Set(ids).size === ids.length, `Duplicate ${label} identifiers.`);
}

function marketAvailability(scopeValue: Cell) {
  const requested = new Set(splitList(scopeValue));
  const shared = requested.has("ALL") || requested.has("ALL_MARKETS");
  return ALLOWED_MARKETS.map((marketCode) => ({
    marketCode,
    status:
      ACTIVE_MARKETS.has(marketCode) && (shared || requested.has(marketCode))
        ? "active"
        : marketCode === "SN" || marketCode === "BF"
          ? "coming_soon"
          : "unavailable",
    marketplaceEnabled:
      ACTIVE_MARKETS.has(marketCode) && (shared || requested.has(marketCode)),
    indexable:
      ACTIVE_MARKETS.has(marketCode) && (shared || requested.has(marketCode)),
  }));
}

function fieldReference(field: string, attributeIds: Set<string>) {
  if (attributeIds.has(field)) return { kind: "attribute", key: field };
  if (CONTEXT_FIELDS.has(field)) return { kind: "context", key: field };
  if (SYSTEM_FIELDS.has(field)) return { kind: "system", key: field };
  throw new Error(`Unknown taxonomy rule/projection field ${field}.`);
}

function flowIntent(flow: string, categoryId: string): string {
  if (flow === "free_exchange") {
    if (categoryId.endsWith(".free_items")) return "DONATE";
    if (categoryId.endsWith(".exchange")) return "EXCHANGE";
    return "WANTED";
  }
  if (flow === "property_parking") {
    return categoryId.endsWith(".rent") ? "RENT_OUT" : "SELL";
  }
  if (flow === "property_shared") {
    return categoryId.endsWith(".room_search") ? "RENT_SEEK" : "RENT_OUT";
  }
  const intent = FLOW_INTENTS[flow];
  assert(intent, `Unknown publication-flow intent ${flow}.`);
  return intent;
}

async function readWorkbookSheets(workbookPath: string) {
  const workbook = (await readWorkbook(workbookPath)) as WorkbookSheet[];
  const byName = new Map(workbook.map((sheet) => [sheet.sheet, sheet]));
  for (const sheetName of [...CORE_SHEETS, ...ADVISORY_SHEETS]) {
    assert(byName.has(sheetName), `Workbook is missing ${sheetName}.`);
  }
  const core = Object.fromEntries(
    CORE_SHEETS.map((sheetName) => [
      sheetName,
      parseRows(byName.get(sheetName)!),
    ]),
  ) as Record<(typeof CORE_SHEETS)[number], SourceRow[]>;
  const advisoryCounts = Object.fromEntries(
    ADVISORY_SHEETS.map((sheetName) => [
      sheetName,
      sheetName === "00_SUMMARY"
        ? Math.max(0, byName.get(sheetName)!.data.length)
        : parseRows(byName.get(sheetName)!).length,
    ]),
  );
  for (const [countKey, expected] of Object.entries(EXPECTED_COUNTS)) {
    const sheetName = SHEET_FOR_COUNT[countKey as keyof typeof EXPECTED_COUNTS];
    if (!sheetName) continue;
    assert(
      core[sheetName as (typeof CORE_SHEETS)[number]].length === expected,
      `${sheetName} expected ${expected} rows; received ${core[sheetName as (typeof CORE_SHEETS)[number]].length}.`,
    );
  }
  return { core, advisoryCounts };
}

function masterNodeRows(
  sheets: Record<(typeof CORE_SHEETS)[number], SourceRow[]>,
) {
  const verticalRows = sheets["01_VERTICALS"].map((row) => ({
    id: asString(row.vertical_id, "vertical_id"),
    slug: asString(row.slug, "vertical.slug"),
    label: asString(row.name_fr, "vertical.name_fr"),
  }));
  const categoryRows = sheets["02_CATEGORIES"].map((row) => ({
    id: asString(row.category_id, "category_id"),
    slug: asString(row.slug, "category.slug"),
    label: asString(row.name_fr, "category.name_fr"),
  }));
  return [...verticalRows, ...categoryRows];
}

function v3Crosswalk(masterIds: Set<string>): CrosswalkRow[] {
  return CANONICAL_TAXONOMY_IDENTITIES.map((node) => {
    if (masterIds.has(node.id)) {
      return {
        sourceId: node.id,
        canonicalId: node.id,
        disposition: "preserved",
        rationale:
          "The identity remains semantically equivalent in the master taxonomy.",
      };
    }
    const override = MASTER_V3_TARGET_OVERRIDES[node.id];
    assert(override, `No reviewed v3 target for ${node.id}.`);
    assert(
      masterIds.has(override.targetId),
      `Missing v3 target ${override.targetId}.`,
    );
    return {
      sourceId: node.id,
      canonicalId: override.targetId,
      disposition: override.disposition,
      rationale: override.rationale,
    };
  });
}

function previousV4Crosswalk(
  previousCategories: PreviousCategory[],
  masterNodes: Array<{ id: string; slug: string; label: string }>,
): CrosswalkRow[] {
  const masterIds = new Set(masterNodes.map((node) => node.id));
  const groupUnique = (
    selector: (node: (typeof masterNodes)[number]) => string,
  ) => {
    const groups = new Map<string, Array<(typeof masterNodes)[number]>>();
    for (const node of masterNodes) {
      const key = normalizedText(selector(node));
      groups.set(key, [...(groups.get(key) ?? []), node]);
    }
    return new Map(
      [...groups].flatMap(([key, nodes]) =>
        nodes.length === 1 ? [[key, nodes[0]] as const] : [],
      ),
    );
  };
  const byLabel = groupUnique((node) => node.label);
  const bySlug = groupUnique((node) => node.slug);
  const previousById = new Map(
    previousCategories.map((node) => [node.id, node]),
  );
  return previousCategories.map((node) => {
    let targetId: string | undefined;
    let disposition = "preserved";
    let rationale = "The identity remains present in the master taxonomy.";
    if (masterIds.has(node.id)) {
      targetId = node.id;
    } else if (PREVIOUS_V4_TARGET_OVERRIDES[node.id]) {
      targetId = PREVIOUS_V4_TARGET_OVERRIDES[node.id];
      disposition = "reviewed_compatibility_redirect";
      rationale =
        "A reviewed compatibility redirect preserves the former v4 identity.";
    } else {
      const labelMatch = byLabel.get(
        normalizedText(node.labels["fr-FR"] ?? ""),
      );
      const slugMatch = bySlug.get(normalizedText(node.slug));
      if (labelMatch) {
        targetId = labelMatch.id;
        disposition = "renamed";
        rationale =
          "A unique French label establishes the equivalent master node.";
      } else if (slugMatch) {
        targetId = slugMatch.id;
        disposition = "renamed";
        rationale =
          "A unique canonical slug establishes the equivalent master node.";
      } else {
        let ancestorId = node.parentId;
        while (ancestorId && !masterIds.has(ancestorId)) {
          ancestorId = previousById.get(ancestorId)?.parentId;
        }
        targetId = ancestorId;
        disposition = "broadened_review_required";
        rationale =
          "No exact master leaf exists; the nearest retained ancestor preserves data for review.";
      }
    }
    assert(
      targetId && masterIds.has(targetId),
      `No previous-v4 target for ${node.id}.`,
    );
    return { sourceId: node.id, canonicalId: targetId, disposition, rationale };
  });
}

async function scaffoldCrosswalk(workbookPath: string) {
  const { core } = await readWorkbookSheets(workbookPath);
  const masterNodes = masterNodeRows(core);
  const masterIds = new Set(masterNodes.map((node) => node.id));
  const previous = JSON.parse(
    await fs
      .readFile(NORMALIZED_SOURCE_PATH, "utf8")
      .catch(() => '{"categories":[]}'),
  ) as {
    categories?: PreviousCategory[];
    listingTypes?: Array<{ id: string }>;
    attributes?: Array<{ id: string }>;
  };
  const masterListingTypeIds = new Set(
    core["03_LISTING_TYPES"].map((row) =>
      asString(row.listing_type_id, "listing_type_id"),
    ),
  );
  const masterAttributeIds = new Set(
    core["05_ATTRIBUTES"].map((row) =>
      asString(row.attribute_id, "attribute_id"),
    ),
  );
  const existingV3Ids = new Set(
    CANONICAL_TAXONOMY_IDENTITIES.map((node) => node.id),
  );
  const crosswalk: Crosswalk = {
    version: VERSION,
    reviewStatus: "candidate",
    reviewedAt: null,
    baselineComparison: compareTaxonomyIdentities(previous, {
      categoryIds: masterIds,
      listingTypeIds: masterListingTypeIds,
      attributeIds: masterAttributeIds,
    }),
    workbookCategories: masterNodes.map((node) => ({
      sourceId: node.id,
      canonicalId: node.id,
      disposition: existingV3Ids.has(node.id) ? "preserved" : "new",
      rationale: existingV3Ids.has(node.id)
        ? "Preserves a semantically equivalent Shongre identity."
        : "Introduces a stable identity defined by the master workbook.",
    })),
    v3Nodes: v3Crosswalk(masterIds),
    previousV4Nodes: previousV4Crosswalk(
      previous.categories ?? [],
      masterNodes,
    ),
  };
  await fs.mkdir(path.dirname(CROSSWALK_PATH), { recursive: true });
  await fs.writeFile(CROSSWALK_PATH, stableJson(crosswalk));
  console.log(
    `Wrote candidate crosswalk: ${path.relative(REPOSITORY_ROOT, CROSSWALK_PATH)}`,
  );
  console.log(
    "Review every mapping, then set reviewStatus to reviewed and reviewedAt to an ISO date.",
  );
}

async function loadCrosswalk(masterIds: Set<string>): Promise<Crosswalk> {
  const crosswalk = JSON.parse(
    await fs.readFile(CROSSWALK_PATH, "utf8"),
  ) as Crosswalk;
  assert(
    crosswalk.version === VERSION,
    "Crosswalk version does not match taxonomy version.",
  );
  assert(
    crosswalk.reviewStatus === "reviewed",
    "Taxonomy crosswalk is not reviewed.",
  );
  assert(
    crosswalk.reviewedAt,
    "Reviewed taxonomy crosswalk needs reviewedAt evidence.",
  );
  assert(
    crosswalk.baselineComparison?.previousCounts.categories ===
      crosswalk.previousV4Nodes.length,
    "Reviewed crosswalk is missing its immutable previous-v4 comparison baseline.",
  );
  assert(
    crosswalk.workbookCategories.length === masterIds.size,
    "Crosswalk must cover every master taxonomy node.",
  );
  assert(
    crosswalk.v3Nodes.length === CANONICAL_TAXONOMY_IDENTITIES.length,
    "Crosswalk must cover every v3 node.",
  );
  assert(
    crosswalk.workbookCategories.every(
      (row) =>
        row.sourceId === row.canonicalId && masterIds.has(row.canonicalId),
    ),
    "Master workbook crosswalk identities must be canonical and complete.",
  );
  assert(
    [...crosswalk.v3Nodes, ...crosswalk.previousV4Nodes].every((row) =>
      masterIds.has(row.canonicalId),
    ),
    "Compatibility crosswalk contains an unknown target.",
  );
  return crosswalk;
}

function validateHierarchy(
  categories: Array<{
    id: string;
    parentId?: string;
    slug: string;
    sortOrder: number;
  }>,
) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  assert(byId.size === categories.length, "Duplicate active category IDs.");
  assert(
    new Set(categories.map((category) => category.slug)).size ===
      categories.length,
    "Duplicate active category slugs.",
  );
  const siblingOrder = new Set<string>();
  for (const category of categories) {
    if (category.parentId)
      assert(byId.has(category.parentId), `Orphan category ${category.id}.`);
    const siblingKey = `${category.parentId ?? "root"}:${category.sortOrder}`;
    assert(
      !siblingOrder.has(siblingKey),
      `Duplicate sibling order ${siblingKey}.`,
    );
    siblingOrder.add(siblingKey);
    const visited = new Set([category.id]);
    let parentId = category.parentId;
    while (parentId) {
      assert(
        !visited.has(parentId),
        `Circular category hierarchy at ${category.id}.`,
      );
      visited.add(parentId);
      parentId = byId.get(parentId)?.parentId;
    }
  }
}

function applicableListingTypes(
  reference: string | undefined,
  flow: string | undefined,
  listingTypes: Array<{ id: string; publicationFlow: string }>,
) {
  if (reference?.startsWith("@flow.")) {
    const requestedFlow = reference.slice("@flow.".length);
    return listingTypes.filter(
      (listingType) => listingType.publicationFlow === requestedFlow,
    );
  }
  if (reference && reference !== "*") {
    return listingTypes.filter((listingType) => listingType.id === reference);
  }
  if (flow)
    return listingTypes.filter(
      (listingType) => listingType.publicationFlow === flow,
    );
  return listingTypes;
}

function normalizeWorkbook(
  sheets: Record<(typeof CORE_SHEETS)[number], SourceRow[]>,
  advisoryCounts: Record<string, number>,
  crosswalk: Crosswalk,
  workbookChecksum: string,
) {
  for (const sheetName of CORE_SHEETS) {
    const rows = sheets[sheetName];
    assert(rows.length > 0, `${sheetName} is empty.`);
  }
  uniqueIds(sheets["01_VERTICALS"], "vertical_id", "vertical");
  uniqueIds(sheets["02_CATEGORIES"], "category_id", "category");
  uniqueIds(sheets["03_LISTING_TYPES"], "listing_type_id", "listing type");
  uniqueIds(
    sheets["04_ATTRIBUTE_GROUPS"],
    "attribute_group_id",
    "attribute group",
  );
  uniqueIds(sheets["05_ATTRIBUTES"], "attribute_id", "attribute");
  uniqueIds(sheets["06_ATTRIBUTE_OPTIONS"], "option_id", "option");

  const verticalRows = sheets["01_VERTICALS"];
  const categoryRows = sheets["02_CATEGORIES"];
  const masterNodes = masterNodeRows(sheets);
  const masterIds = new Set(masterNodes.map((node) => node.id));
  const categoryRowById = new Map(
    categoryRows.map((row) => [asString(row.category_id, "category_id"), row]),
  );
  const verticalIds = new Set(
    verticalRows.map((row) => asString(row.vertical_id, "vertical_id")),
  );

  const verticals = verticalRows.map((row) => {
    const id = asString(row.vertical_id, "vertical_id");
    const active = asBoolean(row.active, `${id}.active`);
    return {
      id,
      sourceKey: id,
      slug: asString(row.slug, `${id}.slug`),
      labels: {
        "fr-FR": asString(row.name_fr, `${id}.name_fr`),
        "en-US": asString(row.name_en, `${id}.name_en`),
      },
      description: optionalString(row.description),
      iconName: VERTICAL_ICONS[id] ?? "tag",
      sortOrder: asNumber(row.display_order, `${id}.display_order`),
      status: active ? "active" : "disabled",
      marketAvailability: marketAvailability(row.country_scope),
      auditStatus: asString(row.shongre_status, `${id}.shongre_status`),
    };
  });

  const categoryNodes = categoryRows.map((row) => {
    const id = asString(row.category_id, "category_id");
    const verticalId = asString(row.vertical_id, `${id}.vertical_id`);
    assert(
      verticalIds.has(verticalId),
      `Unknown vertical ${verticalId} for ${id}.`,
    );
    const parentId = optionalString(row.parent_id) ?? verticalId;
    assert(masterIds.has(parentId), `Unknown parent ${parentId} for ${id}.`);
    return {
      id,
      sourceKey: id,
      parentId,
      level: optionalString(row.parent_id) ? 2 : 1,
      slug: asString(row.slug, `${id}.slug`),
      labels: {
        "fr-FR": asString(row.name_fr, `${id}.name_fr`),
        "en-US": asString(row.name_en, `${id}.name_en`),
      },
      description: optionalString(row.description),
      iconName: VERTICAL_ICONS[verticalId] ?? "tag",
      sortOrder: asNumber(row.display_order, `${id}.display_order`),
      status: asBoolean(row.active, `${id}.active`) ? "active" : "disabled",
      publishable: asBoolean(row.leaf_category, `${id}.leaf_category`),
      sellerEligibility: {
        individualAllowed: asBoolean(
          row.private_allowed,
          `${id}.private_allowed`,
        ),
        professionalAllowed: asBoolean(
          row.professional_allowed,
          `${id}.professional_allowed`,
        ),
      },
      marketAvailability: marketAvailability(row.country_scope),
      seo: { indexable: asBoolean(row.seo_indexable, `${id}.seo_indexable`) },
      verticalId,
      auditStatus: asString(row.shongre_status, `${id}.shongre_status`),
    };
  });

  const categories = [
    ...verticals.map((vertical) => ({
      id: vertical.id,
      sourceKey: vertical.sourceKey,
      level: 0,
      slug: vertical.slug,
      labels: vertical.labels,
      description: vertical.description,
      iconName: vertical.iconName,
      sortOrder: vertical.sortOrder,
      status: vertical.status,
      publishable: false,
      sellerEligibility: { individualAllowed: true, professionalAllowed: true },
      marketAvailability: vertical.marketAvailability,
      seo: { indexable: vertical.status === "active" },
    })),
    ...categoryNodes.map(
      ({ verticalId: _verticalId, auditStatus: _auditStatus, ...category }) =>
        category,
    ),
  ];
  validateHierarchy(categories);
  assert(
    categories.filter((category) => !category.parentId).length ===
      EXPECTED_COUNTS.verticals,
    "Unexpected vertical-root count.",
  );
  assert(
    categories.filter((category) => category.publishable).length === 208,
    "Unexpected publishable-leaf count.",
  );

  const listingTypes = sheets["03_LISTING_TYPES"].map((row) => {
    const id = asString(row.listing_type_id, "listing_type_id");
    const categoryId = asString(row.category_id, `${id}.category_id`);
    const category = categoryNodes.find(
      (candidate) => candidate.id === categoryId,
    );
    assert(
      category?.publishable,
      `Listing type ${id} must target a publishable leaf.`,
    );
    const publicationFlow = asString(
      row.publication_flow,
      `${id}.publication_flow`,
    );
    const intent = flowIntent(publicationFlow, categoryId);
    return {
      id,
      sourceKey: id,
      categoryId,
      verticalId: category.verticalId,
      publicationFlow,
      intent,
      intentLabel: INTENT_LABELS[intent],
      labels: {
        "fr-FR": asString(row.name_fr, `${id}.name_fr`),
        "en-US": asString(row.name_en, `${id}.name_en`),
      },
      slug: asString(row.slug, `${id}.slug`),
      sellerEligibility: {
        individualAllowed: asBoolean(
          row.private_allowed,
          `${id}.private_allowed`,
        ),
        professionalAllowed: asBoolean(
          row.professional_allowed,
          `${id}.professional_allowed`,
        ),
      },
      status: "active",
      marketAvailability: marketAvailability(row.country_scope),
      seoIndexable: category.seo.indexable,
    };
  });
  assert(
    new Set(listingTypes.map((row) => row.categoryId)).size === 208,
    "Every publishable leaf must have exactly one listing type.",
  );

  const listingTypeById = new Map(listingTypes.map((row) => [row.id, row]));
  const groupRows = sheets["04_ATTRIBUTE_GROUPS"];
  const attributeGroups = groupRows.map((row) => {
    const id = asString(row.attribute_group_id, "attribute_group_id");
    return {
      id,
      labels: {
        "fr-FR": asString(row.name_fr, `${id}.name_fr`),
        "en-US": asString(row.name_en, `${id}.name_en`),
      },
      iconName: "layout-list",
      sortOrder: asNumber(row.display_order, `${id}.display_order`),
      collapsible: asBoolean(row.collapsible, `${id}.collapsible`),
      public: true,
    };
  });
  const groupIds = new Set(attributeGroups.map((row) => row.id));
  const attributeRows = sheets["05_ATTRIBUTES"];
  const attributeIds = new Set(
    attributeRows.map((row) => asString(row.attribute_id, "attribute_id")),
  );
  const optionRowsByAttribute = new Map<string, SourceRow[]>();
  for (const row of sheets["06_ATTRIBUTE_OPTIONS"]) {
    const attributeId = asString(row.attribute_id, "option.attribute_id");
    assert(
      attributeIds.has(attributeId),
      `Unknown option attribute ${attributeId}.`,
    );
    optionRowsByAttribute.set(attributeId, [
      ...(optionRowsByAttribute.get(attributeId) ?? []),
      row,
    ]);
  }

  const compactRows = sheets["07_CATEGORY_ATTRIBUTES"];
  const templateRowsByFlow = new Map<string, SourceRow[]>();
  const overrideRowsByListingType = new Map<string, SourceRow[]>();
  for (const row of compactRows) {
    const attributeId = asString(row.attribute_id, "mapping.attribute_id");
    const groupId = asString(
      row.attribute_group_id,
      "mapping.attribute_group_id",
    );
    assert(
      attributeIds.has(attributeId),
      `Unknown mapping attribute ${attributeId}.`,
    );
    assert(groupIds.has(groupId), `Unknown mapping group ${groupId}.`);
    const scope = asString(row.mapping_scope, "mapping.mapping_scope");
    if (scope === "FLOW_TEMPLATE") {
      const flow = asString(row.publication_flow, "mapping.publication_flow");
      templateRowsByFlow.set(flow, [
        ...(templateRowsByFlow.get(flow) ?? []),
        row,
      ]);
    } else {
      assert(
        scope === "LISTING_TYPE_OVERRIDE",
        `Unknown mapping scope ${scope}.`,
      );
      const listingTypeId = asString(
        row.listing_type_id,
        "mapping.listing_type_id",
      );
      assert(
        listingTypeById.has(listingTypeId),
        `Unknown override listing type ${listingTypeId}.`,
      );
      overrideRowsByListingType.set(listingTypeId, [
        ...(overrideRowsByListingType.get(listingTypeId) ?? []),
        row,
      ]);
    }
  }

  const resolvedRowsByListingType = new Map<string, SourceRow[]>();
  for (const listingType of listingTypes) {
    const effective = new Map(
      (templateRowsByFlow.get(listingType.publicationFlow) ?? []).map((row) => [
        asString(row.attribute_id, "template.attribute_id"),
        row,
      ]),
    );
    assert(
      effective.size > 0,
      `No mapping template for ${listingType.publicationFlow}.`,
    );
    for (const override of overrideRowsByListingType.get(listingType.id) ??
      []) {
      const attributeId = asString(
        override.attribute_id,
        "override.attribute_id",
      );
      const action = asString(
        override.override_action,
        "override.override_action",
      );
      if (action === "EXCLUDE") effective.delete(attributeId);
      else if (action === "ADD") effective.set(attributeId, override);
      else throw new Error(`Unsupported mapping override ${action}.`);
    }
    resolvedRowsByListingType.set(listingType.id, [...effective.values()]);
  }
  const resolvedBindingCount = [...resolvedRowsByListingType.values()].reduce(
    (total, rows) => total + rows.length,
    0,
  );
  assert(
    resolvedBindingCount === EXPECTED_COUNTS.resolvedBindings,
    `Expected ${EXPECTED_COUNTS.resolvedBindings} resolved bindings; received ${resolvedBindingCount}.`,
  );

  const defaultGroupByAttribute = new Map<string, string>();
  const defaultOrderByAttribute = new Map<string, number>();
  for (const rows of resolvedRowsByListingType.values()) {
    for (const row of rows) {
      const attributeId = asString(row.attribute_id, "binding.attribute_id");
      const order = asNumber(row.display_order, "binding.display_order");
      if (!defaultGroupByAttribute.has(attributeId)) {
        defaultGroupByAttribute.set(
          attributeId,
          asString(row.attribute_group_id, "binding.attribute_group_id"),
        );
      }
      defaultOrderByAttribute.set(
        attributeId,
        Math.min(defaultOrderByAttribute.get(attributeId) ?? order, order),
      );
    }
  }

  const publicBindingAttributeIds = new Set(
    [...resolvedRowsByListingType.values()].flatMap((rows) =>
      rows.flatMap((row) =>
        [
          row.publication_visible,
          row.card_visible,
          row.detail_visible,
          row.searchable,
          row.filterable,
        ].some((value) => optionalBoolean(value) === true)
          ? [asString(row.attribute_id, "binding.attribute_id")]
          : [],
      ),
    ),
  );

  const attributes = attributeRows.map((row) => {
    const id = asString(row.attribute_id, "attribute_id");
    const dataType = asString(row.data_type, `${id}.data_type`);
    const uiComponent = asString(row.ui_component, `${id}.ui_component`);
    assert(
      MASTER_UI_COMPONENTS.has(uiComponent),
      `Unsupported UI component ${uiComponent} for ${id}.`,
    );
    const optionSetId = optionRowsByAttribute.has(id) ? id : undefined;
    return {
      id,
      code: asString(row.attribute_key, `${id}.attribute_key`),
      labels: {
        "fr-FR": asString(row.name_fr, `${id}.name_fr`),
        "en-US": asString(row.name_en, `${id}.name_en`),
      },
      dataType,
      sourceDataType: dataType,
      uiComponent,
      groupId: defaultGroupByAttribute.get(id) ?? "grp.general",
      scope: "GLOBAL",
      optionSetId,
      cardinality: asBoolean(row.multiple, `${id}.multiple`) ? "many" : "one",
      unit: optionalString(row.unit),
      defaultValue: optionalString(row.default_value),
      validation: {
        min: optionalNumber(row.min_value),
        max: optionalNumber(row.max_value),
        declarativeRules: [] as string[],
      },
      searchable: asBoolean(row.searchable, `${id}.searchable`),
      filterable: asBoolean(row.filterable, `${id}.filterable`),
      sortable: asBoolean(row.sortable, `${id}.sortable`),
      cardVisible: asBoolean(row.card_eligible, `${id}.card_eligible`),
      detailVisible: asBoolean(row.detail_eligible, `${id}.detail_eligible`),
      seoRelevant: asBoolean(row.seo_relevant, `${id}.seo_relevant`),
      sellerEligibility: {
        individualAllowed: asBoolean(
          row.private_allowed,
          `${id}.private_allowed`,
        ),
        professionalAllowed: asBoolean(
          row.professional_allowed,
          `${id}.professional_allowed`,
        ),
      },
      marketAvailability: marketAvailability(row.country_scope),
      defaultRequired: false,
      defaultDisplayOrder: defaultOrderByAttribute.get(id) ?? 0,
      privacy: publicBindingAttributeIds.has(id) ? "public" : "moderator_only",
      immutableAfterPublication: false,
      helpText: {
        "fr-FR": optionalString(row.description),
        "en-US": optionalString(row.description),
      },
      placeholder: { "fr-FR": undefined, "en-US": undefined },
    };
  });
  const attributeById = new Map(attributes.map((row) => [row.id, row]));

  const optionSets = [...optionRowsByAttribute.keys()].map((attributeId) => ({
    id: attributeId,
    labels: attributeById.get(attributeId)!.labels,
  }));
  const optionIdBySource = new Map<string, string>();
  const options = sheets["06_ATTRIBUTE_OPTIONS"].map((row) => {
    const sourceId = asString(row.option_id, "option.option_id");
    const attributeId = asString(row.attribute_id, `${sourceId}.attribute_id`);
    const key = asString(row.option_key, `${sourceId}.option_key`);
    const id = `${attributeId}:${key}`;
    assert(
      !optionIdBySource.has(sourceId),
      `Duplicate option source ${sourceId}.`,
    );
    optionIdBySource.set(sourceId, id);
    return {
      id,
      optionSetId: attributeId,
      key,
      labels: {
        "fr-FR": asString(row.label_fr, `${sourceId}.label_fr`),
        "en-US": asString(row.label_en, `${sourceId}.label_en`),
      },
      sortOrder: asNumber(row.display_order, `${sourceId}.display_order`),
      active: asBoolean(row.active, `${sourceId}.active`),
      managedExternally: false,
    };
  });
  assert(
    new Set(options.map((row) => row.id)).size === options.length,
    "Duplicate normalized options.",
  );
  const optionParentLinks = sheets["06_ATTRIBUTE_OPTIONS"].flatMap((row) => {
    const parentSourceId = optionalString(row.parent_option_id);
    if (!parentSourceId) return [];
    const optionId = optionIdBySource.get(
      asString(row.option_id, "option.option_id"),
    );
    const parentOptionId = optionIdBySource.get(parentSourceId);
    assert(
      optionId && parentOptionId,
      `Unknown option parent ${parentSourceId}.`,
    );
    return [{ optionId, parentOptionId }];
  });

  const bindings = listingTypes.flatMap((listingType) =>
    (resolvedRowsByListingType.get(listingType.id) ?? []).map((row) => {
      const attributeId = asString(row.attribute_id, "binding.attribute_id");
      const id = `${listingType.categoryId}|${listingType.id}|${attributeId}`;
      return {
        id,
        categoryId: listingType.categoryId,
        listingTypeId: listingType.id,
        intent: listingType.intent,
        attributeId,
        groupId: asString(row.attribute_group_id, `${id}.attribute_group_id`),
        scope: asString(row.mapping_scope, `${id}.mapping_scope`),
        sourceLevel:
          asString(row.mapping_scope, `${id}.mapping_scope`) === "FLOW_TEMPLATE"
            ? "publication_flow"
            : "listing_type",
        required: asBoolean(row.required, `${id}.required`),
        sortOrder: asNumber(row.display_order, `${id}.display_order`),
        publicationVisible: asBoolean(
          row.publication_visible,
          `${id}.publication_visible`,
        ),
        detailVisible: asBoolean(row.detail_visible, `${id}.detail_visible`),
        cardVisible: asBoolean(row.card_visible, `${id}.card_visible`),
        filterable: asBoolean(row.filterable, `${id}.filterable`),
        searchable: asBoolean(row.searchable, `${id}.searchable`),
        sortable: asBoolean(row.sortable, `${id}.sortable`),
        sellerEligibility: {
          individualAllowed: asBoolean(
            row.private_allowed,
            `${id}.private_allowed`,
          ),
          professionalAllowed: asBoolean(
            row.professional_allowed,
            `${id}.professional_allowed`,
          ),
        },
        overrideDefault: undefined,
      };
    }),
  );
  assert(
    new Set(bindings.map((row) => row.id)).size === bindings.length,
    "Duplicate effective bindings.",
  );

  const categoryById = new Map(categories.map((row) => [row.id, row]));
  const scopesForRow = (row: SourceRow) => [
    ...new Set(
      applicableListingTypes(
        optionalString(row.listing_type_id),
        optionalString(row.publication_flow),
        listingTypes,
      ).map((listingType) => listingType.categoryId),
    ),
  ];

  const dependencyEffects = (action: string): string[] => {
    if (action === "SHOW_AND_REQUIRE") return ["SHOW", "REQUIRE"];
    if (action === "SET_VALUE_AND_HIDE") return ["SET_VALUE", "HIDE"];
    if (action === "LIMIT_OPTIONS") return ["FILTER_OPTIONS"];
    if (action === "MAKE_OPTIONAL") return ["OPTIONAL"];
    return [action];
  };
  const dependencyOperator = (operator: string): string => {
    if (operator === "equals") return "eq";
    if (operator === "greater_than") return "gt";
    if (operator === "is_not_empty") return "is_set";
    return operator;
  };
  const dependencies = sheets["08_DEPENDENCIES"].flatMap((row) => {
    const sourceId = asString(row.dependency_id, "dependency_id");
    const action = asString(row.action, `${sourceId}.action`);
    const effects = dependencyEffects(action);
    return effects.map((effect, index) => ({
      id: effects.length === 1 ? sourceId : `${sourceId}.${index + 1}`,
      scopes: scopesForRow(row),
      trigger: fieldReference(
        asString(row.source_attribute, `${sourceId}.source_attribute`),
        attributeIds,
      ),
      operator: dependencyOperator(
        asString(row.operator, `${sourceId}.operator`),
      ),
      values: splitList(row.source_value),
      effect,
      targets: [
        fieldReference(
          asString(row.target_attribute, `${sourceId}.target_attribute`),
          attributeIds,
        ),
      ],
      detail: optionalString(row.allowed_values) ?? optionalString(row.notes),
      status: "draft" as const,
    }));
  });

  const validationRules = sheets["09_VALIDATIONS"].map((row) => {
    const id = asString(row.validation_id, "validation_id");
    const targetId = asString(row.attribute_id, `${id}.attribute_id`);
    return {
      id,
      target: fieldReference(targetId, attributeIds),
      scopes: scopesForRow(row),
      ruleType: asString(row.validation_type, `${id}.validation_type`),
      expression: JSON.stringify({
        rule: optionalString(row.rule),
        min: optionalNumber(row.min),
        max: optionalNumber(row.max),
        regex: optionalString(row.regex),
      }),
      severity: "BLOCK",
      messages: {
        "fr-FR": asString(row.error_message_fr, `${id}.error_message_fr`),
        "en-US": asString(row.error_message_en, `${id}.error_message_en`),
      },
      countries: splitList(row.country_scope),
      sellerScopes: ["all"],
      enforcement: "backend+frontend",
      status: "draft" as const,
    };
  });

  const regulatoryValidationRules = sheets["20_REGULATORY_FIELDS"].map(
    (row) => {
      const id = asString(row.regulatory_rule_id, "regulatory_rule_id");
      const countries = splitList(row.country_scope);
      return {
        id,
        target: fieldReference(
          asString(row.attribute_id, `${id}.attribute_id`),
          attributeIds,
        ),
        scopes: splitList(row.category_scope),
        ruleType: "regulatory_policy",
        expression: asString(row.requirement, `${id}.requirement`),
        severity: "REVIEW",
        messages: {
          "fr-FR": asString(row.rationale, `${id}.rationale`),
          "en-US": asString(row.rationale, `${id}.rationale`),
        },
        countries: countries.includes("ALL_MARKETS")
          ? [...ALLOWED_MARKETS]
          : countries,
        sellerScopes: splitList(row.seller_scope),
        enforcement: "backend",
        status: "disabled_pending_legal" as const,
      };
    },
  );

  const allValidationRules = [...validationRules, ...regulatoryValidationRules];

  const filterType = (source: string) => {
    if (source === "range" || source === "radius") return "range";
    if (source === "toggle") return "boolean";
    if (source === "location") return "keyword";
    return "multi_select";
  };
  const canonicalFilterRowsByKey = new Map<string, SourceRow>();
  for (const row of sheets["10_FILTERS"]) {
    const key = `${optionalString(row.listing_type_id) ?? optionalString(row.publication_flow) ?? "*"}|${asString(row.attribute_id, "filter.attribute_id")}`;
    const previous = canonicalFilterRowsByKey.get(key);
    if (
      !previous ||
      asNumber(row.display_order, "filter.display_order") <
        asNumber(previous.display_order, "filter.display_order")
    ) {
      canonicalFilterRowsByKey.set(key, row);
    }
  }
  const canonicalFilterRows = [...canonicalFilterRowsByKey.values()];
  const generatedFilters = listingTypes.flatMap((listingType) => {
    const resolved = new Set(
      (resolvedRowsByListingType.get(listingType.id) ?? []).map((row) =>
        asString(row.attribute_id, "resolved.attribute_id"),
      ),
    );
    return canonicalFilterRows.flatMap((row) => {
      const applicable = applicableListingTypes(
        optionalString(row.listing_type_id),
        optionalString(row.publication_flow),
        listingTypes,
      ).some((candidate) => candidate.id === listingType.id);
      const attributeId = asString(row.attribute_id, "filter.attribute_id");
      if (!applicable || !resolved.has(attributeId)) return [];
      const attribute = attributeById.get(attributeId)!;
      return [
        {
          id: `${listingType.id}|${attributeId}`,
          categoryId: listingType.categoryId,
          listingTypeId: listingType.id,
          attributeId,
          labels: {
            "fr-FR": asString(row.filter_label_fr, "filter.filter_label_fr"),
            "en-US": asString(row.filter_label_en, "filter.filter_label_en"),
          },
          uiComponent: attribute.uiComponent,
          filterType: filterType(
            asString(row.filter_type, "filter.filter_type"),
          ),
          sourceFilterType: asString(row.filter_type, "filter.filter_type"),
          optionSetId: attribute.optionSetId,
          sortOrder: asNumber(row.display_order, "filter.display_order"),
        },
      ];
    });
  });
  assert(
    new Set(generatedFilters.map((row) => row.id)).size ===
      generatedFilters.length,
    "Duplicate expanded filters.",
  );

  const cardFields = listingTypes.flatMap((listingType) => {
    const resolved = new Set(
      (resolvedRowsByListingType.get(listingType.id) ?? []).map((row) =>
        asString(row.attribute_id, "resolved.attribute_id"),
      ),
    );
    return sheets["13_CARD_FIELDS"].flatMap((row) => {
      const applicable = applicableListingTypes(
        optionalString(row.listing_type_id),
        optionalString(row.publication_flow),
        listingTypes,
      ).some((candidate) => candidate.id === listingType.id);
      const attributeId = asString(row.attribute_id, "card.attribute_id");
      if (!applicable || !resolved.has(attributeId)) return [];
      const slot = asBoolean(row.primary, "card.primary")
        ? "primary"
        : asBoolean(row.secondary, "card.secondary")
          ? "secondary"
          : asBoolean(row.badge, "card.badge")
            ? "badge"
            : "supporting";
      return [
        {
          listingTypeId: listingType.id,
          categoryId: listingType.categoryId,
          slot,
          field: fieldReference(attributeId, attributeIds),
          labels: attributeById.get(attributeId)!.labels,
          format: undefined,
          sortOrder: asNumber(row.display_order, "card.display_order"),
        },
      ];
    });
  });

  const detailFields = listingTypes.flatMap((listingType) => {
    const resolved = new Set(
      (resolvedRowsByListingType.get(listingType.id) ?? []).map((row) =>
        asString(row.attribute_id, "resolved.attribute_id"),
      ),
    );
    const rows = sheets["14_DETAIL_FIELDS"].filter((row) =>
      applicableListingTypes(
        optionalString(row.listing_type_id),
        optionalString(row.publication_flow),
        listingTypes,
      ).some((candidate) => candidate.id === listingType.id),
    );
    const sectionOrder = new Map<string, number>();
    for (const row of rows) {
      const section = asString(row.section, "detail.section");
      if (!sectionOrder.has(section))
        sectionOrder.set(section, sectionOrder.size + 1);
    }
    return rows.flatMap((row) => {
      const attributeId = asString(row.attribute_id, "detail.attribute_id");
      if (!resolved.has(attributeId)) return [];
      const section = asString(row.section, "detail.section");
      const sectionIndex = sectionOrder.get(section)!;
      return [
        {
          listingTypeId: listingType.id,
          categoryId: listingType.categoryId,
          sectionId: normalizedText(section).replace(/[^a-z0-9]+/g, "_"),
          sectionLabels: { "fr-FR": section, "en-US": section },
          sectionOrder: sectionIndex,
          field: fieldReference(attributeId, attributeIds),
          labels: attributeById.get(attributeId)!.labels,
          sortOrder:
            sectionIndex * 1000 +
            asNumber(row.display_order, "detail.display_order"),
          emphasis: asBoolean(row.highlight, "detail.highlight")
            ? "highlight"
            : undefined,
          emptyBehavior: "omit",
        },
      ];
    });
  });

  const publicationFlow = listingTypes.flatMap((listingType) => {
    const resolved = new Set(
      (resolvedRowsByListingType.get(listingType.id) ?? []).map((row) =>
        asString(row.attribute_id, "resolved.attribute_id"),
      ),
    );
    const templateRows = sheets["12_PUBLICATION_FLOW"].filter((row) =>
      applicableListingTypes(
        optionalString(row.listing_type_id),
        optionalString(row.publication_flow),
        listingTypes,
      ).some((candidate) => candidate.id === listingType.id),
    );
    const byStep = new Map<number, SourceRow[]>();
    for (const row of templateRows) {
      const attributeId = asString(row.attribute, "publication.attribute");
      if (!resolved.has(attributeId)) continue;
      const step = asNumber(row.step, "publication.step");
      byStep.set(step, [...(byStep.get(step) ?? []), row]);
    }
    const orderedSteps = [...byStep.keys()].sort((left, right) => left - right);
    return orderedSteps.map((step, index) => {
      const rows = byStep.get(step)!;
      const first = rows[0];
      return {
        listingTypeId: listingType.id,
        categoryId: listingType.categoryId,
        intent: listingType.intent,
        step,
        stepId: `${listingType.publicationFlow}.step_${step}`,
        labels: {
          "fr-FR": asString(first.step_name_fr, "publication.step_name_fr"),
          "en-US": asString(first.step_name_en, "publication.step_name_en"),
        },
        sections: [
          ...new Set(
            rows.map((row) =>
              asString(row.attribute_group, "publication.attribute_group"),
            ),
          ),
        ],
        requiredFields: rows
          .filter((row) => asBoolean(row.required, "publication.required"))
          .map((row) =>
            fieldReference(
              asString(row.attribute, "publication.attribute"),
              attributeIds,
            ),
          ),
        condition: undefined,
        validation: undefined,
        helpText: rows
          .map((row) => optionalString(row.help_text))
          .find(Boolean),
        nextStepId:
          index + 1 < orderedSteps.length
            ? `${listingType.publicationFlow}.step_${orderedSteps[index + 1]}`
            : undefined,
      };
    });
  });

  const compatibleSortKey = (key: string): string | undefined => {
    if (key === "newest") return "recent";
    if (["relevance", "price_asc", "price_desc", "distance"].includes(key))
      return key;
    return undefined;
  };
  const searchProjections = listingTypes.map((listingType) => {
    const resolved = new Set(
      (resolvedRowsByListingType.get(listingType.id) ?? []).map((row) =>
        asString(row.attribute_id, "resolved.attribute_id"),
      ),
    );
    const searchRows = sheets["15_SEARCH_FIELDS"].filter(
      (row) =>
        applicableListingTypes(
          optionalString(row.listing_type_id),
          optionalString(row.publication_flow),
          listingTypes,
        ).some((candidate) => candidate.id === listingType.id) &&
        resolved.has(asString(row.attribute_id, "search.attribute_id")),
    );
    const filterRows = generatedFilters.filter(
      (row) => row.listingTypeId === listingType.id,
    );
    const sortRows = sheets["11_SORT_OPTIONS"].filter((row) =>
      applicableListingTypes(
        optionalString(row.listing_type_id),
        optionalString(row.publication_flow),
        listingTypes,
      ).some((candidate) => candidate.id === listingType.id),
    );
    const sortOptions = [
      ...new Set(
        sortRows.flatMap((row) => {
          const key = compatibleSortKey(
            asString(row.sort_key, "sort.sort_key"),
          );
          return key ? [key] : [];
        }),
      ),
    ];
    const defaultSort =
      sortRows
        .filter((row) => asBoolean(row.default, "sort.default"))
        .map((row) =>
          compatibleSortKey(asString(row.sort_key, "sort.sort_key")),
        )
        .find(Boolean) ??
      sortOptions[0] ??
      "relevance";
    if (!sortOptions.includes(defaultSort)) sortOptions.unshift(defaultSort);
    return {
      categoryId: listingType.categoryId,
      searchableFields: [
        ...new Set(
          searchRows.map((row) =>
            asString(row.attribute_id, "search.attribute_id"),
          ),
        ),
      ],
      filterableAttributeIds: [
        ...new Set(filterRows.map((row) => row.attributeId)),
      ],
      sortableAttributeIds: [
        ...new Set(
          searchRows
            .filter((row) => splitList(row.search_roles).includes("SORT"))
            .map((row) => asString(row.attribute_id, "search.attribute_id")),
        ),
      ],
      sortOptions,
      defaultSort,
    };
  });

  const seoProjections = categories.map((category) => ({
    categoryId: category.id,
    urlPattern: `/categorie/${category.slug}`,
    locationUrlPattern: `/categorie/${category.slug}/{location}`,
    facetUrlPattern: `/categorie/${category.slug}?{facets}`,
    h1: category.labels,
    titleTemplate: {
      "fr-FR": `${category.labels["fr-FR"]} | Shongre`,
      "en-US": `${category.labels["en-US"]} | Shongre`,
    },
    descriptionTemplate: {
      "fr-FR":
        category.description ??
        `Annonces ${category.labels["fr-FR"]} sur Shongre.`,
      "en-US":
        category.description ??
        `${category.labels["en-US"]} listings on Shongre.`,
    },
    indexable: category.seo.indexable,
    canonicalStrategy: "market_url_builder",
    indexableFacets: [] as string[],
    structuredData: category.publishable
      ? ["CollectionPage", "ItemList"]
      : ["CollectionPage"],
    sitemap: { eligible: category.seo.indexable, policy: "seo_policy" },
  }));

  const aliases = new Map<
    string,
    { alias: string; canonicalCategoryId: string; kind: string }
  >();
  const addAlias = (
    aliasValue: string,
    canonicalCategoryId: string,
    kind: string,
  ) => {
    const alias = aliasValue.trim().toLocaleLowerCase("fr-FR");
    if (!alias || alias === "bons-plans") return;
    assert(
      categoryById.has(canonicalCategoryId),
      `Alias ${alias} targets missing ${canonicalCategoryId}.`,
    );
    const previous = aliases.get(alias);
    if (!previous) aliases.set(alias, { alias, canonicalCategoryId, kind });
  };
  for (const mapping of crosswalk.v3Nodes) {
    const source = CANONICAL_TAXONOMY_IDENTITIES.find(
      (node) => node.id === mapping.sourceId,
    )!;
    addAlias(source.id, mapping.canonicalId, "v3_id");
    addAlias(source.slug, mapping.canonicalId, "v3_slug");
  }
  for (const mapping of crosswalk.previousV4Nodes) {
    addAlias(mapping.sourceId, mapping.canonicalId, "previous_v4_id");
  }
  for (const [alias, sourceId] of Object.entries(CANONICAL_TAXONOMY_ALIASES)) {
    const mapping = crosswalk.v3Nodes.find((row) => row.sourceId === sourceId);
    assert(mapping, `Legacy alias ${alias} has no v3 crosswalk row.`);
    addAlias(alias, mapping.canonicalId, "v3_slug");
  }

  const countryPolicyDrafts = sheets["19_COUNTRY_RULES"].map((row) => {
    const countryCode = asString(row.country_code, "country_rule.country_code");
    return {
      id: asString(row.country_rule_id, "country_rule_id"),
      verticalId: asString(row.vertical_id, "country_rule.vertical_id"),
      countryCode,
      knownMarket: (ALLOWED_MARKETS as readonly string[]).includes(countryCode),
      overrideType: "vertical_market_policy",
      target: asString(row.vertical_id, "country_rule.vertical_id"),
      proposedValue: JSON.stringify({
        availability: optionalString(row.availability),
        currency: optionalString(row.currency),
        measurementUnits: optionalString(row.measurement_units),
        locationModel: optionalString(row.location_model),
        marketPath: optionalString(row.market_path),
      }),
      legalVerificationStatus: asString(
        row.legal_verification_status,
        "country_rule.legal_verification_status",
      ),
      status: "quarantined_unverified_policy" as const,
    };
  });

  const sellerRules = sheets["17_SELLER_RULES"].map((row) => ({
    id: asString(row.seller_rule_id, "seller_rule_id"),
    sellerType: asString(row.seller_role, "seller_rule.seller_role"),
    capability: `${asString(row.publication_flow, "seller_rule.publication_flow")}:${optionalString(row.category_id) ?? "*"}`,
    proposedAllowed: String(asBoolean(row.allowed, "seller_rule.allowed")),
    proposedLimit: undefined,
    proposedVerification:
      [
        asBoolean(
          row.identity_verification_required,
          "seller_rule.identity_verification_required",
        )
          ? "identity"
          : "",
        asBoolean(
          row.business_verification_required,
          "seller_rule.business_verification_required",
        )
          ? "business"
          : "",
        asBoolean(
          row.business_identifier_required,
          "seller_rule.business_identifier_required",
        )
          ? "business_identifier"
          : "",
        optionalString(row.special_requirements) ?? "",
      ]
        .filter(Boolean)
        .join(",") || undefined,
    status: "disabled_pending_policy_review" as const,
  }));

  const locationRules = sheets["16_LOCATION_RULES"].map((row) => ({
    id: asString(row.location_rule_id, "location_rule_id"),
    listingTypeId: optionalString(row.listing_type_id),
    publicationFlow: optionalString(row.publication_flow),
    categoryId: optionalString(row.category_id),
    exactAddressRequiredForModeration: asBoolean(
      row.exact_address_required_for_moderation,
      "location.exact_address_required_for_moderation",
    ),
    approximatePublicAddressAllowed: asBoolean(
      row.approximate_public_address_allowed,
      "location.approximate_public_address_allowed",
    ),
    cityRequired: asBoolean(row.city_required, "location.city_required"),
    postalCodeRequired: asBoolean(
      row.postal_code_required,
      "location.postal_code_required",
    ),
    administrativeAreaRequired: asBoolean(
      row.administrative_area_required,
      "location.administrative_area_required",
    ),
    geographicRadiusEnabled: asBoolean(
      row.geographic_radius_enabled,
      "location.geographic_radius_enabled",
    ),
    hideExactPublicLocation: asBoolean(
      row.hide_exact_public_location,
      "location.hide_exact_public_location",
    ),
    remoteServiceAllowed: asBoolean(
      row.remote_service_allowed,
      "location.remote_service_allowed",
    ),
    nationalListingAllowed: asBoolean(
      row.national_listing_allowed,
      "location.national_listing_allowed",
    ),
    countryScope: splitList(row.country_scope),
  }));

  const privateVsPro = sheets["18_PRIVATE_VS_PRO"].map((row) => ({
    listingTypeId: optionalString(row.listing_type_id),
    publicationFlow: optionalString(row.publication_flow),
    categoryId: optionalString(row.category_id),
    privateAllowed: asBoolean(
      row.private_allowed,
      "private_vs_pro.private_allowed",
    ),
    professionalAllowed: asBoolean(
      row.professional_allowed,
      "private_vs_pro.professional_allowed",
    ),
    sharedTaxonomy: asBoolean(
      row.shared_taxonomy,
      "private_vs_pro.shared_taxonomy",
    ),
    privateSpecificFields: splitList(row.private_specific_fields),
    professionalAdditionalFields: splitList(row.professional_additional_fields),
    publicationVolumeRule: optionalString(row.publication_volume_rule),
    mediaRule: optionalString(row.media_rule),
    moderationRule: optionalString(row.moderation_rule),
    inventoryRule: optionalString(row.inventory_rule),
    promotionRule: optionalString(row.promotion_rule),
  }));

  const referenceData = sheets["21_REFERENCE_DATA"].map((row) => ({
    id: asString(row.dataset_id, "reference_data.dataset_id"),
    labels: {
      "fr-FR": asString(row.name_fr, "reference_data.name_fr"),
      "en-US": asString(row.name_en, "reference_data.name_en"),
    },
    domain: asString(row.domain, "reference_data.domain"),
    keyStructure: asString(row.key_structure, "reference_data.key_structure"),
    parentDatasetId: optionalString(row.parent_dataset_id),
    managementMode: asString(
      row.management_mode,
      "reference_data.management_mode",
    ),
    countryScope: splitList(row.country_scope),
    refreshFrequency: optionalString(row.refresh_frequency),
    sourceCandidate: optionalString(row.source_candidate),
    status: asString(row.shongre_status, "reference_data.shongre_status"),
  }));
  const referenceIds = new Set(referenceData.map((row) => row.id));
  for (const row of referenceData) {
    assert(
      !row.parentDatasetId || referenceIds.has(row.parentDatasetId),
      `Unknown reference-data parent ${row.parentDatasetId}.`,
    );
  }

  const comparison = crosswalk.baselineComparison;

  const source = {
    metadata: {
      taxonomyVersion: VERSION,
      compilerVersion: COMPILER_VERSION,
      workbookSha256: workbookChecksum,
      importedSheets: [...CORE_SHEETS],
      advisorySheetsImported: [...ADVISORY_SHEETS],
    },
    verticals,
    categories,
    listingTypes,
    attributes,
    attributeGroups,
    optionSets,
    options,
    optionParentLinks,
    bindings,
    dependencies,
    validationRules: allValidationRules,
    countryPolicyDrafts,
    sellerRules,
    policies: {
      locationRules,
      privateVsPro,
      countryRules: countryPolicyDrafts,
      regulatoryRules: regulatoryValidationRules,
      sortOptions: sheets["11_SORT_OPTIONS"],
    },
    referenceData,
    projections: {
      filters: generatedFilters,
      cardFields,
      detailFields,
      publicationFlow,
      search: searchProjections,
      seo: seoProjections,
    },
    aliases: [...aliases.values()],
    crosswalk,
    quarantine: {
      unknownMarketCodes: [
        ...new Set(
          countryPolicyDrafts
            .filter((row) => !row.knownMarket)
            .map((row) => row.countryCode),
        ),
      ].sort(),
      countryPolicyDraftIds: countryPolicyDrafts.map((row) => row.id),
      disabledValidationRuleIds: regulatoryValidationRules.map((row) => row.id),
      disabledSellerRuleIds: sellerRules.map((row) => row.id),
      unresolvedAttributeValues: [] as unknown[],
    },
    verification: {
      sourceCounts: { ...EXPECTED_COUNTS },
      advisorySheetCounts: advisoryCounts,
      normalizedCounts: {
        verticals: verticals.length,
        workbookCategories: categoryNodes.length,
        taxonomyNodes: categories.length,
        roots: categories.filter((row) => !row.parentId).length,
        publishableLeaves: categories.filter((row) => row.publishable).length,
        listingTypes: listingTypes.length,
        publicationFlows: new Set(
          listingTypes.map((row) => row.publicationFlow),
        ).size,
        intents: new Set(listingTypes.map((row) => row.intent)).size,
        attributes: attributes.length,
        attributeGroups: attributeGroups.length,
        optionSets: optionSets.length,
        options: options.length,
        optionParentLinks: optionParentLinks.length,
        compactBindings: compactRows.length,
        bindings: bindings.length,
        dependencies: dependencies.length,
        sourceValidationRules: validationRules.length,
        regulatoryValidationRules: regulatoryValidationRules.length,
        validationRules: allValidationRules.length,
        filters: generatedFilters.length,
        cardFields: cardFields.length,
        detailFields: detailFields.length,
        publicationFlow: publicationFlow.length,
        searchProjections: searchProjections.length,
        seoProjections: seoProjections.length,
        aliases: aliases.size,
        referenceData: referenceData.length,
      },
      templateResolution: {
        compactMappingRows: compactRows.length,
        flowTemplateRows: compactRows.filter(
          (row) => row.mapping_scope === "FLOW_TEMPLATE",
        ).length,
        addOverrides: compactRows.filter((row) => row.override_action === "ADD")
          .length,
        excludeOverrides: compactRows.filter(
          (row) => row.override_action === "EXCLUDE",
        ).length,
        resolvedRelationships: bindings.length,
        duplicateEffectiveBindings: 0,
        sourceFilterRows: sheets["10_FILTERS"].length,
        canonicalFilterTemplates: canonicalFilterRows.length,
        eliminatedDuplicateFilterTemplates:
          sheets["10_FILTERS"].length - canonicalFilterRows.length,
      },
      comparison,
      publicRuleCounts: {
        dependencies: dependencies.filter((row) =>
          PUBLIC_DEPENDENCY_EFFECTS.has(row.effect),
        ).length,
        validations: validationRules.length,
      },
    },
  };
  const sourceChecksum = sha256(stableJson(source));
  return {
    ...source,
    metadata: { ...source.metadata, normalizedSha256: sourceChecksum },
  };
}

export type NormalizedSource = ReturnType<typeof normalizeWorkbook>;

function buildPublicBundle(source: NormalizedSource) {
  const publicAttributes = source.attributes.filter(
    (attribute) => attribute.privacy === "public",
  );
  const publicAttributeIds = new Set(
    publicAttributes.map((attribute) => attribute.id),
  );
  const publicGroupIds = new Set(
    source.bindings
      .filter((binding) => publicAttributeIds.has(binding.attributeId))
      .map((binding) => binding.groupId),
  );
  const publicOptionSetIds = new Set(
    publicAttributes.flatMap((attribute) =>
      attribute.optionSetId ? [attribute.optionSetId] : [],
    ),
  );
  const publicOptions = source.options.filter((option) =>
    publicOptionSetIds.has(option.optionSetId),
  );
  const publicOptionIds = new Set(publicOptions.map((option) => option.id));
  const hasOnlyPublicAttributeReferences = (
    references: Array<{ kind: string; key: string }>,
  ) =>
    references.every(
      (reference) =>
        reference.kind !== "attribute" || publicAttributeIds.has(reference.key),
    );
  const publicDependencies = source.dependencies.filter(
    (rule) =>
      PUBLIC_DEPENDENCY_EFFECTS.has(rule.effect) &&
      hasOnlyPublicAttributeReferences([rule.trigger, ...rule.targets]),
  );
  const publicValidationRules = source.validationRules
    .filter(
      (rule) =>
        rule.status === "draft" &&
        hasOnlyPublicAttributeReferences([rule.target]),
    )
    .map(({ expression: _expression, ...rule }) => rule);
  const projections = {
    filters: source.projections.filters.filter((row) =>
      publicAttributeIds.has(row.attributeId),
    ),
    cardFields: source.projections.cardFields.filter(
      (row) =>
        row.field.kind !== "attribute" || publicAttributeIds.has(row.field.key),
    ),
    detailFields: source.projections.detailFields.filter(
      (row) =>
        row.field.kind !== "attribute" || publicAttributeIds.has(row.field.key),
    ),
    publicationFlow: source.projections.publicationFlow.map((row) => ({
      ...row,
      requiredFields: row.requiredFields.filter(
        (field) =>
          field.kind !== "attribute" || publicAttributeIds.has(field.key),
      ),
    })),
    search: source.projections.search.map((row) => ({
      ...row,
      searchableFields: row.searchableFields.filter((id) =>
        publicAttributeIds.has(id),
      ),
      filterableAttributeIds: row.filterableAttributeIds.filter((id) =>
        publicAttributeIds.has(id),
      ),
      sortableAttributeIds: row.sortableAttributeIds.filter((id) =>
        publicAttributeIds.has(id),
      ),
    })),
    seo: source.projections.seo,
  };
  return {
    metadata: {
      taxonomyVersion: source.metadata.taxonomyVersion,
      compilerVersion: source.metadata.compilerVersion,
      workbookSha256: source.metadata.workbookSha256,
      normalizedSha256: source.metadata.normalizedSha256,
      pagination: { defaultLimit: 50, maxLimit: 200 },
      sourceCounts: {
        categories: source.categories.length,
        listingTypes: source.listingTypes.length,
        attributes: source.attributes.length,
        bindings: source.bindings.length,
      },
    },
    categories: source.categories,
    listingTypes: source.listingTypes,
    attributes: publicAttributes,
    attributeGroups: source.attributeGroups.filter((group) =>
      publicGroupIds.has(group.id),
    ),
    optionSets: source.optionSets.filter((optionSet) =>
      publicOptionSetIds.has(optionSet.id),
    ),
    options: publicOptions,
    optionParentLinks: source.optionParentLinks.filter(
      (link) =>
        publicOptionIds.has(link.optionId) &&
        publicOptionIds.has(link.parentOptionId),
    ),
    bindings: source.bindings.filter((binding) =>
      publicAttributeIds.has(binding.attributeId),
    ),
    dependencyRules: publicDependencies,
    validationRules: publicValidationRules,
    projections,
    aliases: source.aliases,
    compatibility: {
      supportedIntentsByCategory: Object.fromEntries(
        source.categories.map((category) => [
          category.id,
          [
            ...new Set(
              source.listingTypes
                .filter((listingType) => listingType.categoryId === category.id)
                .map((listingType) => listingType.intent),
            ),
          ],
        ]),
      ),
      v3Crosswalk: source.crosswalk.v3Nodes,
    },
  };
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function jsonLiteral(value: unknown): string {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function sqlNullable(value: string | undefined): string {
  return value === undefined ? "NULL" : sqlLiteral(value);
}

function sqlIdList(ids: string[]): string {
  return ids.map(sqlLiteral).join(",");
}

function generateSeedSql(source: NormalizedSource): string {
  const lines = [
    "-- Generated by backend/scripts/taxonomy/compile.ts. Do not edit.",
    `-- taxonomy=${VERSION} workbook_sha256=${source.metadata.workbookSha256}`,
    "-- This seed is imported only through the guarded local workflow.",
    "BEGIN;",
    "",
    "INSERT INTO public.taxonomy_imports (taxonomy_version, compiler_version, workbook_sha256, normalized_sha256, source_counts, status)",
    `VALUES (${sqlLiteral(VERSION)}, ${sqlLiteral(COMPILER_VERSION)}, ${sqlLiteral(source.metadata.workbookSha256)}, ${sqlLiteral(source.metadata.normalizedSha256)}, ${jsonLiteral(source.verification.sourceCounts)}, 'compiled')`,
    "ON CONFLICT (taxonomy_version, workbook_sha256) DO UPDATE SET normalized_sha256 = EXCLUDED.normalized_sha256, source_counts = EXCLUDED.source_counts, status = EXCLUDED.status;",
    "",
  ];

  for (const group of source.attributeGroups) {
    lines.push(
      `INSERT INTO public.taxonomy_attribute_groups (id, labels, icon_name, sort_order, collapsible, is_public) VALUES (${sqlLiteral(group.id)}, ${jsonLiteral(group.labels)}, ${sqlLiteral(group.iconName)}, ${group.sortOrder}, ${group.collapsible}, ${group.public}) ON CONFLICT (id) DO UPDATE SET labels = EXCLUDED.labels, icon_name = EXCLUDED.icon_name, sort_order = EXCLUDED.sort_order, collapsible = EXCLUDED.collapsible, is_public = EXCLUDED.is_public;`,
    );
  }
  for (const optionSet of source.optionSets) {
    lines.push(
      `INSERT INTO public.taxonomy_option_sets (id, labels) VALUES (${sqlLiteral(optionSet.id)}, ${jsonLiteral(optionSet.labels)}) ON CONFLICT (id) DO UPDATE SET labels = EXCLUDED.labels;`,
    );
  }
  for (const option of source.options) {
    lines.push(
      `INSERT INTO public.taxonomy_options (id, option_set_id, option_key, labels, sort_order, is_active, managed_externally) VALUES (${sqlLiteral(option.id)}, ${sqlLiteral(option.optionSetId)}, ${sqlLiteral(option.key)}, ${jsonLiteral(option.labels)}, ${option.sortOrder}, ${option.active}, ${option.managedExternally}) ON CONFLICT (id) DO UPDATE SET option_set_id = EXCLUDED.option_set_id, option_key = EXCLUDED.option_key, labels = EXCLUDED.labels, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active, managed_externally = EXCLUDED.managed_externally;`,
    );
  }
  for (const link of source.optionParentLinks) {
    lines.push(
      `INSERT INTO public.taxonomy_option_parent_links (option_id, parent_option_id) VALUES (${sqlLiteral(link.optionId)}, ${sqlLiteral(link.parentOptionId)}) ON CONFLICT DO NOTHING;`,
    );
  }
  for (const category of source.categories) {
    lines.push(
      `INSERT INTO public.categories (id, code, slug, name, parent_id, icon_name, sort_order, is_active, labels, level, publishable, status, seller_eligibility, active_market_codes, seo_config, source_key) VALUES (${sqlLiteral(category.id)}, ${sqlLiteral(category.sourceKey)}, ${sqlLiteral(category.slug)}, ${sqlLiteral(category.labels["fr-FR"])}, ${sqlNullable(category.parentId)}, ${sqlLiteral(category.iconName)}, ${category.sortOrder}, ${category.status === "active"}, ${jsonLiteral(category.labels)}, ${sqlLiteral(category.level === 0 ? "category" : category.level === 1 ? "subcategory" : "type")}, ${category.publishable}, ${sqlLiteral(category.status)}, ${jsonLiteral(category.sellerEligibility)}, ARRAY[${category.marketAvailability
        .filter((market) => market.marketplaceEnabled)
        .map((market) => sqlLiteral(market.marketCode))
        .join(
          ",",
        )}], ${jsonLiteral(category.seo)}, ${sqlLiteral(category.sourceKey)}) ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, slug = EXCLUDED.slug, name = EXCLUDED.name, parent_id = EXCLUDED.parent_id, icon_name = EXCLUDED.icon_name, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active, labels = EXCLUDED.labels, level = EXCLUDED.level, publishable = EXCLUDED.publishable, status = EXCLUDED.status, seller_eligibility = EXCLUDED.seller_eligibility, active_market_codes = EXCLUDED.active_market_codes, seo_config = EXCLUDED.seo_config, source_key = EXCLUDED.source_key, updated_at = NOW();`,
    );
  }
  for (const listingType of source.listingTypes) {
    lines.push(
      `INSERT INTO public.taxonomy_listing_types (id, source_key, category_id, vertical_id, publication_flow, intent, labels, intent_labels, slug, seller_eligibility, status, seo_indexable) VALUES (${sqlLiteral(listingType.id)}, ${sqlLiteral(listingType.sourceKey)}, ${sqlLiteral(listingType.categoryId)}, ${sqlLiteral(listingType.verticalId)}, ${sqlLiteral(listingType.publicationFlow)}, ${sqlLiteral(listingType.intent)}, ${jsonLiteral(listingType.labels)}, ${jsonLiteral(listingType.intentLabel)}, ${sqlLiteral(listingType.slug)}, ${jsonLiteral(listingType.sellerEligibility)}, ${sqlLiteral(listingType.status)}, ${listingType.seoIndexable}) ON CONFLICT (id) DO UPDATE SET category_id = EXCLUDED.category_id, vertical_id = EXCLUDED.vertical_id, publication_flow = EXCLUDED.publication_flow, intent = EXCLUDED.intent, labels = EXCLUDED.labels, intent_labels = EXCLUDED.intent_labels, slug = EXCLUDED.slug, seller_eligibility = EXCLUDED.seller_eligibility, status = EXCLUDED.status, seo_indexable = EXCLUDED.seo_indexable, updated_at = NOW();`,
    );
  }
  for (const attribute of source.attributes) {
    lines.push(
      `INSERT INTO public.taxonomy_attributes (id, code, label, labels, data_type, unit, field_role, privacy, is_required, is_filterable, is_searchable, is_sortable, options, validation, publication_group, display_order, ui_component, attribute_group_id, option_set_id, immutable_after_publication) VALUES (${sqlLiteral(attribute.id)}, ${sqlLiteral(attribute.code)}, ${sqlLiteral(attribute.labels["fr-FR"])}, ${jsonLiteral(attribute.labels)}, ${sqlLiteral(attribute.dataType)}, ${sqlNullable(attribute.unit)}, ${sqlLiteral(attribute.defaultRequired ? "required" : "optional")}, ${sqlLiteral(attribute.privacy)}, ${attribute.defaultRequired}, ${attribute.filterable}, ${attribute.searchable}, ${attribute.sortable}, '[]'::jsonb, ${jsonLiteral(attribute.validation)}, 'general', ${attribute.defaultDisplayOrder}, ${sqlLiteral(attribute.uiComponent)}, ${sqlLiteral(attribute.groupId)}, ${sqlNullable(attribute.optionSetId)}, ${attribute.immutableAfterPublication}) ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, label = EXCLUDED.label, labels = EXCLUDED.labels, data_type = EXCLUDED.data_type, unit = EXCLUDED.unit, field_role = EXCLUDED.field_role, privacy = EXCLUDED.privacy, is_required = EXCLUDED.is_required, is_filterable = EXCLUDED.is_filterable, is_searchable = EXCLUDED.is_searchable, is_sortable = EXCLUDED.is_sortable, validation = EXCLUDED.validation, display_order = EXCLUDED.display_order, ui_component = EXCLUDED.ui_component, attribute_group_id = EXCLUDED.attribute_group_id, option_set_id = EXCLUDED.option_set_id, immutable_after_publication = EXCLUDED.immutable_after_publication, updated_at = NOW();`,
    );
  }
  for (const binding of source.bindings) {
    lines.push(
      `INSERT INTO public.taxonomy_attribute_bindings (id, category_id, listing_type_id, intent, attribute_id, group_id, scope, source_level, is_required, sort_order, publication_visible, detail_visible, card_visible, filterable, searchable, sortable, seller_eligibility, override_default) VALUES (${sqlLiteral(binding.id)}, ${sqlLiteral(binding.categoryId)}, ${sqlLiteral(binding.listingTypeId)}, ${sqlLiteral(binding.intent)}, ${sqlLiteral(binding.attributeId)}, ${sqlLiteral(binding.groupId)}, ${sqlLiteral(binding.scope)}, ${sqlLiteral(binding.sourceLevel)}, ${binding.required}, ${binding.sortOrder}, ${binding.publicationVisible}, ${binding.detailVisible}, ${binding.cardVisible}, ${binding.filterable}, ${binding.searchable}, ${binding.sortable}, ${jsonLiteral(binding.sellerEligibility)}, ${sqlNullable(binding.overrideDefault)}) ON CONFLICT (id) DO UPDATE SET is_required = EXCLUDED.is_required, sort_order = EXCLUDED.sort_order, publication_visible = EXCLUDED.publication_visible, detail_visible = EXCLUDED.detail_visible, card_visible = EXCLUDED.card_visible, filterable = EXCLUDED.filterable, searchable = EXCLUDED.searchable, sortable = EXCLUDED.sortable, seller_eligibility = EXCLUDED.seller_eligibility, override_default = EXCLUDED.override_default, updated_at = NOW();`,
    );
  }
  for (const rule of source.dependencies) {
    lines.push(
      `INSERT INTO public.taxonomy_dependency_rules (id, scopes, trigger, operator, trigger_values, effect, targets, detail, status) VALUES (${sqlLiteral(rule.id)}, ${jsonLiteral(rule.scopes)}, ${jsonLiteral(rule.trigger)}, ${sqlLiteral(rule.operator)}, ${jsonLiteral(rule.values)}, ${sqlLiteral(rule.effect)}, ${jsonLiteral(rule.targets)}, ${sqlNullable(rule.detail)}, ${sqlLiteral(rule.status)}) ON CONFLICT (id) DO UPDATE SET scopes = EXCLUDED.scopes, trigger = EXCLUDED.trigger, operator = EXCLUDED.operator, trigger_values = EXCLUDED.trigger_values, effect = EXCLUDED.effect, targets = EXCLUDED.targets, detail = EXCLUDED.detail, status = EXCLUDED.status, updated_at = NOW();`,
    );
  }
  for (const rule of source.validationRules) {
    lines.push(
      `INSERT INTO public.taxonomy_validation_rules (id, target, scopes, rule_type, expression, severity, messages, country_codes, seller_scopes, enforcement, status) VALUES (${sqlLiteral(rule.id)}, ${jsonLiteral(rule.target)}, ${jsonLiteral(rule.scopes)}, ${sqlLiteral(rule.ruleType)}, ${sqlLiteral(rule.expression)}, ${sqlLiteral(rule.severity)}, ${jsonLiteral(rule.messages)}, ${jsonLiteral(rule.countries)}, ${jsonLiteral(rule.sellerScopes)}, ${sqlLiteral(rule.enforcement)}, ${sqlLiteral(rule.status)}) ON CONFLICT (id) DO UPDATE SET target = EXCLUDED.target, scopes = EXCLUDED.scopes, rule_type = EXCLUDED.rule_type, expression = EXCLUDED.expression, severity = EXCLUDED.severity, messages = EXCLUDED.messages, country_codes = EXCLUDED.country_codes, seller_scopes = EXCLUDED.seller_scopes, enforcement = EXCLUDED.enforcement, status = EXCLUDED.status, updated_at = NOW();`,
    );
  }
  for (const category of source.categories) {
    for (const market of category.marketAvailability) {
      lines.push(
        `INSERT INTO public.taxonomy_market_availability (category_id, market_code, status, marketplace_enabled, indexable) VALUES (${sqlLiteral(category.id)}, ${sqlLiteral(market.marketCode)}, ${sqlLiteral(market.status)}, ${market.marketplaceEnabled}, ${market.indexable}) ON CONFLICT (category_id, market_code) DO UPDATE SET status = EXCLUDED.status, marketplace_enabled = EXCLUDED.marketplace_enabled, indexable = EXCLUDED.indexable, updated_at = NOW();`,
      );
    }
  }
  for (const rule of source.sellerRules) {
    lines.push(
      `INSERT INTO public.taxonomy_seller_rules (id, seller_type, capability, proposed_allowed, proposed_limit, proposed_verification, status) VALUES (${sqlLiteral(rule.id)}, ${sqlLiteral(rule.sellerType)}, ${sqlLiteral(rule.capability)}, ${sqlNullable(rule.proposedAllowed)}, ${sqlNullable(rule.proposedLimit)}, ${sqlNullable(rule.proposedVerification)}, ${sqlLiteral(rule.status)}) ON CONFLICT (id) DO UPDATE SET proposed_allowed = EXCLUDED.proposed_allowed, proposed_limit = EXCLUDED.proposed_limit, proposed_verification = EXCLUDED.proposed_verification, status = EXCLUDED.status, updated_at = NOW();`,
    );
  }
  for (const alias of source.aliases) {
    lines.push(
      `INSERT INTO public.taxonomy_aliases (alias, canonical_node_id, alias_kind, redirect_path) SELECT ${sqlLiteral(alias.alias)}, ${sqlLiteral(alias.canonicalCategoryId)}, ${sqlLiteral(alias.kind)}, '/categorie/' || slug FROM public.categories WHERE id = ${sqlLiteral(alias.canonicalCategoryId)} ON CONFLICT (alias) DO UPDATE SET canonical_node_id = EXCLUDED.canonical_node_id, alias_kind = EXCLUDED.alias_kind, redirect_path = EXCLUDED.redirect_path, status = 'active';`,
    );
  }

  lines.push(
    "",
    "-- Synchronize stale rows from earlier local taxonomy imports without deleting listing data.",
    `UPDATE public.categories SET is_active = FALSE, status = 'deprecated', updated_at = NOW() WHERE source_key IS NOT NULL AND id NOT IN (${sqlIdList(source.categories.map((row) => row.id))});`,
    `UPDATE public.taxonomy_listing_types SET status = 'disabled', updated_at = NOW() WHERE id NOT IN (${sqlIdList(source.listingTypes.map((row) => row.id))});`,
    `UPDATE public.taxonomy_options SET is_active = FALSE, updated_at = NOW() WHERE id NOT IN (${sqlIdList(source.options.map((row) => row.id))});`,
    `UPDATE public.taxonomy_attribute_bindings SET effective_until = COALESCE(effective_until, NOW()), updated_at = NOW() WHERE id NOT IN (${sqlIdList(source.bindings.map((row) => row.id))});`,
    "",
    "COMMIT;",
    "",
  );
  return lines.join("\n");
}

function buildImportReport(source: NormalizedSource) {
  return {
    taxonomyVersion: source.metadata.taxonomyVersion,
    compilerVersion: source.metadata.compilerVersion,
    workbookSha256: source.metadata.workbookSha256,
    normalizedSha256: source.metadata.normalizedSha256,
    sourceCounts: source.verification.sourceCounts,
    normalizedCounts: source.verification.normalizedCounts,
    templateResolution: source.verification.templateResolution,
    comparison: source.verification.comparison,
    advisorySheetCounts: source.verification.advisorySheetCounts,
    quarantine: source.quarantine,
    crosswalk: {
      workbookCategories: source.crosswalk.workbookCategories.length,
      v3Nodes: source.crosswalk.v3Nodes.length,
      previousV4Nodes: source.crosswalk.previousV4Nodes.length,
      dispositions: Object.fromEntries(
        [
          ...new Set(
            source.crosswalk.previousV4Nodes.map((row) => row.disposition),
          ),
        ]
          .sort()
          .map((disposition) => [
            disposition,
            source.crosswalk.previousV4Nodes.filter(
              (row) => row.disposition === disposition,
            ).length,
          ]),
      ),
    },
    migration: {
      productionRowsInspected: false,
      listingCountParity: "requires guarded production dry-run",
      savedSearchParity: "requires guarded production dry-run",
      unmappableAttributeValues: 0,
      policy:
        "Existing listings remain published; compatibility redirects require a guarded effective-dated migration before production activation.",
    },
  };
}

function buildPrivateBundleModule(privateBundle: unknown): string {
  const compressed = gzipSync(stableJson(privateBundle), { level: 9 }).toString(
    "base64",
  );
  return [
    "// Generated by backend/scripts/taxonomy/compile.ts. Do not edit.",
    'import { gunzipSync } from "node:zlib";',
    'import type { TaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy";',
    "",
    "export type TaxonomyV4PrivateBundle = Pick<TaxonomyV4PublicBundle,",
    '  | "categories" | "listingTypes" | "attributes" | "attributeGroups"',
    '  | "optionSets" | "options" | "optionParentLinks" | "bindings"',
    '  | "projections" | "aliases"',
    "> & {",
    '  metadata: Omit<TaxonomyV4PublicBundle["metadata"], "pagination">;',
    '  dependencies: Array<TaxonomyV4PublicBundle["dependencyRules"][number] & { effect: string }> ;',
    '  validationRules: Array<TaxonomyV4PublicBundle["validationRules"][number] & { expression: string; status: string }> ;',
    "  verticals: Array<Record<string, unknown>>;",
    "  countryPolicyDrafts: Array<Record<string, unknown>>;",
    "  sellerRules: Array<Record<string, unknown>>;",
    "  policies: Record<string, unknown>;",
    "  referenceData: Array<Record<string, unknown>>;",
    "  crosswalk: Record<string, unknown>;",
    "  resolver: { precedence: string[] };",
    "  quarantine: Record<string, unknown>;",
    "  verification: Record<string, unknown>;",
    "};",
    "",
    `const compressedBundle = ${JSON.stringify(compressed)};`,
    "",
    "export const TAXONOMY_V4_PRIVATE_BUNDLE = JSON.parse(",
    '  gunzipSync(Buffer.from(compressedBundle, "base64")).toString("utf8"),',
    ") as TaxonomyV4PrivateBundle;",
    "",
  ].join("\n");
}

function buildPublicBundleModule(publicBundle: unknown): string {
  const compressed = gzipSync(stableJson(publicBundle), { level: 9 }).toString(
    "base64",
  );
  return [
    "// Generated by backend/scripts/taxonomy/compile.ts. Do not edit.",
    'import { gunzipSync, strFromU8 } from "fflate";',
    'import type { TaxonomyV4PublicBundle } from "../../schemas/taxonomy";',
    "",
    `const compressedBundle = ${JSON.stringify(compressed)};`,
    'const base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";',
    "let cachedBundle: TaxonomyV4PublicBundle | undefined;",
    "",
    "function decodeBase64(value: string): Uint8Array {",
    '  const input = value.replace(/=+$/, "");',
    "  const output = new Uint8Array(Math.floor((input.length * 6) / 8));",
    "  let accumulator = 0;",
    "  let bits = 0;",
    "  let offset = 0;",
    "  for (const character of input) {",
    "    const digit = base64Alphabet.indexOf(character);",
    '    if (digit < 0) throw new Error("Invalid generated taxonomy bundle.");',
    "    accumulator = (accumulator << 6) | digit;",
    "    bits += 6;",
    "    if (bits >= 8) {",
    "      bits -= 8;",
    "      output[offset++] = (accumulator >> bits) & 0xff;",
    "    }",
    "  }",
    "  return output;",
    "}",
    "",
    "/** Lazily decodes the generated public/demo projection once per runtime. */",
    "export function getTaxonomyV4PublicBundle(): TaxonomyV4PublicBundle {",
    "  if (!cachedBundle) {",
    "    cachedBundle = JSON.parse(",
    "      strFromU8(gunzipSync(decodeBase64(compressedBundle))),",
    "    ) as TaxonomyV4PublicBundle;",
    "  }",
    "  return cachedBundle;",
    "}",
    "",
  ].join("\n");
}

async function writeOrCheck(filePath: string, content: string, check: boolean) {
  if (check) {
    const existing = await fs.readFile(filePath, "utf8").catch(() => "");
    assert(
      existing === content,
      `Generated taxonomy output drift: ${path.relative(REPOSITORY_ROOT, filePath)}.`,
    );
    return;
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

async function compileFromNormalizedSource(check: boolean) {
  const source = JSON.parse(
    await fs.readFile(NORMALIZED_SOURCE_PATH, "utf8"),
  ) as NormalizedSource;
  const expectedChecksum = sha256(
    stableJson({
      ...source,
      metadata: { ...source.metadata, normalizedSha256: undefined },
    }),
  );
  assert(
    source.metadata.normalizedSha256 === expectedChecksum,
    "Canonical normalized taxonomy checksum is invalid.",
  );
  const publicBundle = buildPublicBundle(source);
  const privateBundle = {
    ...source,
    resolver: {
      precedence: [
        "base_attribute",
        "publication_flow_template",
        "listing_type_add_exclude_override",
        "seller_policy",
        "market_effective_override",
        "regulatory_validation",
      ],
    },
  };
  await writeOrCheck(
    PRIVATE_BUNDLE_PATH,
    buildPrivateBundleModule(privateBundle),
    check,
  );
  await writeOrCheck(
    PUBLIC_BUNDLE_MODULE_PATH,
    buildPublicBundleModule(publicBundle),
    check,
  );
  await writeOrCheck(
    PUBLIC_BUNDLE_PATH,
    `${JSON.stringify(publicBundle)}\n`,
    check,
  );
  await writeOrCheck(SEED_PATH, generateSeedSql(source), check);
  await writeOrCheck(
    IMPORT_REPORT_PATH,
    stableJson(buildImportReport(source)),
    check,
  );
  console.log(
    `${check ? "Verified" : "Generated"} taxonomy v4 master: ${source.categories.length} taxonomy nodes, ${source.listingTypes.length} listing types, ${source.attributes.length} attributes, ${source.bindings.length} resolved bindings.`,
  );
}

async function importWorkbook(workbookPath: string) {
  const workbookBytes = await fs.readFile(workbookPath);
  const workbookChecksum = sha256(workbookBytes);
  const { core, advisoryCounts } = await readWorkbookSheets(workbookPath);
  const masterIds = new Set(masterNodeRows(core).map((node) => node.id));
  const crosswalk = await loadCrosswalk(masterIds);
  const source = normalizeWorkbook(
    core,
    advisoryCounts,
    crosswalk,
    workbookChecksum,
  );
  await fs.mkdir(path.dirname(NORMALIZED_SOURCE_PATH), { recursive: true });
  await fs.writeFile(NORMALIZED_SOURCE_PATH, stableJson(source));
  await compileFromNormalizedSource(false);
}

function parseArgs(argv: string[]) {
  const sourceIndex = argv.indexOf("--import-workbook");
  const scaffoldIndex = argv.indexOf("--scaffold-crosswalk");
  return {
    check: argv.includes("--check"),
    importWorkbook: sourceIndex >= 0 ? argv[sourceIndex + 1] : undefined,
    scaffoldCrosswalk: scaffoldIndex >= 0 ? argv[scaffoldIndex + 1] : undefined,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.scaffoldCrosswalk) {
    await scaffoldCrosswalk(path.resolve(args.scaffoldCrosswalk));
    return;
  }
  if (args.importWorkbook) {
    await importWorkbook(path.resolve(args.importWorkbook));
    return;
  }
  await compileFromNormalizedSource(args.check);
}
