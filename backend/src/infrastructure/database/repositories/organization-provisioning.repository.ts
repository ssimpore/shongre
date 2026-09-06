import { config } from "../../../app/config/index.js";
import type { ProfessionalVertical } from "@shongre/contracts/access-control";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";

interface InitialOrganizationInput {
  ownerId: string;
  legalName: string;
  tradingName?: string;
  businessIdentifier: string;
  vatNumber?: string;
  legalForm?: string;
  registeredAddress: string;
  city: string;
  postalCode: string;
  countryCode: string;
  professionalVertical: ProfessionalVertical;
}

interface ProvisionedOrganization {
  id: string;
  ownerId: string;
  legalName: string;
  countryCode: string;
}

/**
 * Shared organization bootstrap used by independently acquired Shongre
 * products. It creates identity and team context only; it never grants a
 * product subscription or entitlement.
 */
export interface OrganizationProvisioningRepository {
  ensureOwnedOrganization(
    input: InitialOrganizationInput,
  ): Promise<ProvisionedOrganization>;
}

class DemoOrganizationProvisioningRepository implements OrganizationProvisioningRepository {
  private readonly organizations = new Map<string, ProvisionedOrganization>();

  async ensureOwnedOrganization(
    input: InitialOrganizationInput,
  ): Promise<ProvisionedOrganization> {
    const existing = this.organizations.get(input.ownerId);
    if (existing) return structuredClone(existing);
    const organization = {
      id: `demo-organization-${input.ownerId}`,
      ownerId: input.ownerId,
      legalName: input.legalName,
      countryCode: input.countryCode,
    };
    this.organizations.set(input.ownerId, organization);
    return structuredClone(organization);
  }
}

class PostgresOrganizationProvisioningRepository implements OrganizationProvisioningRepository {
  async ensureOwnedOrganization(
    input: InitialOrganizationInput,
  ): Promise<ProvisionedOrganization> {
    const supabase = getSupabaseAdminClient();
    const result = await supabase.rpc("ensure_owned_organization", {
      p_owner_id: input.ownerId,
      p_legal_name: input.legalName,
      // postgres-meta does not expose nullability for required RPC arguments.
      p_trading_name: (input.tradingName ?? null) as unknown as string,
      p_business_identifier: input.businessIdentifier,
      p_vat_number: (input.vatNumber ?? null) as unknown as string,
      p_legal_form: (input.legalForm ?? null) as unknown as string,
      p_registered_address: input.registeredAddress,
      p_city: input.city,
      p_postal_code: input.postalCode,
      p_country_code: input.countryCode,
      p_professional_vertical: input.professionalVertical,
    });
    if (result.error || !result.data?.length) {
      databaseFailure(
        "organizations.ensureOwnedOrganization",
        result.error ?? new Error("Organization provisioning returned no row"),
      );
    }
    const row = result.data[0];
    return {
      id: row.id,
      ownerId: row.owner_id,
      legalName: row.legal_name,
      countryCode: row.country,
    };
  }
}

export const organizationProvisioningRepository: OrganizationProvisioningRepository =
  config.dataMode === "database"
    ? new PostgresOrganizationProvisioningRepository()
    : new DemoOrganizationProvisioningRepository();
