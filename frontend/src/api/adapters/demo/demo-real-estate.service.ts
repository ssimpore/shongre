import type {
  PropertyAppointment,
  PropertyDraft,
  PropertyImport,
  PropertyFieldRule,
  PropertyLead,
  PropertyLeadExport,
  PropertyLeadNote,
  PropertyPrivate,
  PropertySearchQuery,
} from "@shongre/contracts/real-estate";
import {
  REAL_ESTATE_CONSTRAINTS,
  REAL_ESTATE_SCHEMA_VERSION,
} from "@shongre/contracts/real-estate";
import { applyMonetizationToRealEstateCatalog } from "@shongre/contracts/vertical-monetization-adapters";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import type { VerticalCheckout } from "@shongre/contracts/vertical";
import { simulateNetworkDelay } from "../../client/api-client.config";
import type {
  PropertyLeadDraft,
  PropertyPublicationDraftData,
  RealEstateServiceContract,
} from "../../contracts/real-estate.contract";
import { minutesToMilliseconds } from "../../../utilities/time";
import {
  IMMO_DEMO_ADMIN,
  IMMO_DEMO_APPOINTMENTS,
  IMMO_DEMO_CATALOG,
  IMMO_DEMO_DRAFT_DATA,
  IMMO_DEMO_IMPORTS,
  IMMO_DEMO_LEADS,
  IMMO_DEMO_LEAD_NOTES,
  IMMO_DEMO_NOW,
  IMMO_DEMO_PROPERTIES,
  IMMO_DEMO_WORKSPACE,
  toPublicProperty,
} from "../../../mocks/realEstateDemoData";
import { storageService } from "../../../services/storage.service";

const clone = <T>(value: T): T => structuredClone(value);
const propertyDraftKey = (draftId: string) =>
  `shongre_property_draft_v2:${draftId}`;
const activePropertyDraftKey = (ownerUserId: string) =>
  `shongre_property_active_draft_v2:${ownerUserId}`;

const createDemoPublicationData = (
  marketCode: string,
  sellerDisplayName?: string,
): PropertyPublicationDraftData => {
  const source = IMMO_DEMO_DRAFT_DATA;
  return {
    transactionType: source.transactionType,
    propertyType: source.propertyType,
    marketCodes: [marketCode],
    city: source.address.city,
    postalCode: source.address.postalCode,
    publicLabel: source.address.publicLabel,
    exactAddress: source.address.exactAddress || "",
    latitude: source.address.latitude,
    longitude: source.address.longitude,
    locationPrecision:
      source.address.precision === "exact"
        ? "street"
        : source.address.precision,
    livingAreaSquareMeters: source.characteristics.livingAreaSquareMeters,
    landAreaSquareMeters: source.characteristics.landAreaSquareMeters || 0,
    rooms: source.characteristics.rooms,
    bedrooms: source.characteristics.bedrooms,
    bathrooms: source.characteristics.bathrooms,
    amenities: [...source.characteristics.amenities],
    condition: source.characteristics.condition,
    isFurnished: Boolean(source.characteristics.isFurnished),
    priceMinor: source.financials.price.amountMinor,
    chargesMinor: source.regulatory?.annualCoOwnershipCharges?.amountMinor || 0,
    period: source.financials.period,
    feesPaidBy: source.financials.feesPaidBy || "seller",
    dpeClass: source.energy?.dpeClass || "",
    gesClass: source.energy?.gesClass || "",
    coOwnershipApplicable: source.regulatory?.coOwnershipApplicable || false,
    coOwnershipLots: source.regulatory?.coOwnershipLots || 0,
    ownershipDeclared: source.regulatory?.ownershipDeclared || false,
    title: source.title,
    description: source.description,
    mediaUrls: [...source.media.photos],
    privateDocumentKeys: [],
    sellerType: source.seller.type,
    sellerDisplayName: sellerDisplayName || source.seller.displayName,
    offerId: source.offerId,
    addOnIds: [],
  };
};

