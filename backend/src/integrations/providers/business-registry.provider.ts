import {
  businessRegistryResolver,
  CompanyInfo,
} from "../business-registry/siret-resolver.js";
import { AppError } from "../../shared/errors/app-error.js";
import { config } from "../../app/config/index.js";
import { providerExecutionGuard } from "./provider-execution.js";
import { validateSiretLuhn } from "../business-registry/siret-resolver.js";

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
    const cleaned = String(siretOrSiren || "").replace(/\s+/g, "");
    if (
      (!/^\d{9}$/.test(cleaned) && !/^\d{14}$/.test(cleaned)) ||
      (cleaned.length === 14 && !validateSiretLuhn(cleaned))
    ) {
      return null;
    }
    if (!config.businessRegistryApiUrl || !config.businessRegistryApiToken) {
      throw new AppError({
        code: "NETWORK_ERROR",
        statusCode: 503,
        message: "Le registre des entreprises n’est pas configuré.",
      });
    }
    return providerExecutionGuard.execute({
      providerId: "insee-sirene",
      capability: "business.lookup",
      marketCode: "FR",
      mutating: false,
      maxAttempts: 2,
      isRetryable: (error) =>
        error instanceof AppError
          ? error.code === "RATE_LIMITED" || error.statusCode >= 500
          : true,
      operation: async () => {
        const base = config.businessRegistryApiUrl.replace(/\/$/, "");
        const url =
          cleaned.length === 14
            ? `${base}/siret/${cleaned}`
            : `${base}/siret?q=${encodeURIComponent(`siren:${cleaned}`)}&nombre=1`;
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${config.businessRegistryApiToken}`,
          },
          signal: AbortSignal.timeout(10_000),
        });
        if (response.status === 404) return null;
        if (!response.ok) {
          throw new AppError({
            code: response.status === 429 ? "RATE_LIMITED" : "NETWORK_ERROR",
            statusCode: response.status === 429 ? 429 : 503,
            message:
              "Le registre des entreprises est temporairement indisponible.",
          });
        }
        const payload: any = await response.json();
        const establishment =
          payload.etablissement || payload.etablissements?.[0] || null;
        if (!establishment) return null;
        const legalUnit = establishment.uniteLegale || {};
        const address = establishment.adresseEtablissement || {};
        const siret = String(establishment.siret || "");
        const siren = String(establishment.siren || siret.slice(0, 9));
        if (!/^\d{14}$/.test(siret) || !/^\d{9}$/.test(siren)) return null;
        const name =
          legalUnit.denominationUniteLegale ||
          legalUnit.denominationUsuelle1UniteLegale ||
          [legalUnit.prenom1UniteLegale, legalUnit.nomUniteLegale]
            .filter(Boolean)
            .join(" ");
        if (!name) return null;
        const addressLine = [
          address.numeroVoieEtablissement,
          address.indiceRepetitionEtablissement,
          address.typeVoieEtablissement,
          address.libelleVoieEtablissement,
        ]
          .filter(Boolean)
          .join(" ");
        return {
          siren,
          siret,
          name: String(name),
          legalForm: String(
            legalUnit.categorieJuridiqueUniteLegale || "non_renseignee",
          ),
          address: addressLine,
          city: String(address.libelleCommuneEtablissement || ""),
          postalCode: String(address.codePostalEtablissement || ""),
          country: "FR",
          isActive: establishment.etatAdministratifEtablissement === "A",
        };
      },
    });
  }
}
