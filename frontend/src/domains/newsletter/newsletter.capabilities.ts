/**
 * SHONGRE NEWSLETTER CAPABILITIES RESOLVER
 * Evaluates available newsletter topics, management permissions, and audience context.
 */

import { UserProfile } from "../../types";
import { isProSeller } from "../user/user.domain";
import {
  newsletterTopicsService,
  NewsletterTopicDefinition,
} from "./newsletter.topics";

export interface NewsletterCapabilities {
  canSubscribe: boolean;
  canManagePreferences: boolean;
  canAdminCampaigns: boolean;
  isPro: boolean;
  availableTopics: NewsletterTopicDefinition[];
}

export class NewsletterCapabilitiesService {
  resolve(params: {
    viewer: UserProfile | null;
    marketCode?: string;
  }): NewsletterCapabilities {
    const { viewer } = params;
    const isPro = isProSeller(viewer);
    const canAdminCampaigns =
      viewer?.role === "admin" ||
      viewer?.role === "super_admin" ||
      viewer?.role === "moderator";

    const availableTopics = newsletterTopicsService.getTopicsForAudience(isPro);

    return {
      canSubscribe: true,
      canManagePreferences: true,
      canAdminCampaigns: !!canAdminCampaigns,
      isPro,
      availableTopics,
    };
  }
}

export const newsletterCapabilitiesService =
  new NewsletterCapabilitiesService();