function matches(query: PropertySearchQuery, property: PropertyPrivate) {
  if (
    property.lifecycle !== "published" ||
    property.moderationStatus !== "approved" ||
    !property.marketCodes.includes(query.marketCode)
  )
    return false;
  if (
    query.transactionTypes?.length &&
    !query.transactionTypes.includes(property.transactionType)
  )
    return false;
  if (
    query.propertyTypes?.length &&
    !query.propertyTypes.includes(property.propertyType)
  )
    return false;
  const price = property.financials.price.amountMinor;
  if (query.minPriceMinor !== undefined && price < query.minPriceMinor)
    return false;
  if (query.maxPriceMinor !== undefined && price > query.maxPriceMinor)
    return false;
  const surface = property.characteristics.livingAreaSquareMeters;
  if (
    query.minSurfaceSquareMeters !== undefined &&
    surface < query.minSurfaceSquareMeters
  )
    return false;
  if (
    query.maxSurfaceSquareMeters !== undefined &&
    surface > query.maxSurfaceSquareMeters
  )
    return false;
  const pricePerSquareMeter =
    property.financials.pricePerSquareMeter?.amountMinor || 0;
  if (
    query.minPricePerSquareMeterMinor !== undefined &&
    pricePerSquareMeter < query.minPricePerSquareMeterMinor
  )
    return false;
  if (
    query.maxPricePerSquareMeterMinor !== undefined &&
    pricePerSquareMeter > query.maxPricePerSquareMeterMinor
  )
    return false;
  if (
    query.minRooms !== undefined &&
    property.characteristics.rooms < query.minRooms
  )
    return false;
  if (
    query.minBedrooms !== undefined &&
    property.characteristics.bedrooms < query.minBedrooms
  )
    return false;
  if (
    query.furnished !== undefined &&
    Boolean(property.characteristics.isFurnished) !== query.furnished
  )
    return false;
  if (
    query.dpeClasses?.length &&
    (!property.energy.dpeClass ||
      !query.dpeClasses.includes(property.energy.dpeClass))
  )
    return false;
  if (
    query.amenities?.length &&
    !query.amenities.every((amenity) =>
      property.characteristics.amenities.includes(amenity),
    )
  )
    return false;
  if (
    query.sellerTypes?.length &&
    !query.sellerTypes.includes(property.seller.type)
  )
    return false;
  if (
    query.city &&
    !`${property.address.city} ${property.address.publicLabel}`
      .toLocaleLowerCase("fr")
      .includes(query.city.toLocaleLowerCase("fr"))
  )
    return false;
  if (
    query.boundingBox &&
    (property.address.latitude > query.boundingBox.north ||
      property.address.latitude < query.boundingBox.south ||
      property.address.longitude > query.boundingBox.east ||
      property.address.longitude < query.boundingBox.west)
  )
    return false;
  if (query.center && query.radiusKm !== undefined) {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const latitudeDelta = toRadians(
      property.address.latitude - query.center.latitude,
    );
    const longitudeDelta = toRadians(
      property.address.longitude - query.center.longitude,
    );
    const a =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(toRadians(query.center.latitude)) *
        Math.cos(toRadians(property.address.latitude)) *
        Math.sin(longitudeDelta / 2) ** 2;
    const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (distanceKm > query.radiusKm) return false;
  }
  if (
    query.query &&
    !`${property.title} ${property.description} ${property.address.publicLabel}`
      .toLocaleLowerCase("fr")
      .includes(query.query.toLocaleLowerCase("fr"))
  )
    return false;
  return true;
}

export class DemoRealEstateService implements RealEstateServiceContract {
  private catalog = clone(IMMO_DEMO_CATALOG);
  private properties = new Map(
    IMMO_DEMO_PROPERTIES.map((property) => [property.id, clone(property)]),
  );
  private drafts = new Map<string, PropertyDraft>();
  private leads = new Map(
    IMMO_DEMO_LEADS.map((lead) => [lead.id, clone(lead)]),
  );
  private leadNotes = new Map(
    IMMO_DEMO_LEAD_NOTES.map((note) => [note.id, clone(note)]),
  );
  private appointments = new Map(
    IMMO_DEMO_APPOINTMENTS.map((visit) => [visit.id, clone(visit)]),
  );
  private imports = new Map(
    IMMO_DEMO_IMPORTS.map((job) => [job.id, clone(job)]),
  );
  private recentlyViewed = new Map<string, string[]>();
  private checkouts = new Map<string, VerticalCheckout>();
  private sequence = 1;

