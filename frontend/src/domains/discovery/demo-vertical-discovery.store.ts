import type { VehiclePrivate } from "@shongre/contracts/auto";
import type { CourseOffer, TutorProfile } from "@shongre/contracts/courses";
import type { JobPostingDetail } from "@shongre/contracts/employment";
import { EMPLOYMENT_DEMO_JOBS } from "@shongre/contracts/employment-demo";
import type { PropertyPrivate } from "@shongre/contracts/real-estate";
import { AUTO_DEMO_PRIVATE_VEHICLES } from "../../mocks/autoDemoData";
import {
  DEMO_COURSE_CATALOG,
  DEMO_COURSE_OFFERS,
  DEMO_TUTORS,
} from "../../mocks/coursesDemoData";
import { IMMO_DEMO_PROPERTIES } from "../../mocks/realEstateDemoData";
import type { Listing } from "../../types";
import {
  projectAutoVehicle,
  projectCourseOffer,
  projectEmploymentJob,
  projectRealEstateProperty,
  type DiscoveryVertical,
} from "./vertical-discovery.projection";

const clone = <T>(value: T): T => structuredClone(value);

function projectionKey(
  vertical: DiscoveryVertical,
  verticalEntityId: string,
): string {
  return `${vertical}:${verticalEntityId}`;
}

/**
 * Canonical demo projection for cross-vertical discovery.
 *
 * Vertical adapters remain authoritative. They publish a normalized snapshot
 * here whenever a lifecycle-bearing row changes; generic listing search only
 * reads this store and never mutates the vertical record. Keeping inactive
 * snapshots (draft, suspended, archived) makes transitions deterministic while
 * the listing repository's normal active-status filter controls visibility.
 */
export class DemoVerticalDiscoveryStore {
  private listings = new Map<string, Listing>();
  private listingIdsByEntity = new Map<string, string>();

  constructor() {
    this.reset();
  }

  reset(): void {
    this.listings.clear();
    this.listingIdsByEntity.clear();

    AUTO_DEMO_PRIVATE_VEHICLES.forEach((vehicle) =>
      this.syncAutoVehicle(vehicle),
    );
    IMMO_DEMO_PROPERTIES.forEach((property) =>
      this.syncRealEstateProperty(property),
    );
    EMPLOYMENT_DEMO_JOBS.forEach((job) => this.syncEmploymentJob(job));

    const tutors = new Map(DEMO_TUTORS.map((tutor) => [tutor.id, tutor]));
    DEMO_COURSE_OFFERS.forEach((offer) => {
      const tutor = tutors.get(offer.tutorProfileId);
      if (tutor) this.syncCourseOffer(tutor, offer);
    });
  }

  private upsert(
    vertical: DiscoveryVertical,
    verticalEntityId: string,
    listing: Listing,
  ): Listing {
    const key = projectionKey(vertical, verticalEntityId);
    const previousListingId = this.listingIdsByEntity.get(key);
    if (previousListingId && previousListingId !== listing.id) {
      this.listings.delete(previousListingId);
    }
    this.listingIdsByEntity.set(key, listing.id);
    this.listings.set(listing.id, clone(listing));
    return clone(listing);
  }

  syncAutoVehicle(vehicle: VehiclePrivate): Listing {
    return this.upsert("automotive", vehicle.id, projectAutoVehicle(vehicle));
  }

  syncEmploymentJob(job: JobPostingDetail): Listing {
    return this.upsert("employment", job.id, projectEmploymentJob(job));
  }

  syncCourseOffer(tutor: TutorProfile, offer: CourseOffer): Listing {
    const subjectLabel =
      DEMO_COURSE_CATALOG.subjects.find(
        (subject) => subject.id === offer.subjectId,
      )?.label || "Éducation & Formation";
    return this.upsert(
      "tutoring",
      offer.id,
      projectCourseOffer(tutor, offer, subjectLabel),
    );
  }

  syncRealEstateProperty(property: PropertyPrivate): Listing {
    return this.upsert(
      "real_estate",
      property.id,
      projectRealEstateProperty(property),
    );
  }

  remove(vertical: DiscoveryVertical, verticalEntityId: string): boolean {
    const key = projectionKey(vertical, verticalEntityId);
    const listingId = this.listingIdsByEntity.get(key);
    if (!listingId) return false;
    this.listingIdsByEntity.delete(key);
    return this.listings.delete(listingId);
  }

  hasListing(listingId: string): boolean {
    return this.listings.has(listingId);
  }

  getListing(listingId: string): Listing | undefined {
    const listing = this.listings.get(listingId);
    return listing ? clone(listing) : undefined;
  }

  getListings(): Listing[] {
    return Array.from(this.listings.values(), clone);
  }
}

export const demoVerticalDiscoveryStore = new DemoVerticalDiscoveryStore();
