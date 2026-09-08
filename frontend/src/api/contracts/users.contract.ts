import type { PublicSellerProfile } from "../../types";

export interface UsersServiceContract {
  getPublicProfile(idOrSlug: string): Promise<PublicSellerProfile | null>;
  listProfessionalProfiles(marketCode: string): Promise<PublicSellerProfile[]>;
}
