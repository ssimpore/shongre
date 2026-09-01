import { afterEach, describe, expect, it } from "vitest";
import { EMPLOYMENT_DEMO_JOBS } from "@shongre/contracts/employment-demo";
import { listingRepository } from "../../repositories/listing.repository";
import { AUTO_DEMO_PRIVATE_VEHICLES } from "../../mocks/autoDemoData";
import { DEMO_COURSE_OFFERS, DEMO_TUTORS } from "../../mocks/coursesDemoData";
import { IMMO_DEMO_PROPERTIES } from "../../mocks/realEstateDemoData";
import { demoVerticalDiscoveryStore } from "./demo-vertical-discovery.store";
import { projectEmploymentJob } from "./vertical-discovery.projection";
import { formatListingPricePresentation } from "../listing/listing-price.presentation";

afterEach(() => demoVerticalDiscoveryStore.reset());

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
