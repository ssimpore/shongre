export interface SearchRouteParams {
  query?: string;
  category?: string;
  subCategory?: string;
  city?: string;
  radius?: number | string;
  view?: string;
  sortBy?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  sellerType?: string;
  delivery?: boolean;
  onlinePayment?: boolean;
  onlyDeals?: boolean;
  condition?: string | string[];
  market?: string;
  attributes?: Record<
    string,
    string | string[] | number | boolean | { min?: number; max?: number }
  >;
}

type QueryValue = string | number | boolean | null | undefined;

const pathSegment = (value: string | number) => {
  const normalized = String(value).trim();
  if (!normalized) {
    throw new Error("A route parameter cannot be empty.");
  }
  return encodeURIComponent(normalized);
};

/**
 * Canonical query-string builder for navigation destinations.
 *
 * Keeping encoding here prevents callers from producing a mixture of raw,
 * double-encoded and silently ignored parameters. Empty values are omitted;
 * false and zero are retained because both can be meaningful filter state.
 */
export const withQuery = (
  pathname: string,
  values: Record<string, QueryValue>,
): string => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
};

export const routes = {
  home: () => "/",
  category: (categorySlug: string, params: { subCategory?: string } = {}) =>
    withQuery(`/categorie/${pathSegment(categorySlug)}`, {
      subCategory: params.subCategory,
    }),
  search: (queryOrParams?: string | SearchRouteParams, view?: string) => {
    const params = new URLSearchParams();
    if (typeof queryOrParams === "string") {
      if (queryOrParams) params.set("query", queryOrParams);
      if (view) params.set("view", view);
    } else if (queryOrParams && typeof queryOrParams === "object") {
      if (queryOrParams.query) params.set("query", queryOrParams.query);
      if (queryOrParams.category)
        params.set("category", queryOrParams.category);
      if (queryOrParams.subCategory)
        params.set("subCategory", queryOrParams.subCategory);
      if (queryOrParams.city) params.set("city", queryOrParams.city);
      if (
        queryOrParams.radius &&
        queryOrParams.radius !== "0" &&
        queryOrParams.radius !== 0
      ) {
        params.set("radius", String(queryOrParams.radius));
      }
      if (queryOrParams.view || view)
        params.set("view", (queryOrParams.view || view)!);
      if (queryOrParams.sortBy) params.set("sortBy", queryOrParams.sortBy);
      if (queryOrParams.minPrice !== undefined)
        params.set("minPrice", String(queryOrParams.minPrice));
      if (queryOrParams.maxPrice !== undefined)
        params.set("maxPrice", String(queryOrParams.maxPrice));
      if (queryOrParams.sellerType)
        params.set("sellerType", queryOrParams.sellerType);
      if (queryOrParams.delivery) params.set("delivery", "true");
      if (queryOrParams.onlinePayment) params.set("onlinePayment", "true");
      if (queryOrParams.onlyDeals) params.set("onlyDeals", "true");
      if (queryOrParams.condition) {
        params.set(
          "condition",
          Array.isArray(queryOrParams.condition)
            ? queryOrParams.condition.join(",")
            : queryOrParams.condition,
        );
      }
      if (queryOrParams.market) params.set("market", queryOrParams.market);
      Object.entries(queryOrParams.attributes || {}).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          params.set(`attr_${key}`, value.join(","));
        } else if (typeof value === "object") {
          if (value.min !== undefined)
            params.set(`attr_${key}_min`, String(value.min));
          if (value.max !== undefined)
            params.set(`attr_${key}_max`, String(value.max));
        } else {
          params.set(`attr_${key}`, String(value));
        }
      });
    }
    const qs = params.toString();
    return `/recherche${qs ? `?${qs}` : ""}`;
  },
  categories: () => "/categories",
  contact: (params: { context?: string; listingId?: string } = {}) =>
    withQuery("/contact", params),
  courses: {
    search: () => "/education",
    tutor: (slug: string) => `/education/professeur/${pathSegment(slug)}`,
    request: (
      params: { tutor?: string; subject?: string; compare?: string } = {},
    ) => withQuery("/education/demande", params),
    publish: (params: { mode?: string; step?: string } = {}) =>
      withQuery("/deposer/education", params),
    availability: () =>
      withQuery("/deposer/education", {
        mode: "profile",
        step: "availability",
      }),
    workspace: () => "/compte/education",
    organization: () => "/compte/education/organisation",
  },
  auto: {
    search: () => "/auto",
    vehicle: (slug: string) => `/auto/vehicule/${pathSegment(slug)}`,
    compare: (ids: string[] = []) =>
      withQuery("/auto/comparer", {
        ids: ids.length ? ids.join(",") : undefined,
      }),
    publish: () => "/deposer/auto",
    workspace: () => "/compte/auto",
  },
  immo: {
    search: () => "/immo",
    property: (slug: string) => `/immo/bien/${pathSegment(slug)}`,
    publish: () => "/deposer/immo",
    workspace: () => "/compte/immo",
  },
  employment: {
    search: () => "/emploi",
    profession: (slug: string) => `/emploi/metier/${pathSegment(slug)}`,
    sector: (slug: string) => `/emploi/secteur/${pathSegment(slug)}`,
    location: (slug: string) => `/emploi/lieu/${pathSegment(slug)}`,
    job: (slug: string) => `/emploi/offre/${pathSegment(slug)}`,
    apply: (slug: string) => `/emploi/offre/${pathSegment(slug)}/postuler`,
    publish: () => "/deposer/emploi",
    candidateWorkspace: () => "/compte/emploi",
    recruiterWorkspace: () => "/compte/emploi/recruteur",
  },
  collections: {
    list: () => "/collections",
    detail: (slug: string) => `/collections/${pathSegment(slug)}`,
  },
  listing: {
    detail: (id: string) => `/annonce/${pathSegment(id)}`,
    publish: (params: { edit?: string } = {}) => withQuery("/deposer", params),
  },
  seller: {
    profile: (id: string) => `/profil/${pathSegment(id)}`,
    storefront: (id: string) => `/boutique/${pathSegment(id)}`,
  },
  workspace: {
    overview: () => "/compte",
    listings: () => "/compte/annonces",
    favorites: () => "/compte/favoris",
    savedSearches: () => "/compte/recherches",
    messages: (conversationId?: string) =>
      withQuery("/compte/messages", { convId: conversationId }),
    notifications: () => "/compte/notifications",
    notificationPreferences: () => "/compte/notifications/preferences",
    purchases: (transactionId?: string) =>
      withQuery("/compte/achats", { transactionId }),
    finances: () => "/compte/finances",
    verification: () => "/compte/verification",
    security: () => "/compte/securite-compte",
    profile: () => "/compte/profil",
    support: (requestId?: string) =>
      requestId
        ? `/compte/support/${pathSegment(requestId)}`
        : "/compte/support",
    moderationAppeals: () => "/compte/recours",
    newsletter: () => "/compte/newsletter",
    pro: {
      dashboard: () => `/compte/pro/tableau-de-bord`,
      storefront: () => "/compte/pro/vitrine",
      subscriptions: () => "/compte/pro/abonnements",
      finances: () => "/compte/pro/finances",
    },
  },
  auth: {
    login: (returnTo?: string) =>
      withQuery("/connexion", { redirect: returnTo }),
    register: (returnTo?: string) =>
      withQuery("/inscription", { redirect: returnTo }),
    registerIndividual: (returnTo?: string) =>
      withQuery("/inscription/particulier", { redirect: returnTo }),
    registerProfessional: (returnTo?: string) =>
      withQuery("/inscription/professionnel", { redirect: returnTo }),
    verifyEmail: () => "/verification-email",
  },
  legal: {
    terms: () => "/conditions-utilisation",
    privacy: () => "/confidentialite",
    notices: () => "/mentions-legales",
    accessibility: () => "/accessibilite",
    accountDeletion: () => "/account/delete",
  },
  help: () => "/aide",
  safety: () => "/securite",
  professionals: () => "/professionnels",
  proPlans: () => "/solutions-pro",
  deals: () => "/bons-plans",
  admin: {
    overview: () => `/admin`,
    moderation: () => `/admin/moderation`,
    verifications: () => `/admin/verifications`,
    providers: () => `/admin/fournisseurs`,
    providerDetail: (id: string) => `/admin/fournisseurs/${pathSegment(id)}`,
    markets: () => `/admin/marches`,
    taxonomy: (params: { tab?: string; node?: string } = {}) =>
      withQuery("/admin/taxonomie", params),
    monetization: () => `/admin/monetisation`,
    finance: () => `/admin/finance`,
    courses: () => `/admin/education`,
    auto: () => `/admin/auto`,
    immo: () => `/admin/immo`,
    employment: () => `/admin/emploi`,
    crm: () => `/admin/crm`,
    roles: () => `/admin/roles`,
    audit: () => `/admin/audit`,
  },
};