  async getCatalog(marketCode: string) {
    await simulateNetworkDelay();
    const commercialCatalog = applyMonetizationToRealEstateCatalog(
      this.catalog,
      BASELINE_MONETIZATION_CATALOG,
    );
    return clone({
      ...commercialCatalog,
      activation: {
        ...this.catalog.activation,
        marketCode: marketCode.toUpperCase(),
      },
      config: {
        ...this.catalog.config,
        marketCode: marketCode.toUpperCase(),
      },
      propertyTypes: commercialCatalog.propertyTypes.filter(
        (row) => row.isActive,
      ),
      attributes: commercialCatalog.attributes.filter((row) => row.isActive),
      fieldRules: commercialCatalog.fieldRules.filter((row) => row.isActive),
      offers: commercialCatalog.offers.filter((row) => row.isActive),
      addOns: commercialCatalog.addOns.filter((row) => row.isActive),
    });
  }

  async getAdminOverview(marketCode: string) {
    await simulateNetworkDelay();
    return clone({
      ...IMMO_DEMO_ADMIN,
      catalog: {
        ...applyMonetizationToRealEstateCatalog(
          this.catalog,
          BASELINE_MONETIZATION_CATALOG,
        ),
        activation: {
          ...this.catalog.activation,
          marketCode: marketCode.toUpperCase(),
        },
        config: {
          ...this.catalog.config,
          marketCode: marketCode.toUpperCase(),
        },
      },
    });
  }

  async searchProperties(query: PropertySearchQuery) {
    await simulateNetworkDelay();
    const rows = Array.from(this.properties.values()).filter((property) =>
      matches(query, property),
    );
    rows.sort((a, b) => {
      if (query.sort === "price_asc")
        return a.financials.price.amountMinor - b.financials.price.amountMinor;
      if (query.sort === "price_desc")
        return b.financials.price.amountMinor - a.financials.price.amountMinor;
      if (query.sort === "surface_desc")
        return (
          b.characteristics.livingAreaSquareMeters -
          a.characteristics.livingAreaSquareMeters
        );
      if (query.sort === "promoted") {
        const promoted = (property: PropertyPrivate) =>
          Number(property.promotion.featured) +
          Number(property.promotion.sponsored);
        const promotionOrder = promoted(b) - promoted(a);
        if (promotionOrder) return promotionOrder;
      }
      return b.sortDate.localeCompare(a.sortDate);
    });
    const offset = Number(query.cursor || 0);
    const limit = Math.min(50, query.limit || 20);
    return {
      items: rows
        .slice(offset, offset + limit)
        .map(toPublicProperty)
        .map(clone),
      total: rows.length,
      pageInfo: {
        hasNextPage: offset + limit < rows.length,
        nextCursor:
          offset + limit < rows.length ? String(offset + limit) : undefined,
      },
    };
  }

  async getProperty(idOrSlug: string) {
    await simulateNetworkDelay();
    const property =
      this.properties.get(idOrSlug) ||
      Array.from(this.properties.values()).find((row) => row.slug === idOrSlug);
    if (!property) throw new Error("Bien immobilier introuvable.");
    return clone(toPublicProperty(property));
  }

  async getComparableProperties(propertyId: string) {
    await simulateNetworkDelay();
    const property = this.properties.get(propertyId);
    if (!property) return [];
    return Array.from(this.properties.values())
      .filter(
        (candidate) =>
          candidate.id !== property.id &&
          candidate.propertyType === property.propertyType &&
          candidate.transactionType === property.transactionType,
      )
      .slice(0, 3)
      .map(toPublicProperty)
      .map(clone);
  }

  async getRecentlyViewed(accountId: string) {
    await simulateNetworkDelay();
    return (this.recentlyViewed.get(accountId) || [])
      .map((id) => this.properties.get(id))
      .filter((property): property is PropertyPrivate => Boolean(property))
      .map(toPublicProperty)
      .map(clone);
  }

