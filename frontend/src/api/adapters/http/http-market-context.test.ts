import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiOperation } = vi.hoisted(() => ({ apiOperation: vi.fn() }));

vi.mock("./generated-api-operation", () => ({
  apiOperation,
}));

import { HttpAutoService } from "./http-auto.service";
import { HttpCoursesService } from "./http-courses.service";
import { HttpRealEstateService } from "./http-real-estate.service";

describe("market-scoped public detail requests", () => {
  beforeEach(() => apiOperation.mockReset());

  it("sends the resolved market when loading a vehicle", () => {
    new HttpAutoService().getVehicle("vehicle-slug", "FR");

    expect(apiOperation).toHaveBeenCalledWith("getAutoVehiclesById", {
      path: { id: "vehicle-slug" },
      headers: { "X-Shongre-Market": "FR" },
    });
  });

  it("sends the resolved market for property details and comparables", () => {
    const service = new HttpRealEstateService();
    service.getProperty("property-slug", "FR");
    service.getComparableProperties("property-id", "FR");

    expect(apiOperation).toHaveBeenNthCalledWith(
      1,
      "getRealEstatePropertiesById",
      {
        path: { id: "property-slug" },
        headers: { "X-Shongre-Market": "FR" },
      },
    );
    expect(apiOperation).toHaveBeenNthCalledWith(
      2,
      "getRealEstatePropertiesByIdComparables",
      {
        path: { id: "property-id" },
        headers: { "X-Shongre-Market": "FR" },
      },
    );
  });

  it("sends the resolved market when loading a tutor", () => {
    new HttpCoursesService().getTutorProfile("tutor-slug", "FR");

    expect(apiOperation).toHaveBeenCalledWith("getEducationTutorsById", {
      path: { id: "tutor-slug" },
      headers: { "X-Shongre-Market": "FR" },
    });
  });
});
