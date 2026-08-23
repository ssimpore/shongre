/**
 * SHONGRE CRM CAPABILITIES RESOLVER
 * Permission & market-scope evaluation for commercial and administrative operators.
 */

import { UserProfile } from "../../types";
import { authorizationService } from "../../security/authorization.service";

export interface CrmCapabilities {
  canAccessCrm: boolean;
  canManageContacts: boolean;
  canManageCompanies: boolean;
  canManageOpportunities: boolean;
  canUseAiProspecting: boolean;
  canExport: boolean;
  marketScope: string[];
}

export class CrmCapabilitiesService {
  resolve(params: {
    viewer: UserProfile | null;
    marketCode?: string;
  }): CrmCapabilities {
    const { viewer } = params;
    if (!viewer) {
      return {
        canAccessCrm: false,
        canManageContacts: false,
        canManageCompanies: false,
        canManageOpportunities: false,
        canUseAiProspecting: false,
        canExport: false,
        marketScope: ["FR"],
      };
    }

    const canAccessCrm = authorizationService.can(viewer, "crm.access");
    const canManageContacts = authorizationService.can(
      viewer,
      "crm.contact.manage",
    );
    const canManageCompanies = authorizationService.can(
      viewer,
      "crm.company.manage",
    );
    const canManageOpportunities = authorizationService.can(
      viewer,
      "crm.opportunity.manage",
    );
    const canUseAiProspecting = authorizationService.can(
      viewer,
      "crm.ai_prospecting.use",
    );
    // No export capability exists yet, so deny by default instead of inferring
    // a sensitive data export from a broad administrative label.
    const canExport = false;

    const marketScope = viewer.marketScope?.countries || ["FR"];

    return {
      canAccessCrm,
      canManageContacts,
      canManageCompanies,
      canManageOpportunities,
      canUseAiProspecting,
      canExport,
      marketScope,
    };
  }
}

export const crmCapabilitiesService = new CrmCapabilitiesService();
