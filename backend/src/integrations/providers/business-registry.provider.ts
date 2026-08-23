import {
  businessRegistryResolver,
  CompanyInfo,
} from "../business-registry/siret-resolver.js";
import { AppError } from "../../shared/errors/app-error.js";

export interface IBusinessRegistryProvider {
  lookupBySiret(siretOrSiren: string): Promise<CompanyInfo | null>;
}

export class DemoBusinessRegistryProvider implements IBusinessRegistryProvider {
  async lookupBySiret(siretOrSiren: string): Promise<CompanyInfo | null> {
    return businessRegistryResolver.lookupBySiret(siretOrSiren);
  }
}

export class SiretBusinessRegistryProvider implements IBusinessRegistryProvider {
  async lookupBySiret(siretOrSiren: string): Promise<CompanyInfo | null> {
    void siretOrSiren;
    throw new AppError({
      code: "NETWORK_ERROR",
      statusCode: 503,
      message: "Le registre des entreprises est temporairement indisponible.",
    });
  }
}
