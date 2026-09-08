import { describe, expect, it } from "vitest";
import type { PropertyDraft } from "@shongre/contracts/real-estate";
import {
  propertyDraftToForm,
  propertyDraftToTransport,
} from "./property-draft.mapping";

const draft: PropertyDraft = {
  id: "draft",
  ownerUserId: "owner",
  marketCode: "FR",
  schemaVersion: 1,
  currentStep: 3,
  completedSteps: [1, 2],
  validationIssues: [],
  updatedAt: "2026-09-08T10:00:00Z",
  data: {
    propertyType: "apartment",
    transactionType: "sale",
    address: {
      city: "Lyon",
      exactAddress: "Private address",
      countryCode: "FR",
      precision: "district",
    },
    characteristics: {
      rooms: 4,
      amenities: ["accessible"],
      floor: 2,
      condition: "good",
    },
    financials: {
      price: { amountMinor: 30000000, currency: "EUR" },
      period: "total",
      agencyFees: { amountMinor: 500000, currency: "EUR" },
    },
    energy: { dpeClass: "C", diagnosticDate: "2025-01-03" },
    regulatory: {
      coOwnershipProcedureStatus: "none",
      riskInformationStatus: "available",
    },
    media: {
      photos: ["https://example.com/public.jpg"],
      floorPlans: ["https://example.com/plan.jpg"],
    },
    documents: [
      {
        id: "doc",
        type: "dpe",
        status: "uploaded",
        privateStorageKey: "private/key",
      },
    ],
    customAttributes: { retained: "stored" },
  },
};

describe("property draft transport mapping", () => {
  it("restores and edits nested published values without dropping other stored data", () => {
    const form = propertyDraftToForm(draft);
    expect(form.data).toMatchObject({
      city: "Lyon",
      exactAddress: "Private address",
      amenities: ["accessible"],
      rooms: 4,
      dpeClass: "C",
      priceMinor: 30000000,
      currency: "EUR",
    });
    const wire = propertyDraftToTransport({
      ...form,
      data: { ...form.data, rooms: 5, city: "Villeurbanne" },
    });
    expect(wire.data).toMatchObject({
      address: {
        city: "Villeurbanne",
        exactAddress: "Private address",
        precision: "district",
      },
      characteristics: { rooms: 5, amenities: ["accessible"], floor: 2 },
      financials: {
        price: { amountMinor: 30000000, currency: "EUR" },
        agencyFees: { amountMinor: 500000, currency: "EUR" },
      },
      energy: { dpeClass: "C", diagnosticDate: "2025-01-03" },
      regulatory: {
        coOwnershipProcedureStatus: "none",
        riskInformationStatus: "available",
      },
      media: { floorPlans: ["https://example.com/plan.jpg"] },
      documents: draft.data.documents,
      customAttributes: { retained: "stored" },
    });
    for (const key of [
      "city",
      "exactAddress",
      "rooms",
      "priceMinor",
      "currency",
      "mediaUrls",
      "dpeClass",
    ])
      expect(wire.data).not.toHaveProperty(key);
    expect(propertyDraftToForm(wire).data).toMatchObject({
      rooms: 5,
      city: "Villeurbanne",
    });
    expect(draft.data.address).toMatchObject({ city: "Lyon" });
  });
  it("removes cleared optional energy values and keeps documents private in the API payload", () => {
    const form = propertyDraftToForm(draft);
    const wire = propertyDraftToTransport({
      ...form,
      data: { ...form.data, dpeClass: "", gesClass: "" },
    });
    expect(wire.data.energy).not.toHaveProperty("dpeClass");
    expect(wire.data.documents).toEqual(draft.data.documents);
    expect(wire.data.media).not.toHaveProperty("privateStorageKey");
  });
});
