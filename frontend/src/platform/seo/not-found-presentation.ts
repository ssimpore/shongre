import { brand } from "@shongre/brand";
import { routes } from "../../configuration/routes";
import { webBrandAssets } from "@shongre/brand/web";
import {
  borders,
  breakpoints,
  colors,
  motion,
  radius,
  shadows,
  sizing,
  spacing,
  themeInteraction,
  typography,
} from "@shongre/design-tokens";

export interface NotFoundPresentation {
  title: string;
  description: string;
  returnHref: string;
  returnLabel: string;
}

export function resolveNotFoundPresentation(
  resourceType: string | undefined,
  pathname: string,
): NotFoundPresentation {
  if (resourceType === "listing" || /^\/annonce\/[^/]+$/.test(pathname)) {
    return {
      title: "Annonce introuvable",
      description: "Cette annonce n’existe pas ou n’est plus disponible.",
      returnHref: "/recherche",
      returnLabel: "Explorer les annonces",
    };
  }
  if (
    resourceType === "seller" ||
    /^\/(?:boutique|profil|vendeur|u)\/[^/]+$/.test(pathname)
  ) {
    return {
      title: "Profil introuvable",
      description: "Ce profil public n’existe pas ou n’est plus disponible.",
      returnHref: "/professionnels",
      returnLabel: "Explorer les professionnels",
    };
  }
  if (resourceType === "job" || /^\/emploi\/offre\/[^/]+$/.test(pathname)) {
    return {
      title: "Offre introuvable",
      description:
        "Cette offre d’emploi n’existe pas ou n’est plus disponible.",
      returnHref: "/emploi",
      returnLabel: "Explorer les offres",
    };
  }
  if (
    resourceType === "collection" ||
    /^\/collections\/[^/]+$/.test(pathname)
  ) {
    return {
      title: "Collection introuvable",
      description: "Cette collection n’existe pas ou n’est plus disponible.",
      returnHref: "/collections",
      returnLabel: "Retour aux collections",
    };
  }
  if (
    resourceType === "vertical_resource" ||
    /^\/(?:auto\/vehicule|immo\/bien|education\/professeur)\/[^/]+$/.test(
      pathname,
    )
  ) {
    if (pathname.startsWith("/auto/")) {
      return {
        title: "Véhicule introuvable",
        description: "Ce véhicule n’existe pas ou n’est plus disponible.",
        returnHref: "/auto",
        returnLabel: "Explorer les véhicules",
      };
    }
    if (pathname.startsWith("/immo/")) {
      return {
        title: "Bien introuvable",
        description: "Ce bien n’existe pas ou n’est plus disponible.",
        returnHref: "/immo",
        returnLabel: "Explorer les biens",
      };
    }
    if (pathname.startsWith("/education/")) {
      return {
        title: "Profil professeur introuvable",
        description: "Ce profil n’existe pas ou n’est plus disponible.",
        returnHref: "/education",
        returnLabel: "Explorer les cours",
      };
    }
  }
  return {
    title: "Page introuvable",
    description: "Cette adresse ne correspond à aucune page publique SHONGRE.",
    returnHref: "/",
    returnLabel: "Retour à l’accueil",
  };
}

/**
 * Copy for a lookup that failed rather than a resource that is gone. It must
 * not tell the visitor the page does not exist, because that is exactly what
 * has not been established.
 */
