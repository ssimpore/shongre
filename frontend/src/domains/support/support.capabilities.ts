/**
 * SHONGRE SUPPORT CAPABILITIES RESOLVER
 * Authoritative determination of available support categories and actions per user/role.
 */

import { UserProfile } from '../../types';
import { SUPPORT_CATEGORIES, SupportCategoryDefinition } from './support.categories';

export interface SupportCapabilities {
  canSubmit: boolean;
  canViewHistory: boolean;
  isPro: boolean;
  isSuspended: boolean;
  availableCategories: SupportCategoryDefinition[];
}

export class SupportCapabilitiesService {
  resolve(params: { viewer: UserProfile | null; marketCode?: string }): SupportCapabilities {
    const { viewer } = params;
    const isPro = viewer?.sellerType === 'pro' || viewer?.role === 'pro_seller';
    const isSuspended = viewer?.status === 'suspended';

    // Filter categories if needed
    let categories = [...SUPPORT_CATEGORIES];

    if (!isPro) {
      // Non-pro users don't see pro_account category prominently
      categories = categories.filter((c) => c.id !== 'pro_account');
    }

    return {
      canSubmit: true,
      canViewHistory: !!viewer,
      isPro,
      isSuspended: !!isSuspended,
      availableCategories: categories,
    };
  }
}

export const supportCapabilitiesService = new SupportCapabilitiesService();