  async markRecentlyViewed(accountId: string, propertyId: string) {
    await simulateNetworkDelay();
    const next = [
      propertyId,
      ...(this.recentlyViewed.get(accountId) || []).filter(
        (id) => id !== propertyId,
      ),
    ].slice(0, 20);
    this.recentlyViewed.set(accountId, next);
  }

  async getOrCreateDraft(
    ownerUserId: string,
    marketCode: string,
    sellerDisplayName?: string,
  ) {
    await simulateNetworkDelay();
    const activeId = storageService.get(
      activePropertyDraftKey(ownerUserId),
      `demo-property-draft-${ownerUserId}`,
    );
    const existing =
      this.drafts.get(activeId) ||
      storageService.get<PropertyDraft | null>(
        propertyDraftKey(activeId),
        null,
      );
    const draft: PropertyDraft = existing || {
      id: activeId,
      ownerUserId,
      schemaVersion: REAL_ESTATE_SCHEMA_VERSION,
      marketCode,
      currentStep: REAL_ESTATE_CONSTRAINTS.publication.firstStep,
      completedSteps: [],
      data: createDemoPublicationData(marketCode, sellerDisplayName),
      validationIssues: [],
      updatedAt: IMMO_DEMO_NOW,
    };
    return this.saveDraft({ ...draft, ownerUserId, marketCode });
  }

  async getDraft(draftId: string) {
    await simulateNetworkDelay();
    const draft =
      this.drafts.get(draftId) ||
      storageService.get<PropertyDraft | null>(propertyDraftKey(draftId), null);
    if (draft) return clone(draft);
    const seeded: PropertyDraft = {
      id: draftId,
      ownerUserId: "owner_marie",
      schemaVersion: REAL_ESTATE_SCHEMA_VERSION,
      marketCode: "FR",
      currentStep: REAL_ESTATE_CONSTRAINTS.publication.firstStep,
      completedSteps: [],
      data: clone(IMMO_DEMO_DRAFT_DATA),
      validationIssues: [],
      updatedAt: IMMO_DEMO_NOW,
    };
    this.drafts.set(draftId, seeded);
    storageService.set(propertyDraftKey(draftId), seeded);
    return clone(seeded);
  }

  async saveDraft(draft: PropertyDraft) {
    await simulateNetworkDelay();
    const next = clone({ ...draft, updatedAt: IMMO_DEMO_NOW });
    this.drafts.set(next.id, next);
    storageService.set(propertyDraftKey(next.id), next);
    storageService.set(activePropertyDraftKey(next.ownerUserId), next.id);
    return clone(next);
  }

  async submitDraft(draftId: string) {
    await simulateNetworkDelay();
    const draft = this.drafts.get(draftId);
    if (
      !draft ||
      draft.completedSteps.length <
        REAL_ESTATE_CONSTRAINTS.publication.requiredCompletedSteps
    )
      throw new Error("Complétez les étapes obligatoires avant l’envoi.");
    const offerId = String(draft.data.offerId || "immo_owner_free");
    const offer = this.catalog.offers.find((row) => row.id === offerId);
    if (!offer || !offer.isActive)
      throw new Error("Cette offre n’est plus disponible.");
    const maxActive = Number(offer.entitlements.maxActiveListings || 0);
    const currentActive = Array.from(this.properties.values()).filter(
      (property) =>
        property.ownerUserId === draft.ownerUserId &&
        ["pending_review", "published", "reserved"].includes(
          property.lifecycle,
        ),
    ).length;
    if (currentActive >= maxActive)
      throw new Error("Le quota de biens actifs de cette offre est atteint.");
    const result = {
      propertyId: `property_draft_${this.sequence++}`,
      lifecycle: "pending_review" as const,
    };
    this.drafts.delete(draftId);
    storageService.remove(propertyDraftKey(draftId));
    storageService.remove(activePropertyDraftKey(draft.ownerUserId));
    return result;
  }

