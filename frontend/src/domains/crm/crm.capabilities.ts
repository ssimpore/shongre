/**
 * SHONGRE CRM CAPABILITIES RESOLVER
 * Permission & market-scope evaluation for commercial and administrative operators.
 */

import { UserProfile } from "../../types";

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

    const role = viewer.role;
    const isCommercial = role === "commercial";
    const isMarketManager = role === "market_manager";
    const isAdmin = role === "admin" || role === "super_admin";
    const isSupport = role === "support";

    const canAccessCrm =
      isCommercial || isMarketManager || isAdmin || isSupport;
    const canManageContacts = isCommercial || isAdmin || isMarketManager;
    const canManageCompanies = isCommercial || isAdmin || isMarketManager;
    const canManageOpportunities = isCommercial || isAdmin;
    const canUseAiProspecting = isCommercial || isAdmin;
    const canExport = isAdmin;

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
