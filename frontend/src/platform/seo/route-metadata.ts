import type { Metadata } from "next";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  resolveCanonical,
  resolveTitle,
} from "../../services/seo.service";

interface RouteMetadataInput {
  pathname: string;
  query?: Record<string, string | string[] | undefined>;
  origin: string;
}

const staticPages: Record<
  string,
  { title: string; description?: string; noIndex?: boolean }
> = {
  "/": { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
  "/categories": { title: "Toutes les catégories" },
  "/collections": { title: "Collections" },
  "/professionnels": { title: "Professionnels" },
  "/solutions-pro": { title: "Solutions pour les professionnels" },
  "/tarifs": { title: "Tarifs professionnels" },
  "/aide": { title: "Centre d’aide" },
  "/support": { title: "Centre d’aide" },
  "/securite": { title: "Sécurité" },
  "/contact": { title: "Nous contacter" },
  "/conditions-utilisation": { title: "Conditions d’utilisation" },
  "/confidentialite": { title: "Confidentialité" },
  "/mentions-legales": { title: "Mentions légales" },
  "/accessibilite": { title: "Accessibilité" },
  "/connexion": { title: "Connexion", noIndex: true },
  "/inscription": { title: "Créer un compte", noIndex: true },
  "/account/delete": { title: "Supprimer mon compte", noIndex: true },
};

export function metadataForRoute({
  pathname,
  query,
  origin,
}: RouteMetadataInput): Metadata {
  const route = staticPages[pathname];
  const isSearch = pathname === "/recherche";
  const isPrivate =
    pathname.startsWith("/compte") ||
    pathname.startsWith("/admin") ||
    pathname === "/messages" ||
    pathname === "/deposer";
  const category = pathname.startsWith("/categorie/")
    ? decodeURIComponent(pathname.split("/").pop() ?? "")
    : undefined;
  const title =
    route?.title ??
    (category
      ? `Annonces ${category.replace(/-/g, " ")}`
      : isSearch
        ? "Résultats de recherche"
        : "Petites annonces");
  const noIndex =
    route?.noIndex || isPrivate || (isSearch && Boolean(query?.query));
  const canonical = resolveCanonical(
    category ? `/categorie/${encodeURIComponent(category)}` : pathname,
    origin,
  );
  const resolvedTitle = resolveTitle(title);

  return {
    title: resolvedTitle,
    description: route?.description ?? DEFAULT_DESCRIPTION,
    alternates: { canonical },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: resolvedTitle,
      description: route?.description ?? DEFAULT_DESCRIPTION,
      type: "website",
      locale: "fr_FR",
      siteName: "Shongre",
      url: canonical,
    },
    twitter: {
      card: "summary",
      title: resolvedTitle,
      description: route?.description ?? DEFAULT_DESCRIPTION,
    },
  };
}