  async uploadDraftMedia(
    draftId: string,
    file: { name: string; type: string; size: number },
    visibility: "public" | "private",
  ) {
    await simulateNetworkDelay();
    if (!file.type.startsWith("image/") && file.type !== "application/pdf")
      throw new Error("Format de fichier non pris en charge.");
    if (file.size > REAL_ESTATE_CONSTRAINTS.media.maxFileSizeBytes)
      throw new Error(
        `Le fichier dépasse la limite configurée de ${REAL_ESTATE_CONSTRAINTS.media.maxFileSizeMegabytes} Mo.`,
      );
    const safeName = file.name.replaceAll(/[^a-zA-Z0-9._-]/g, "-");
    if (visibility === "private")
      return {
        privateStorageKey: `documents-private/immo/${draftId}/${safeName}`,
      };
    return {
      url: new URL(
        `/images/immo/${safeName}`,
        window.location.origin,
      ).toString(),
    };
  }

  async submitLead(input: PropertyLeadDraft) {
    await simulateNetworkDelay();
    if (!input.consentGiven)
      throw new Error(
        "Votre accord est nécessaire pour transmettre la demande.",
      );
    const duplicate = Array.from(this.leads.values()).find(
      (lead) =>
        lead.propertyId === input.propertyId &&
        lead.requesterEmail.toLowerCase() ===
          input.requesterEmail.toLowerCase() &&
        lead.type === input.type,
    );
    if (duplicate) return clone(duplicate);
    const property = this.properties.get(input.propertyId);
    if (!property) throw new Error("Bien immobilier introuvable.");
    const lead: PropertyLead = {
      id: `lead_demo_${this.sequence++}`,
      organizationId: property.organizationId,
      requesterUserId: "guest",
      status: "new",
      contactDetailsReleased: false,
      createdAt: IMMO_DEMO_NOW,
      updatedAt: IMMO_DEMO_NOW,
      ...clone(input),
    };
    this.leads.set(lead.id, lead);
    return clone(lead);
  }

  async requestAppointment(leadId: string, startsAt: string) {
    await simulateNetworkDelay();
    const lead = this.leads.get(leadId);
    if (!lead) throw new Error("Demande introuvable.");
    const start = new Date(startsAt);
    const visit: PropertyAppointment = {
      id: `visit_demo_${this.sequence++}`,
      propertyId: lead.propertyId,
      leadId,
      organizationId: lead.organizationId,
      assignedUserId: lead.assignedUserId,
      startsAt: start.toISOString(),
      endsAt: new Date(
        start.getTime() +
          minutesToMilliseconds(
            REAL_ESTATE_CONSTRAINTS.appointment.durationMinutes,
          ),
      ).toISOString(),
      status: "requested",
    };
    this.appointments.set(visit.id, visit);
    return clone(visit);
  }

  async getAgencyWorkspace(organizationId: string) {
    await simulateNetworkDelay();
    if (organizationId !== IMMO_DEMO_WORKSPACE.organization.id)
      throw new Error("Espace agence introuvable.");
    return clone({
      ...IMMO_DEMO_WORKSPACE,
      properties: Array.from(this.properties.values()).filter(
        (property) => property.organizationId === organizationId,
      ),
      leads: Array.from(this.leads.values()).filter(
        (lead) => lead.organizationId === organizationId,
      ),
      leadNotes: Array.from(this.leadNotes.values()).filter(
        (note) =>
          this.leads.get(note.leadId)?.organizationId === organizationId,
      ),
      appointments: Array.from(this.appointments.values()).filter(
        (visit) => visit.organizationId === organizationId,
      ),
      imports: Array.from(this.imports.values()).filter(
        (job) => job.organizationId === organizationId,
      ),
    });
  }

  async updateLead(
    organizationId: string,
    leadId: string,
    patch: Partial<
      Pick<PropertyLead, "status" | "assignedUserId" | "nextReminderAt">
    >,
  ) {
    await simulateNetworkDelay();
    const lead = this.leads.get(leadId);
    if (!lead || lead.organizationId !== organizationId)
      throw new Error("Demande introuvable.");
    const next = { ...lead, ...clone(patch), updatedAt: IMMO_DEMO_NOW };
    this.leads.set(next.id, next);
    return clone(next);
  }

