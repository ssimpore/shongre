import { businessRegistryResolver, CompanyInfo } from '../business-registry/siret-resolver.js';

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
    return businessRegistryResolver.lookupBySiret(siretOrSiren);
  }
}
