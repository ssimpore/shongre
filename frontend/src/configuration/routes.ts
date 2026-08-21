export interface SearchRouteParams {
  query?: string;
  category?: string;
  subCategory?: string;
  city?: string;
  radius?: number | string;
  view?: string;
  sortBy?: string;
}

export const routes = {
  home: () => "/",
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
    }
    const qs = params.toString();
    return `/recherche${qs ? `?${qs}` : ""}`;
  },
  categories: () => "/categories",
  collections: {
    list: () => "/collections",
    detail: (slug: string) => `/collections/${slug}`,
  },
  listing: {
    detail: (id: string) => `/annonce/${id}`,
    publish: () => `/deposer`,
  },
  seller: {
    profile: (id: string) => `/profil/${id}`,
    storefront: (id: string) => `/boutique/${id}`,
  },
  workspace: {
    messages: () => `/compte/messages`,
    purchases: () => `/compte/achats`,
    verification: () => `/compte/verification`,
    pro: {
      dashboard: () => `/compte/pro/tableau-de-bord`,
    },
  },
  auth: {
    login: () => `/connexion`,
    register: () => `/inscription`,
  },
  admin: {
    overview: () => `/admin`,
    verifications: () => `/admin/verifications`,
    providers: () => `/admin/fournisseurs`,
    providerDetail: (id: string) => `/admin/fournisseurs/${id}`,
    markets: () => `/admin/marches`,
    taxonomy: () => `/admin/taxonomie`,
    monetization: () => `/admin/monetisation`,
    roles: () => `/admin/roles`,
    audit: () => `/admin/audit`,
  },
};
