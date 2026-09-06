import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("./http-client", () => ({
  httpClient: { get },
}));

import { HttpAutoService } from "./http-auto.service";
import { HttpCoursesService } from "./http-courses.service";
import { HttpRealEstateService } from "./http-real-estate.service";

describe("market-scoped public detail requests", () => {
  beforeEach(() => get.mockReset());

  it("sends the resolved market when loading a vehicle", () => {
    new HttpAutoService().getVehicle("vehicle-slug", "FR");

    expect(get).toHaveBeenCalledWith("/auto/vehicles/vehicle-slug", {
      headers: { "X-Shongre-Market": "FR" },
    });
  });

  it("sends the resolved market for property details and comparables", () => {
    const service = new HttpRealEstateService();
    service.getProperty("property-slug", "FR");
    service.getComparableProperties("property-id", "FR");

    expect(get).toHaveBeenNthCalledWith(
      1,
      "/real-estate/properties/property-slug",
      { headers: { "X-Shongre-Market": "FR" } },
    );
    expect(get).toHaveBeenNthCalledWith(
      2,
      "/real-estate/properties/property-id/comparables",
      { headers: { "X-Shongre-Market": "FR" } },
    );
  });

  it("sends the resolved market when loading a tutor", () => {
    new HttpCoursesService().getTutorProfile("tutor-slug", "FR");

    expect(get).toHaveBeenCalledWith("/education/tutors/tutor-slug", {
      headers: { "X-Shongre-Market": "FR" },
    });
  });
});
