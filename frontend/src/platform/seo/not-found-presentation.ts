import { brand } from "@shongre/brand";
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
  `;

  return (
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex, nofollow">' +
    `<title>${title} | ${brand.name}</title><style>${styles}</style></head>` +
    `<body><main><section><span class="brand-signature" data-brand-signature="primary" role="img" aria-label="${accessibleBrandLabel}"><img class="brand-icon" src="${webBrandAssets.icon.primary.src}" width="${webBrandAssets.icon.primary.width}" height="${webBrandAssets.icon.primary.height}" alt="" aria-hidden="true"><span class="brand-wordmark-stack"><img class="brand-wordmark" src="${webBrandAssets.logo.wordmark.primary.src}" width="${webBrandAssets.logo.wordmark.primary.width}" height="${webBrandAssets.logo.wordmark.primary.height}" alt="" aria-hidden="true">${escapedMarketLabel ? `<span class="brand-market-label" data-brand-market-label aria-hidden="true">${escapedMarketLabel}</span>` : ""}</span></span>` +
    `<p class="status">Erreur 404</p><h1>${title}</h1>` +
    `<p class="description">${description}</p><a href="${returnHref}">${returnLabel}</a>` +
    "</section></main></body></html>"
  );
}
