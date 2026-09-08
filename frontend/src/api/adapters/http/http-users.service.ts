import type { operations } from "@shongre/contracts/openapi";

import type { UsersServiceContract } from "../../contracts/users.contract";
import type { PublicSellerProfile } from "../../../types";
import { apiOperation } from "./generated-api-operation";

type PublicProfileResponse =
  operations["getUsersById"]["responses"][200]["content"]["application/json"];
type ProfessionalProfilesResponse =
  operations["getProfessionalUsers"]["responses"][200]["content"]["application/json"];

export class HttpUsersService implements UsersServiceContract {
  getPublicProfile(idOrSlug: string): Promise<PublicSellerProfile | null> {
    return apiOperation<PublicProfileResponse, "getUsersById">("getUsersById", {
      path: { id: idOrSlug },
    });
  }

  async listProfessionalProfiles(
    marketCode: string,
  ): Promise<PublicSellerProfile[]> {
    const profiles = await apiOperation<
      ProfessionalProfilesResponse,
      "getProfessionalUsers"
    >("getProfessionalUsers", {
      headers: { "X-Shongre-Market": marketCode },
    });
    return [...profiles];
  }
}

export const httpUsersService = new HttpUsersService();