export function resolveUnavailablePresentation(): NotFoundPresentation {
  return {
    title: "Page momentanément indisponible",
    description:
      "Nous n’avons pas pu charger cette page. Réessayez dans quelques instants.",
    returnHref: "/",
    returnLabel: "Retour à l’accueil",
  };
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

/**
 * Renders the standalone interstitial the edge proxy returns for a public route
 * it will not hand to the App Router — an absent resource (404) or a failed
 * lookup (503). Both share one shell so the two states stay visually identical
 * apart from their copy.
 */
/* Copy for this document is French-first and literal, like the presentation
   strings above it: the proxy answers before the App Router layout, so there is
   no i18n runtime to read a catalogue with.

   That constraint is also why this document stops at a search field. The richer
   recovery surface the catalogue makes possible — localized root categories from
   the taxonomy service, the real footer — already exists in
   `src/features/errors/NotFoundPage.tsx` and serves client-side navigation to an
   unknown route. Restating it here in untranslatable literals would put French
   text in front of every locale, which is what `check-i18n-coverage.mjs`
   ratchets against. */
const SEARCH_LABEL = "Rechercher une annonce";
const SEARCH_PLACEHOLDER_TEXT = "Que recherchez-vous ?";
const SEARCH_SUBMIT = "Rechercher";

export function renderNotFoundDocument(
  presentation: NotFoundPresentation,
  marketLabel?: string,
): string {
  const title = escapeHtml(presentation.title);
  const description = escapeHtml(presentation.description);
  const returnHref = escapeHtml(presentation.returnHref);
  const returnLabel = escapeHtml(presentation.returnLabel);
  const escapedMarketLabel = marketLabel ? escapeHtml(marketLabel) : "";
  const accessibleBrandLabel = escapeHtml(
    `${brand.name}${marketLabel ? ` ${marketLabel}` : ""}`,
  );
  // This response is emitted by the edge proxy before the App Router layout,
  // so it cannot inherit next/font's generated class. It still consumes the
  // canonical stack and its system fallback instead of loading a second font.
  const styles = `
    * { box-sizing: border-box; }
    body {
      min-height: 100vh;
      margin: 0;
      background: ${colors.surface.default};
      color: ${colors.text.primary};
      font-family: ${typography.fontFamilies.sans};
      font-synthesis: none;
    }
    main {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: ${spacing["4xl"]} ${spacing.lg};
    }
    section {
      width: min(100%, ${sizing.containers.task});
      padding: ${spacing["2xl"]};
      text-align: center;
      background: ${colors.surface.raised};
      border: ${borders.hairline} solid ${colors.border.default};
      border-radius: ${radius.card};
      box-shadow: ${shadows.sm};
    }
    .brand-signature {
      display: inline-flex;
      align-items: center;
      gap: ${spacing.sm};
      margin: 0 auto ${spacing.lg};
    }
    .brand-icon {
      display: block;
      flex: none;
      width: ${sizing.components["brand-signature-icon-compact"]};
      height: ${sizing.components["brand-signature-icon-compact"]};
      border-radius: ${radius.sm};
      object-fit: contain;
    }
    .brand-wordmark-stack {
      min-width: 0;
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: ${spacing.xs};
    }
    .brand-wordmark {
      display: block;
      width: ${sizing.components["brand-signature-wordmark-compact"]};
      height: auto;
      object-fit: contain;
    }
    .brand-market-label {
      max-width: 100%;
      overflow: hidden;
      color: ${colors.text.tertiary};
      font-size: ${typography.fontSizes.overline};
      font-weight: ${typography.fontWeights.semibold};
      line-height: ${typography.lineHeights.none};
      letter-spacing: ${typography.letterSpacing.wider};
      text-overflow: ellipsis;
      text-transform: uppercase;
      white-space: nowrap;
    }
    @media (max-width: calc(${breakpoints.lg} - 0.01px)) {
      .brand-market-label { display: none; }
    }
    .status {
      margin: 0;
      color: ${colors.action.primary};
      font-size: ${typography.fontSizes.sm};
      font-weight: ${typography.fontWeights.bold};
      letter-spacing: ${typography.letterSpacing.wide};
      text-transform: uppercase;
    }
    h1 {
      margin: ${spacing.md} 0 0;
      font-size: ${typography.fontSizes["3xl"]};
      line-height: ${typography.textLineHeights["3xl"]};
      font-weight: ${typography.fontWeights.bold};
    }
    .description {
      max-width: ${sizing.containers.task};
      margin: ${spacing.lg} auto 0;
      color: ${colors.text.secondary};
      font-size: ${typography.fontSizes.base};
      line-height: ${typography.lineHeights.relaxed};
    }
    a {
      min-height: ${sizing.controls["control-touch"]};
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: ${spacing["2xl"]};
      padding: 0 ${spacing.xl};
      color: ${colors.action.onPrimary};
      background: ${colors.action.primary};
      border-radius: ${radius.control};
      font-size: ${typography.fontSizes.sm};
      font-weight: ${typography.fontWeights.bold};
      text-decoration: none;
      transition: background ${motion.duration.normal} ${motion.easing.standard};
    }
    a:hover { background: ${colors.action.primaryHover}; }
    a:focus-visible {
      outline: ${themeInteraction.focusRingWidth} solid ${colors.interaction.focus};
      outline-offset: ${themeInteraction.focusRingOffset};
    }
    /* Recovery chrome. A dead end on a classifieds site is the cheapest place
       to recover a session, and an expired listing arriving from a search
       engine is the highest-volume 404 here. The visitor came with an intent,
       so the page carries a working search field, the catalogue entry points
       and the legal footer rather than a single link back to the homepage. */
    .search {
      display: flex;
      gap: ${spacing.sm};
      margin: ${spacing["2xl"]} auto 0;
      max-width: ${sizing.containers.task};
    }
    .search input {
      flex: 1;
      min-width: 0;
      min-height: ${sizing.controls["control-touch"]};
      padding: 0 ${spacing.md};
      color: ${colors.text.primary};
      background: ${colors.surface.default};
      border: ${borders.hairline} solid ${colors.border.default};
      border-radius: ${radius.control};
      font-family: inherit;
      font-size: ${typography.fontSizes.sm};
    }
    .search input:focus-visible {
      outline: ${themeInteraction.focusRingWidth} solid ${colors.interaction.focus};
      outline-offset: ${themeInteraction.focusRingOffset};
    }
    .search button {
      flex: none;
      min-height: ${sizing.controls["control-touch"]};
      padding: 0 ${spacing.xl};
      color: ${colors.action.onPrimary};
      background: ${colors.action.primary};
      border: 0;
      border-radius: ${radius.control};
      font-family: inherit;
      font-size: ${typography.fontSizes.sm};
      font-weight: ${typography.fontWeights.bold};
      cursor: pointer;
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `;

  return (
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex, nofollow">' +
    `<title>${title} | ${brand.name}</title><style>${styles}</style></head>` +
    `<body><main><section><span class="brand-signature" data-brand-signature="primary" role="img" aria-label="${accessibleBrandLabel}"><img class="brand-icon" src="${webBrandAssets.icon.primary.src}" width="${webBrandAssets.icon.primary.width}" height="${webBrandAssets.icon.primary.height}" alt="" aria-hidden="true"><span class="brand-wordmark-stack"><img class="brand-wordmark" src="${webBrandAssets.logo.wordmark.primary.src}" width="${webBrandAssets.logo.wordmark.primary.width}" height="${webBrandAssets.logo.wordmark.primary.height}" alt="" aria-hidden="true">${escapedMarketLabel ? `<span class="brand-market-label" data-brand-market-label aria-hidden="true">${escapedMarketLabel}</span>` : ""}</span></span>` +
    `<p class="status">Erreur 404</p><h1>${title}</h1>` +
    `<p class="description">${description}</p><a href="${returnHref}">${returnLabel}</a>` +
    /* `query` is the canonical keyword parameter: `routes.search()` writes it
       and `SearchPage` reads it. A plain GET form keeps this document free of
       script, which is the whole point of answering here rather than rendering
       the application. */
    `<form class="search" role="search" method="get" action="${routes.search()}">` +
    `<label class="visually-hidden" for="not-found-search">${SEARCH_LABEL}</label>` +
    `<input id="not-found-search" type="search" name="query" placeholder="${SEARCH_PLACEHOLDER_TEXT}">` +
    `<button type="submit">${SEARCH_SUBMIT}</button></form>` +
    "</section></main></body></html>"
  );
}