  async addLeadNote(organizationId: string, leadId: string, body: string) {
    await simulateNetworkDelay();
    const lead = this.leads.get(leadId);
    if (!lead || lead.organizationId !== organizationId)
      throw new Error("Demande introuvable.");
    const note: PropertyLeadNote = {
      id: `lead_note_demo_${this.sequence++}`,
      leadId,
      authorUserId: "member_clara",
      body: body.trim(),
      createdAt: IMMO_DEMO_NOW,
    };
    if (!note.body) throw new Error("La note ne peut pas être vide.");
    this.leadNotes.set(note.id, note);
    return clone(note);
  }

  async exportAgencyLeads(organizationId: string): Promise<PropertyLeadExport> {
    await simulateNetworkDelay();
    const rows = Array.from(this.leads.values()).filter(
      (lead) => lead.organizationId === organizationId,
    );
    const cell = (value: string) =>
      `"${(/^[=+\-@]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
    return {
      fileName: `leads-${organizationId}.csv`,
      mimeType: "text/csv;charset=utf-8",
      content: [
        ["id", "statut", "type", "nom", "email", "téléphone", "créé le"],
        ...rows.map((lead) => [
          lead.id,
          lead.status,
          lead.type,
          lead.requesterName,
          lead.contactDetailsReleased ? lead.requesterEmail : "",
          lead.contactDetailsReleased ? lead.requesterPhone || "" : "",
          lead.createdAt,
        ]),
      ]
        .map((row) => row.map((value) => cell(String(value))).join(","))
        .join("\n"),
    };
  }

  async requestPropertyImport(
    organizationId: string,
    type: PropertyImport["type"],
    fileName?: string,
    idempotencyKey = `immo-import-${this.sequence}`,
  ) {
    await simulateNetworkDelay();
    const existing = Array.from(this.imports.values()).find(
      (job) =>
        job.organizationId === organizationId &&
        job.idempotencyKey === idempotencyKey,
    );
    if (existing) return clone(existing);
    const job: PropertyImport = {
      id: `import_demo_${this.sequence++}`,
      organizationId,
      type,
      status: "queued",
      fileName,
      importedCount: 0,
      rejectedCount: 0,
      idempotencyKey,
      createdAt: IMMO_DEMO_NOW,
    };
    this.imports.set(job.id, job);
    return clone(job);
  }

  async createCheckout(input: {
    accountId: string;
    marketCode: string;
    offerId?: string;
    addOnIds?: string[];
    idempotencyKey: string;
    scenario?: "success" | "pending" | "failed" | "requires_action";
  }) {
    await simulateNetworkDelay();
    const existing = this.checkouts.get(input.idempotencyKey);
    if (existing) return clone(existing);
    const catalog = await this.getCatalog(input.marketCode);
    const offer = catalog.offers.find(
      (row) => row.id === input.offerId && row.isActive,
    );
    const addOns = catalog.addOns.filter(
      (row) => input.addOnIds?.includes(row.id) && row.isActive,
    );
    if (input.offerId && !offer) throw new Error("Offre indisponible.");
    const subtotal =
      (offer?.prices.find((price) => price.isActive)?.amount.amountMinor || 0) +
      addOns.reduce((sum, addOn) => sum + addOn.price.amountMinor, 0);
    const taxRate =
      offer?.prices.find((price) => price.isActive)?.taxRateBps ||
      addOns[0]?.taxRateBps ||
      0;
    const taxMinor = Math.round((subtotal * taxRate) / (10_000 + taxRate));
    const statusByScenario = {
      success: "paid",
      pending: "pending",
      failed: "failed",
      requires_action: "requires_action",
    } as const;
    const checkout: VerticalCheckout = {
      id: `checkout_demo_${this.sequence++}`,
      verticalType: "real_estate",
      marketCode: input.marketCode.toUpperCase(),
      accountId: input.accountId,
      offerId: input.offerId,
      addOnIds: input.addOnIds || [],
      total: { amountMinor: subtotal, currency: "EUR" },
      tax: { amountMinor: taxMinor, currency: "EUR" },
      status: statusByScenario[input.scenario || "success"],
      provider: "demo",
      invoiceId:
        (input.scenario || "success") === "success"
          ? `invoice_demo_${this.sequence}`
          : undefined,
      idempotencyKey: input.idempotencyKey,
      createdAt: IMMO_DEMO_NOW,
      updatedAt: IMMO_DEMO_NOW,
    };
    this.checkouts.set(input.idempotencyKey, checkout);
    return clone(checkout);
  }

  async refundCheckout(
    checkoutId: string,
    input: { amountMinor?: number; idempotencyKey: string },
  ) {
    await simulateNetworkDelay();
    const checkout = Array.from(this.checkouts.values()).find(
      (candidate) => candidate.id === checkoutId,
    );
    if (!checkout) throw new Error("Paiement introuvable.");
    if (checkout.status === "refunded") return clone(checkout);
    if (checkout.status !== "paid")
      throw new Error("Ce paiement ne peut pas être remboursé.");
    const amountMinor = input.amountMinor ?? checkout.total.amountMinor;
    if (amountMinor !== checkout.total.amountMinor)
      throw new Error("Montant de remboursement invalide.");
    const refunded = { ...checkout, status: "refunded" as const };
    this.checkouts.set(checkout.idempotencyKey, refunded);
    return clone(refunded);
  }

  async updateMarketConfig(
    marketCode: string,
    patch: Partial<(typeof this.catalog)["config"]>,
  ) {
    await simulateNetworkDelay();
    if (marketCode.toUpperCase() !== this.catalog.config.marketCode)
      throw new Error("Marché Immo introuvable.");
    this.catalog.config = { ...this.catalog.config, ...clone(patch) };
    this.catalog.activation.isActive = this.catalog.config.isEnabled;
    return clone(this.catalog.config);
  }

  async updateOffer(
    marketCode: string,
    offerId: string,
    patch: Partial<(typeof this.catalog.offers)[number]>,
  ) {
    await simulateNetworkDelay();
    const index = this.catalog.offers.findIndex(
      (offer) =>
        offer.id === offerId && offer.marketCode === marketCode.toUpperCase(),
    );
    if (index < 0) throw new Error("Offre Immo introuvable.");
    this.catalog.offers[index] = {
      ...this.catalog.offers[index],
      ...clone(patch),
    };
    return clone(this.catalog.offers[index]);
  }

  async updateAddOn(
    marketCode: string,
    addOnId: string,
    patch: Partial<(typeof this.catalog.addOns)[number]>,
  ) {
    await simulateNetworkDelay();
    const index = this.catalog.addOns.findIndex(
      (addOn) =>
        addOn.id === addOnId && addOn.marketCode === marketCode.toUpperCase(),
    );
    if (index < 0) throw new Error("Option Immo introuvable.");
    this.catalog.addOns[index] = {
      ...this.catalog.addOns[index],
      ...clone(patch),
    };
    return clone(this.catalog.addOns[index]);
  }

  async updatePropertyType(
    marketCode: string,
    type: string,
    patch: Partial<(typeof this.catalog.propertyTypes)[number]>,
  ) {
    await simulateNetworkDelay();
    const index = this.catalog.propertyTypes.findIndex(
      (propertyType) =>
        propertyType.type === type &&
        propertyType.marketCode === marketCode.toUpperCase(),
    );
    if (index < 0) throw new Error("Type de bien introuvable.");
    this.catalog.propertyTypes[index] = {
      ...this.catalog.propertyTypes[index],
      ...clone(patch),
    };
    return clone(this.catalog.propertyTypes[index]);
  }
  async updateFieldRule(
    marketCode: string,
    ruleId: string,
    patch: Partial<PropertyFieldRule>,
  ) {
    await simulateNetworkDelay();
    const index = this.catalog.fieldRules.findIndex(
      (row) => row.id === ruleId && row.marketCode === marketCode.toUpperCase(),
    );
    if (index < 0) throw new Error("Règle de champ introuvable.");
    this.catalog.fieldRules[index] = {
      ...this.catalog.fieldRules[index],
      ...clone(patch),
    };
    return clone(this.catalog.fieldRules[index]);
  }
}

export const demoRealEstateService = new DemoRealEstateService();
