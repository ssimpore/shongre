import { afterEach, describe, expect, it } from "vitest";
import { EMPLOYMENT_DEMO_JOBS } from "@shongre/contracts/employment-demo";
import { listingRepository } from "../../repositories/listing.repository";
import { AUTO_DEMO_PRIVATE_VEHICLES } from "../../mocks/autoDemoData";
import { DEMO_COURSE_OFFERS, DEMO_TUTORS } from "../../mocks/coursesDemoData";
import { IMMO_DEMO_PROPERTIES } from "../../mocks/realEstateDemoData";
import { demoVerticalDiscoveryStore } from "./demo-vertical-discovery.store";

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
        vehicle_brand: "peugeot",
        fuel: "diesel",
        gearbox: "manuelle",
      },
    });
    expect(
      listings.find((listing) => listing.title.includes("front-end React")),
    ).toMatchObject({
      categorySlug: "emploi",
      attributes: {
        canonicalPath: `/emploi/offre/${EMPLOYMENT_DEMO_JOBS[0].slug}`,
        contract_type: "cdi",
        job_sector: "tech_informatique",
        telework: "hybrid",
      },
    });
    expect(
      listings.find((listing) => listing.sellerName === "Sophie Martin"),
    ).toMatchObject({
      sellerType: "pro",
      attributes: {
        canonicalPath: "/cours/professeur/sophie-martin-lyon",
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
        property_type: "appartement",
        furnished: "meuble",
        heating_source: "collective",
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
