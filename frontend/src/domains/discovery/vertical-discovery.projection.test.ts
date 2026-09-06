import { afterEach, describe, expect, it, vi } from "vitest";
import { EMPLOYMENT_DEMO_JOBS } from "@shongre/contracts/employment-demo";
import { listingRepository } from "../../repositories/listing.repository";
import { AUTO_DEMO_PRIVATE_VEHICLES } from "../../mocks/autoDemoData";
import { DEMO_COURSE_OFFERS, DEMO_TUTORS } from "../../mocks/coursesDemoData";
import { IMMO_DEMO_PROPERTIES } from "../../mocks/realEstateDemoData";
import { demoVerticalDiscoveryStore } from "./demo-vertical-discovery.store";
import {
  projectAutoVehicle,
  projectEmploymentJob,
  projectRealEstateProperty,
} from "./vertical-discovery.projection";
import { formatListingPricePresentation } from "../listing/listing-price.presentation";

afterEach(() => {
  vi.restoreAllMocks();
  demoVerticalDiscoveryStore.reset();
});

describe("canonical vertical discovery projection", () => {
  it("projects every vertical into one listing inventory with canonical routes", () => {
    demoVerticalDiscoveryStore.reset();
    const listings = demoVerticalDiscoveryStore.getListings();
    const verticals = new Set(
      listings.map((listing) => listing.attributes.verticalType),
    );

    expect(verticals).toEqual(
      new Set(["automotive", "employment", "real_estate", "tutoring"]),
    );
    expect(
      listings.find((listing) =>
        listing.title.includes("Peugeot 3008 BlueHDi"),
      ),
    ).toMatchObject({
      sellerType: "pro",
      publisherType: "professional",
      sellerRating: AUTO_DEMO_PRIVATE_VEHICLES.find((vehicle) =>
        vehicle.title.includes("Peugeot 3008 BlueHDi"),
      )?.seller.rating,
      sellerReviewCount: AUTO_DEMO_PRIVATE_VEHICLES.find((vehicle) =>
        vehicle.title.includes("Peugeot 3008 BlueHDi"),
      )?.seller.reviewCount,
      attributes: {
        canonicalPath: "/auto/vehicule/peugeot-3008-bluehdi-130-allure-2019",
        brand: "peugeot",
        fuel_type: "diesel",
        transmission: "manual",
      },
    });
    expect(
      listings.find((listing) => listing.title.includes("front-end React")),
    ).toMatchObject({
      categorySlug: "emploi",
      sellerId: "user_employment_clara",
      sellerName: "TechNova",
      sellerRating: 4.8,
      sellerReviewCount: 37,
      publisherUserId: "user_employment_clara",
      attributes: {
        canonicalPath: `/emploi/offre/${EMPLOYMENT_DEMO_JOBS[0].slug}`,
        contract_type: "permanent",
        job_sector: "it_data",
        remote_work: "hybrid",
      },
    });
    expect(
      listings.find((listing) => listing.sellerName === "Sophie Martin"),
    ).toMatchObject({
      sellerType: "pro",
      attributes: {
        canonicalPath: "/education/professeur/sophie-martin-lyon",
        subject: "Mathématiques",
        billing_mode: "hourly",
        location_mode: "flexible",
      },
    });
    expect(
      listings.find((listing) => listing.title.includes("Jean Macé")),
    ).toMatchObject({
      categorySlug: "immobilier",
      sellerRating: IMMO_DEMO_PROPERTIES.find((property) =>
        property.title.includes("Jean Macé"),
      )?.seller.rating,
      sellerReviewCount: IMMO_DEMO_PROPERTIES.find((property) =>
        property.title.includes("Jean Macé"),
      )?.seller.reviewCount,
      sellerResponseTimeLabel: IMMO_DEMO_PROPERTIES.find((property) =>
        property.title.includes("Jean Macé"),
      )?.seller.responseTimeLabel,
      attributes: {
        canonicalPath: "/immo/bien/appartement-meuble-lyon-jean-mace",
        property_type: "apartment",
        furnished: true,
        heating_type: "collective",
      },
    });
  });

  it("updates visibility on lifecycle changes and removes deleted entities", async () => {
    const vehicle = structuredClone(AUTO_DEMO_PRIVATE_VEHICLES[0]);
    const listingId = `listing_auto_${vehicle.id}`;

    vehicle.lifecycle = "suspended";
    expect(demoVerticalDiscoveryStore.syncAutoVehicle(vehicle).status).toBe(
      "archived",
    );
    expect(
      (await listingRepository.getListings({ limit: 500 })).listings.some(
        (listing) => listing.id === listingId,
      ),
    ).toBe(false);

    vehicle.lifecycle = "published";
    vehicle.moderationStatus = "approved";
    expect(demoVerticalDiscoveryStore.syncAutoVehicle(vehicle).status).toBe(
      "active",
    );
    expect(
      (await listingRepository.getListings({ limit: 500 })).listings.some(
        (listing) => listing.id === listingId,
      ),
    ).toBe(true);

    expect(demoVerticalDiscoveryStore.remove("automotive", vehicle.id)).toBe(
      true,
    );
    expect(demoVerticalDiscoveryStore.getListing(listingId)).toBeUndefined();
  });

  it("upserts updates without creating duplicate candidates", () => {
    const job = structuredClone(EMPLOYMENT_DEMO_JOBS[0]);
    const before = demoVerticalDiscoveryStore.getListings().length;
    job.title = "Développeur·se React confirmé·e";
    const updated = demoVerticalDiscoveryStore.syncEmploymentJob(job);

    expect(updated.title).toBe("Développeur·se React confirmé·e");
    expect(demoVerticalDiscoveryStore.getListings()).toHaveLength(before);
  });

  it("preserves public salary ranges, periods and undisclosed remuneration", () => {
    const hourlyJob = structuredClone(
      EMPLOYMENT_DEMO_JOBS.find((job) =>
        job.salary?.frequencyId.endsWith(".hour"),
      )!,
    );
    const hourlyListing = projectEmploymentJob(hourlyJob);
    const hourlyLabel = formatListingPricePresentation(
      hourlyListing.pricePresentation,
      "fr-FR",
    );

    expect(hourlyLabel?.replace(/\s/gu, " ")).toContain("12,50 €");
    expect(hourlyLabel).toContain("/ h");

    hourlyJob.salary = hourlyJob.salary
      ? { ...hourlyJob.salary, isPublic: false }
      : undefined;
    const undisclosedListing = projectEmploymentJob(hourlyJob);
    expect(
      formatListingPricePresentation(
        undisclosedListing.pricePresentation,
        "fr-FR",
      ),
    ).toBe("Rémunération non communiquée");
  });

  it("formats zero-decimal market currencies from minor units", () => {
    const vehicle = structuredClone(AUTO_DEMO_PRIVATE_VEHICLES[0]);
    vehicle.price = { amountMinor: 12_500, currency: "XOF" };

    expect(projectAutoVehicle(vehicle).price).toBe(12_500);
    expect(
      formatListingPricePresentation(
        {
          kind: "service_rate",
          visibility: "public",
          minimumAmountMinor: 12_500,
          maximumAmountMinor: 12_500,
          currency: "XOF",
          period: "day",
        },
        "fr-SN",
      )?.replace(/\s/gu, " "),
    ).toContain("12 500 F CFA / jour");
  });

  it("localizes request prices and recurring periods", () => {
    expect(
      formatListingPricePresentation(
        {
          kind: "price",
          visibility: "undisclosed",
          currency: "EUR",
          period: "total",
        },
        "nl-BE",
      ),
    ).toBe("Prijs op aanvraag");

    expect(
      formatListingPricePresentation(
        {
          kind: "service_rate",
          visibility: "public",
          minimumAmountMinor: 12_500,
          maximumAmountMinor: 12_500,
          currency: "EUR",
          period: "month",
        },
        "de-CH",
      ),
    ).toContain("/ Monat");
  });

  it("keeps missing vertical media absent for the neutral card fallback", () => {
    const vehicle = structuredClone(AUTO_DEMO_PRIVATE_VEHICLES[0]);
    vehicle.mediaUrls = [];

    expect(projectAutoVehicle(vehicle)).toMatchObject({
      photos: [],
      coverImageUrl: "",
    });

    const job = structuredClone(EMPLOYMENT_DEMO_JOBS[0]);
    job.employer.logoUrl = undefined;

    expect(projectEmploymentJob(job)).toMatchObject({
      photos: [],
      coverImageUrl: "",
    });
  });

  it("carries only a scheduled promotion resolved for the listing market", () => {
    vi.spyOn(Date, "now").mockReturnValue(
      Date.parse("2026-09-06T12:00:00.000Z"),
    );
    const vehicle = structuredClone(AUTO_DEMO_PRIVATE_VEHICLES[0]);
    const active = projectAutoVehicle(vehicle);

    expect(active).toMatchObject({
      isBoosted: true,
      promotionState: "active",
      promotionType: "sponsored_search",
      promotionStartAt: "2026-08-12T08:00:00.000Z",
      promotionEndAt: "2026-10-12T08:00:00.000Z",
    });

    vehicle.resolvedPromotion = vehicle.resolvedPromotion
      ? { ...vehicle.resolvedPromotion, marketCode: "BE" }
      : undefined;
    expect(projectAutoVehicle(vehicle).promotionType).toBeUndefined();
    expect(projectAutoVehicle(vehicle).isBoosted).toBeUndefined();

    vehicle.resolvedPromotion = vehicle.resolvedPromotion
      ? {
          ...vehicle.resolvedPromotion,
          marketCode: "FR",
          endsAt: "2026-09-01T00:00:00.000Z",
        }
      : undefined;
    expect(projectAutoVehicle(vehicle).promotionState).toBeUndefined();
  });

  it("requires the caller's exact market for multi-market projections", () => {
    vi.spyOn(Date, "now").mockReturnValue(
      Date.parse("2026-09-06T12:00:00.000Z"),
    );
    const vehicle = structuredClone(AUTO_DEMO_PRIVATE_VEHICLES[0]);
    vehicle.marketCodes = ["FR", "BE"];
    vehicle.resolvedPromotion = vehicle.resolvedPromotion
      ? { ...vehicle.resolvedPromotion, marketCode: "BE" }
      : undefined;

    expect(() => projectAutoVehicle(vehicle)).toThrow(
      "requires an explicit market",
    );
    expect(projectAutoVehicle(vehicle, "FR").promotionType).toBeUndefined();
    expect(projectAutoVehicle(vehicle, "BE")).toMatchObject({
      marketCode: "BE",
      promotionType: "sponsored_search",
      promotionSource: "subscription_credit",
      promotionSourceId: "demo:auto:vehicle_3008_diesel:sponsored",
    });

    const property = structuredClone(IMMO_DEMO_PROPERTIES[0]);
    property.marketCodes = ["FR", "CH"];
    expect(() => projectRealEstateProperty(property)).toThrow(
      "requires an explicit market",
    );
    expect(projectRealEstateProperty(property, "CH").marketCode).toBe("CH");
    expect(() => projectRealEstateProperty(property, "BE")).toThrow(
      "is not published in market BE",
    );
  });

  it("normalizes inactive Course and Immo states out of public discovery", () => {
    const tutor = structuredClone(DEMO_TUTORS[0]);
    const offer = structuredClone(DEMO_COURSE_OFFERS[0]);
    offer.status = "suspended";
    expect(
      demoVerticalDiscoveryStore.syncCourseOffer(tutor, offer).status,
    ).toBe("archived");

    const property = structuredClone(IMMO_DEMO_PROPERTIES[0]);
    property.lifecycle = "removed";
    expect(
      demoVerticalDiscoveryStore.syncRealEstateProperty(property).status,
    ).toBe("archived");
  });
});
