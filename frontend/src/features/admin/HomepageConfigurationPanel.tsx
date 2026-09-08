import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  LayoutDashboard,
  RefreshCw,
  Rocket,
  Save,
} from "lucide-react";
import {
  HOMEPAGE_ADMIN_CONSTRAINTS,
  HOMEPAGE_OFFER_TYPES,
  HOMEPAGE_SELECTION_MODES,
  homepageConfigurationSchema,
  type HomepageConfiguration,
  type HomepageSectionConfiguration,
  type HomepageSectionType,
} from "@shongre/contracts/homepage";
import { services } from "../../api/client/service-registry";
import type { HomepageExperience } from "../../domains/homepage/homepage.types";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../design-system/primitives/Button";
import { StatePanel } from "../../design-system/primitives/StatePanel";
import {
  Checkbox,
  FormField,
  Input,
  Select,
  Textarea,
} from "../../design-system/primitives/FormField";
import { useTranslation } from "../../i18n/I18nProvider";
import type { Category } from "../../types";

const SECTION_LABELS: Record<HomepageSectionType, string> = {
  hero: "En-tête et recherche",
  recent_searches: "Recherches récentes",
  trending: "En tendence",
  deals: "Meilleures offres",
  recent_listings: "Annonces récentes",
  universe_explorer: "Explorer par univers",
  collections: "Collections du moment",
  pro_cta: "Bloc Professionnels",
};

const OFFER_LABELS = {
  verified_price_reduction: "Baisse de prix vérifiée",
  marketplace_deal: "Offre marketplace",
  time_limited_promotion: "Promotion limitée",
  professional_discount: "Remise professionnelle",
} as const;

const THRESHOLD_SECTION_TYPES = new Set<HomepageSectionType>([
  "recent_searches",
  "trending",
  "deals",
  "recent_listings",
  "universe_explorer",
  "collections",
]);

const toLocalDateTime = (value?: string) => (value ? value.slice(0, 16) : "");
const toIsoDateTime = (value: string) =>
  value ? new Date(value).toISOString() : undefined;

interface HomepageConfigurationPanelProps {
  marketCode: string;
  locale: string;
}

export const HomepageConfigurationPanel: React.FC<
  HomepageConfigurationPanelProps
> = ({ marketCode, locale }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [configuration, setConfiguration] =
    useState<HomepageConfiguration | null>(null);
  const [rootCategories, setRootCategories] = useState<Category[]>([]);
  const [preview, setPreview] = useState<HomepageExperience | null>(null);
  const [previewViewport, setPreviewViewport] = useState<"mobile" | "desktop">(
    "desktop",
  );
  const [changeReason, setChangeReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState<"save" | "preview" | "publish" | null>(
    null,
  );

  const query = useMemo(() => ({ marketCode, locale }), [locale, marketCode]);

  const load = async () => {
    setIsLoading(true);
    try {
      const [draft, categories] = await Promise.all([
        services.homepage.getHomepageDraft(query),
        services.taxonomy.getRootCategories(),
      ]);
      setConfiguration(draft);
      setRootCategories(categories);
      setPreview(await services.homepage.previewHomepage(draft, query));
    } catch {
      toast.error(
        "Impossible de charger la configuration de la page d’accueil.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [marketCode, locale]);

  const replaceSection = (
    key: HomepageSectionType,
    update: (
      section: HomepageSectionConfiguration,
    ) => HomepageSectionConfiguration,
  ) => {
    setConfiguration((current) =>
      current
        ? {
            ...current,
            sections: current.sections.map((section) =>
              section.key === key ? update(section) : section,
            ),
          }
        : current,
    );
  };

  const reorder = (key: HomepageSectionType, direction: -1 | 1) => {
    setConfiguration((current) => {
      if (!current) return current;
      const ordered = [...current.sections].sort((a, b) => a.order - b.order);
      const index = ordered.findIndex((section) => section.key === key);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= ordered.length)
        return current;
      [ordered[index], ordered[destination]] = [
        ordered[destination]!,
        ordered[index]!,
      ];
      return {
        ...current,
        sections: ordered.map((section, order) => ({ ...section, order })),
      };
    });
  };

  const updateUniverseSubsections = (
    key: HomepageSectionType,
    update: (
      subsections: NonNullable<
        HomepageSectionConfiguration["settings"]["universeSubsections"]
      >,
    ) => NonNullable<
      HomepageSectionConfiguration["settings"]["universeSubsections"]
    >,
  ) => {
    replaceSection(key, (current) => ({
      ...current,
      settings: {
        ...current.settings,
        universeSubsections: update(
          current.settings.universeSubsections || [],
        ).map((subsection, order) => ({ ...subsection, order })),
      },
    }));
  };

  const reorderCollection = (
    key: HomepageSectionType,
    index: number,
    direction: -1 | 1,
  ) => {
    replaceSection(key, (current) => {
      const next = [...(current.settings.collectionSlugs || [])];
      const destination = index + direction;
      if (destination < 0 || destination >= next.length) return current;
      [next[index], next[destination]] = [next[destination]!, next[index]!];
      return {
        ...current,
        settings: { ...current.settings, collectionSlugs: next },
      };
    });
  };

  const validate = () => {
    if (!configuration) return null;
    const parsed = homepageConfigurationSchema.safeParse(configuration);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Configuration invalide.");
      return null;
    }
    return parsed.data;
  };

  const save = async () => {
    const valid = validate();
    if (!valid || changeReason.trim().length < 3) {
      toast.error("Indiquez un motif de modification (3 caractères minimum).");
      return;
    }
    setAction("save");
    try {
      const saved = await services.homepage.saveHomepageDraft({
        configuration: valid,
        changeReason: changeReason.trim(),
      });
      setConfiguration(saved);
      toast.success("Brouillon de la page d’accueil enregistré.");
    } catch {
      toast.error("Le brouillon n’a pas pu être enregistré.");
    } finally {
      setAction(null);
    }
  };

  const refreshPreview = async () => {
    const valid = validate();
    if (!valid) return;
    setAction("preview");
    try {
      setPreview(await services.homepage.previewHomepage(valid, query));
      toast.success("Aperçu recalculé avec les données du marché.");
    } catch {
      toast.error("L’aperçu n’a pas pu être généré.");
    } finally {
      setAction(null);
    }
  };

  const publish = async () => {
    const valid = validate();
    if (!valid || changeReason.trim().length < 3) {
      toast.error("Indiquez le motif de publication.");
      return;
    }
    setAction("publish");
    try {
      await services.homepage.saveHomepageDraft({
        configuration: valid,
        changeReason: changeReason.trim(),
      });
      const published = await services.homepage.publishHomepage({
        marketCode,
        locale,
        changeReason: changeReason.trim(),
      });
      setPreview(await services.homepage.previewHomepage(published, query));
      setConfiguration(await services.homepage.getHomepageDraft(query));
      setChangeReason("");
      toast.success("Nouvelle version de la page d’accueil publiée.");
    } catch {
      toast.error("La publication n’a pas abouti.");
    } finally {
      setAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-control border border-border-disabled bg-bg-surface text-sm font-medium text-text-tertiary">
        <RefreshCw className="mr-2 h-icon-md w-icon-md animate-spin" />
        {t("admin.homepageConfigurationPanel.chargementDeLaPageDAccueil")}
      </div>
    );
  }

  if (!configuration) {
    return (
      <StatePanel
        variant="offline"
        title={t("home.homePage.configurationUnavailableTitle")}
        description={t("home.homePage.configurationUnavailableDescription")}
        action={
          <Button
            type="button"
            size="sm"
            onClick={() => void load()}
            leftIcon={<RefreshCw className="h-icon-md w-icon-md" />}
          >
            {t("common.retry")}
          </Button>
        }
      />
    );
  }

  const sections = [...configuration.sections].sort(
    (a, b) => a.order - b.order,
  );

  return (
    <section className="space-y-6" aria-labelledby="homepage-config-title">
      <div className="flex flex-col justify-between gap-4 rounded-control border border-border-disabled bg-bg-surface p-5 shadow-xs sm:flex-row sm:items-end sm:p-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <LayoutDashboard className="h-icon-md w-icon-md" /> Page d’accueil
          </div>
          <h1
            id="homepage-config-title"
            className="text-2xl font-bold tracking-tight text-text-main"
          >
            {t("admin.homepageConfigurationPanel.configurationCentralisee")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-tertiary">
            {t("invoicing.product.previewMarket")} <strong>{marketCode}</strong>{" "}
            · langue <strong>{locale}</strong>{" "}
            {t("admin.homepageConfigurationPanel.revision")}{" "}
            {configuration.revision}. Les modifications restent en brouillon
            jusqu’à publication.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refreshPreview()}
            disabled={action !== null}
            leftIcon={<Eye className="h-icon-md w-icon-md" />}
          >
            {t("admin.adminNewsletterPage.apercu")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void save()}
            disabled={action !== null}
            leftIcon={<Save className="h-icon-md w-icon-md" />}
          >
            {t("invoicing.workspace.saveDraft")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void publish()}
            disabled={action !== null}
            leftIcon={<Rocket className="h-icon-md w-icon-md" />}
          >
            Publier
          </Button>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-admin-content-aside">
        <div className="min-w-0 space-y-3">
          {sections.map((section, index) => (
            <article
              key={section.key}
              className="rounded-control border border-border-disabled bg-bg-surface p-4 shadow-xs sm:p-5"
              data-testid={`homepage-admin-section-${section.key}`}
            >
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-pill bg-primary-light text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <h2 className="min-w-0 flex-1 text-sm font-bold text-text-main">
                  {SECTION_LABELS[section.type]}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Monter ${SECTION_LABELS[section.type]}`}
                  disabled={index === 0}
                  onClick={() => reorder(section.key, -1)}
                  leftIcon={<ArrowUp className="h-icon-sm w-icon-sm" />}
                >
                  Monter
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Descendre ${SECTION_LABELS[section.type]}`}
                  disabled={index === sections.length - 1}
                  onClick={() => reorder(section.key, 1)}
                  leftIcon={<ArrowDown className="h-icon-sm w-icon-sm" />}
                >
                  Descendre
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-control border border-border-base bg-bg-subtle px-3 py-3 sm:col-span-2">
                  <Checkbox
                    label="Section active"
                    checked={section.enabled}
                    onChange={(event) =>
                      replaceSection(section.key, (current) => ({
                        ...current,
                        enabled: event.target.checked,
                      }))
                    }
                  />
                </div>
                <FormField label={`Titre (${locale})`}>
                  <Input
                    maxLength={HOMEPAGE_ADMIN_CONSTRAINTS.title.maxLength}
                    value={section.titleByLocale[locale] || ""}
                    onChange={(event) =>
                      replaceSection(section.key, (current) => ({
                        ...current,
                        titleByLocale: {
                          ...current.titleByLocale,
                          [locale]: event.target.value,
                        },
                      }))
                    }
                  />
                </FormField>
                <FormField
                  label={t(
                    "admin.homepageConfigurationPanel.nombreMaximalDElements",
                  )}
                >
                  <Input
                    type="number"
                    min={HOMEPAGE_ADMIN_CONSTRAINTS.itemCount.min}
                    max={HOMEPAGE_ADMIN_CONSTRAINTS.itemCount.max}
                    value={section.maxItems}
                    onChange={(event) =>
                      replaceSection(section.key, (current) => ({
                        ...current,
                        maxItems: Number(event.target.value),
                      }))
                    }
                  />
                </FormField>
                {THRESHOLD_SECTION_TYPES.has(section.type) ? (
                  <FormField
                    label={t(
                      "admin.homepageConfigurationPanel.nombreMinimalDAnnoncesEligibles",
                    )}
                  >
                    <Input
                      type="number"
                      min={HOMEPAGE_ADMIN_CONSTRAINTS.minimumListingCount.min}
                      max={HOMEPAGE_ADMIN_CONSTRAINTS.minimumListingCount.max}
                      value={section.minimumListingCount}
                      onChange={(event) =>
                        replaceSection(section.key, (current) => ({
                          ...current,
                          minimumListingCount: Number(event.target.value),
                        }))
                      }
                    />
                  </FormField>
                ) : null}
                <FormField
                  label={`Sous-titre (${locale})`}
                  className="sm:col-span-2"
                >
                  <Textarea
                    maxLength={HOMEPAGE_ADMIN_CONSTRAINTS.subtitle.maxLength}
                    value={section.subtitleByLocale[locale] || ""}
                    onChange={(event) =>
                      replaceSection(section.key, (current) => ({
                        ...current,
                        subtitleByLocale: {
                          ...current.subtitleByLocale,
                          [locale]: event.target.value,
                        },
                      }))
                    }
                  />
                </FormField>
                <FormField label={t("admin.adminTrendingPage.debutProgramme")}>
                  <Input
                    type="datetime-local"
                    value={toLocalDateTime(section.startsAt)}
                    onChange={(event) =>
                      replaceSection(section.key, (current) => ({
                        ...current,
                        startsAt: toIsoDateTime(event.target.value),
                      }))
                    }
                  />
                </FormField>
                <FormField label={t("admin.adminTrendingPage.finProgrammee")}>
                  <Input
                    type="datetime-local"
                    value={toLocalDateTime(section.endsAt)}
                    onChange={(event) =>
                      replaceSection(section.key, (current) => ({
                        ...current,
                        endsAt: toIsoDateTime(event.target.value),
                      }))
                    }
                  />
                </FormField>
                <div className="flex flex-wrap gap-5 sm:col-span-2">
                  <Checkbox
                    label={t(
                      "admin.homepageConfigurationPanel.visibleSurMobile",
                    )}
                    checked={section.mobileVisible}
                    onChange={(event) =>
                      replaceSection(section.key, (current) => ({
                        ...current,
                        mobileVisible: event.target.checked,
                      }))
                    }
                  />
                  <Checkbox
                    label={t(
                      "admin.homepageConfigurationPanel.visibleSurDesktop",
                    )}
                    checked={section.desktopVisible}
                    onChange={(event) =>
                      replaceSection(section.key, (current) => ({
                        ...current,
                        desktopVisible: event.target.checked,
                      }))
                    }
                  />
                </div>
                {section.type === "universe_explorer" ? (
                  <div className="space-y-4 rounded-control border border-primary-border bg-primary-light p-4 sm:col-span-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wide text-primary">
                        {t(
                          "admin.homepageConfigurationPanel.categoriesDeLExplorateur",
                        )}
                      </h3>
                      <p className="mt-1 text-xs text-text-tertiary">
                        {t(
                          "admin.homepageConfigurationPanel.categoriesDeLExplorateurDescription",
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {rootCategories.map((category) => {
                        const subsections =
                          section.settings.universeSubsections || [];
                        const selected = subsections.some(
                          (item) => item.categoryId === category.id,
                        );
                        return (
                          <Checkbox
                            key={category.id}
                            label={category.name}
                            checked={selected}
                            disabled={selected && subsections.length === 1}
                            onChange={(event) =>
                              updateUniverseSubsections(
                                section.key,
                                (current) =>
                                  event.target.checked
                                    ? [
                                        ...current,
                                        {
                                          categoryId: category.id,
                                          enabled: true,
                                          order: current.length,
                                          maxItems: 8,
                                          minimumListingCount: 1,
                                          mobileVisible: true,
                                          desktopVisible: true,
                                          marketCodes: [marketCode],
                                        },
                                      ]
                                    : current.filter(
                                        (item) =>
                                          item.categoryId !== category.id,
                                      ),
                              )
                            }
                          />
                        );
                      })}
                    </div>
                    <div className="space-y-3">
                      {[...(section.settings.universeSubsections || [])]
                        .sort((left, right) => left.order - right.order)
                        .map((subsection, subsectionIndex, ordered) => {
                          const category = rootCategories.find(
                            (candidate) =>
                              candidate.id === subsection.categoryId,
                          );
                          return (
                            <div
                              key={subsection.categoryId}
                              className="rounded-control border border-border-base bg-bg-surface p-3"
                              data-testid={`homepage-universe-subsection-${subsection.categoryId}`}
                            >
                              <div className="mb-3 flex flex-wrap items-center gap-2">
                                <strong className="min-w-0 flex-1 text-sm text-text-main">
                                  {category?.name || subsection.categoryId}
                                </strong>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={subsectionIndex === 0}
                                  aria-label={`Monter ${subsection.categoryId}`}
                                  onClick={() =>
                                    updateUniverseSubsections(
                                      section.key,
                                      () => {
                                        const next = [...ordered];
                                        [
                                          next[subsectionIndex - 1],
                                          next[subsectionIndex],
                                        ] = [
                                          next[subsectionIndex]!,
                                          next[subsectionIndex - 1]!,
                                        ];
                                        return next;
                                      },
                                    )
                                  }
                                  leftIcon={
                                    <ArrowUp className="h-icon-sm w-icon-sm" />
                                  }
                                >
                                  Monter
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={
                                    subsectionIndex === ordered.length - 1
                                  }
                                  aria-label={`Descendre ${subsection.categoryId}`}
                                  onClick={() =>
                                    updateUniverseSubsections(
                                      section.key,
                                      () => {
                                        const next = [...ordered];
                                        [
                                          next[subsectionIndex],
                                          next[subsectionIndex + 1],
                                        ] = [
                                          next[subsectionIndex + 1]!,
                                          next[subsectionIndex]!,
                                        ];
                                        return next;
                                      },
                                    )
                                  }
                                  leftIcon={
                                    <ArrowDown className="h-icon-sm w-icon-sm" />
                                  }
                                >
                                  Descendre
                                </Button>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-3">
                                <FormField
                                  label={t(
                                    "admin.homepageConfigurationPanel.nombreMaximalDAnnonces",
                                  )}
                                >
                                  <Input
                                    type="number"
                                    min={
                                      HOMEPAGE_ADMIN_CONSTRAINTS.itemCount.min
                                    }
                                    max={
                                      HOMEPAGE_ADMIN_CONSTRAINTS.itemCount.max
                                    }
                                    value={subsection.maxItems}
                                    onChange={(event) =>
                                      updateUniverseSubsections(
                                        section.key,
                                        (current) =>
                                          current.map((item) =>
                                            item.categoryId ===
                                            subsection.categoryId
                                              ? {
                                                  ...item,
                                                  maxItems: Number(
                                                    event.target.value,
                                                  ),
                                                }
                                              : item,
                                          ),
                                      )
                                    }
                                  />
                                </FormField>
                                <FormField
                                  label={t(
                                    "admin.homepageConfigurationPanel.nombreMinimalDAnnoncesEligibles",
                                  )}
                                >
                                  <Input
                                    type="number"
                                    min={
                                      HOMEPAGE_ADMIN_CONSTRAINTS
                                        .minimumListingCount.min
                                    }
                                    max={
                                      HOMEPAGE_ADMIN_CONSTRAINTS
                                        .minimumListingCount.max
                                    }
                                    value={subsection.minimumListingCount}
                                    onChange={(event) =>
                                      updateUniverseSubsections(
                                        section.key,
                                        (current) =>
                                          current.map((item) =>
                                            item.categoryId ===
                                            subsection.categoryId
                                              ? {
                                                  ...item,
                                                  minimumListingCount: Number(
                                                    event.target.value,
                                                  ),
                                                }
                                              : item,
                                          ),
                                      )
                                    }
                                  />
                                </FormField>
                                <FormField
                                  label={t(
                                    "admin.homepageConfigurationPanel.marchesCibles",
                                  )}
                                >
                                  <Input
                                    value={subsection.marketCodes.join(", ")}
                                    onChange={(event) =>
                                      updateUniverseSubsections(
                                        section.key,
                                        (current) =>
                                          current.map((item) =>
                                            item.categoryId ===
                                            subsection.categoryId
                                              ? {
                                                  ...item,
                                                  marketCodes: Array.from(
                                                    new Set([
                                                      marketCode,
                                                      ...event.target.value
                                                        .split(",")
                                                        .map((value) =>
                                                          value
                                                            .trim()
                                                            .toUpperCase(),
                                                        )
                                                        .filter(Boolean),
                                                    ]),
                                                  ),
                                                }
                                              : item,
                                          ),
                                      )
                                    }
                                  />
                                </FormField>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-4">
                                <Checkbox
                                  label={t(
                                    "admin.homepageConfigurationPanel.sousSectionActive",
                                  )}
                                  checked={subsection.enabled}
                                  onChange={(event) =>
                                    updateUniverseSubsections(
                                      section.key,
                                      (current) =>
                                        current.map((item) =>
                                          item.categoryId ===
                                          subsection.categoryId
                                            ? {
                                                ...item,
                                                enabled: event.target.checked,
                                              }
                                            : item,
                                        ),
                                    )
                                  }
                                />
                                <Checkbox
                                  label={t(
                                    "admin.homepageConfigurationPanel.visibleSurMobile",
                                  )}
                                  checked={subsection.mobileVisible}
                                  onChange={(event) =>
                                    updateUniverseSubsections(
                                      section.key,
                                      (current) =>
                                        current.map((item) =>
                                          item.categoryId ===
                                          subsection.categoryId
                                            ? {
                                                ...item,
                                                mobileVisible:
                                                  event.target.checked,
                                              }
                                            : item,
                                        ),
                                    )
                                  }
                                />
                                <Checkbox
                                  label={t(
                                    "admin.homepageConfigurationPanel.visibleSurDesktop",
                                  )}
                                  checked={subsection.desktopVisible}
                                  onChange={(event) =>
                                    updateUniverseSubsections(
                                      section.key,
                                      (current) =>
                                        current.map((item) =>
                                          item.categoryId ===
                                          subsection.categoryId
                                            ? {
                                                ...item,
                                                desktopVisible:
                                                  event.target.checked,
                                              }
                                            : item,
                                        ),
                                    )
                                  }
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : null}
                {section.type === "collections" ? (
                  <div className="space-y-3 rounded-control border border-border-base bg-bg-subtle p-4 sm:col-span-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-text-emphasis">
                      {t(
                        "admin.homepageConfigurationPanel.collectionsAffichees",
                      )}
                    </h3>
                    <FormField
                      label={t("admin.adminTrendingPage.modeDeSelection")}
                    >
                      <Select
                        labelledByAncestor
                        value={
                          section.settings.selectionMode === "automatic"
                            ? "automatic"
                            : "manual"
                        }
                        onChange={(event) =>
                          replaceSection(section.key, (current) => ({
                            ...current,
                            settings: {
                              ...current.settings,
                              selectionMode: event.target.value as
                                "automatic" | "manual",
                            },
                          }))
                        }
                      >
                        <option value="automatic">
                          {t(
                            "admin.homepageConfigurationPanel.automaticCollections",
                          )}
                        </option>
                        <option value="manual">
                          {t(
                            "admin.homepageConfigurationPanel.manualCollections",
                          )}
                        </option>
                      </Select>
                    </FormField>
                    {section.settings.selectionMode !== "automatic" ? (
                      <>
                        <div className="flex flex-wrap gap-4">
                          {rootCategories.map((collection) => (
                            <Checkbox
                              key={collection.slug}
                              label={collection.name}
                              checked={(
                                section.settings.collectionSlugs || []
                              ).includes(collection.slug)}
                              onChange={(event) =>
                                replaceSection(section.key, (current) => {
                                  const selected =
                                    current.settings.collectionSlugs || [];
                                  return {
                                    ...current,
                                    settings: {
                                      ...current.settings,
                                      collectionSlugs: event.target.checked
                                        ? [...selected, collection.slug]
                                        : selected.filter(
                                            (slug) => slug !== collection.slug,
                                          ),
                                    },
                                  };
                                })
                              }
                            />
                          ))}
                        </div>
                        <div className="space-y-2">
                          {(section.settings.collectionSlugs || []).map(
                            (slug, collectionIndex, ordered) => {
                              const collection = rootCategories.find(
                                (candidate) => candidate.slug === slug,
                              );
                              return (
                                <div
                                  key={slug}
                                  data-testid={`homepage-collection-selection-${slug}`}
                                  className="flex items-center gap-2 rounded-control border border-border-base bg-bg-surface p-2"
                                >
                                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-main">
                                    {collection?.name || slug}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={collectionIndex === 0}
                                    aria-label={`Monter ${collection?.name || slug}`}
                                    onClick={() =>
                                      reorderCollection(
                                        section.key,
                                        collectionIndex,
                                        -1,
                                      )
                                    }
                                    leftIcon={
                                      <ArrowUp className="h-icon-sm w-icon-sm" />
                                    }
                                  >
                                    Monter
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={
                                      collectionIndex === ordered.length - 1
                                    }
                                    aria-label={`Descendre ${collection?.name || slug}`}
                                    onClick={() =>
                                      reorderCollection(
                                        section.key,
                                        collectionIndex,
                                        1,
                                      )
                                    }
                                    leftIcon={
                                      <ArrowDown className="h-icon-sm w-icon-sm" />
                                    }
                                  >
                                    Descendre
                                  </Button>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
                {section.type === "deals" ? (
                  <div className="space-y-3 rounded-control border border-primary-border bg-primary-light p-4 sm:col-span-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-primary">
                      {t(
                        "admin.homepageConfigurationPanel.reglesDEligibiliteDesOffres",
                      )}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField
                        label={t("admin.adminTrendingPage.modeDeSelection")}
                      >
                        <Select
                          labelledByAncestor
                          value={section.settings.selectionMode || "hybrid"}
                          onChange={(event) =>
                            replaceSection(section.key, (current) => ({
                              ...current,
                              settings: {
                                ...current.settings,
                                selectionMode: event.target
                                  .value as (typeof HOMEPAGE_SELECTION_MODES)[number],
                              },
                            }))
                          }
                        >
                          <option value="automatic">Automatique</option>
                          <option value="manual">Manuel</option>
                          <option value="hybrid">Hybride</option>
                        </Select>
                      </FormField>
                      <FormField label="Remise minimale (%)">
                        <Input
                          type="number"
                          min={HOMEPAGE_ADMIN_CONSTRAINTS.discountBps.min / 100}
                          max={HOMEPAGE_ADMIN_CONSTRAINTS.discountBps.max / 100}
                          value={
                            (section.settings.minimumDiscountBps || 0) / 100
                          }
                          onChange={(event) =>
                            replaceSection(section.key, (current) => ({
                              ...current,
                              settings: {
                                ...current.settings,
                                minimumDiscountBps: Math.round(
                                  Number(event.target.value) * 100,
                                ),
                              },
                            }))
                          }
                        />
                      </FormField>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {HOMEPAGE_OFFER_TYPES.map((offerType) => (
                        <Checkbox
                          key={offerType}
                          label={OFFER_LABELS[offerType]}
                          checked={section.settings.eligibleOfferTypes?.includes(
                            offerType,
                          )}
                          onChange={(event) =>
                            replaceSection(section.key, (current) => {
                              const selected = new Set(
                                current.settings.eligibleOfferTypes || [],
                              );
                              if (event.target.checked) selected.add(offerType);
                              else selected.delete(offerType);
                              return {
                                ...current,
                                settings: {
                                  ...current.settings,
                                  eligibleOfferTypes: [...selected],
                                },
                              };
                            })
                          }
                        />
                      ))}
                    </div>
                    <Checkbox
                      label={t(
                        "admin.homepageConfigurationPanel.inclureLesVendeursProfessionnels",
                      )}
                      checked={
                        section.settings.includeProfessionalSellers !== false
                      }
                      onChange={(event) =>
                        replaceSection(section.key, (current) => ({
                          ...current,
                          settings: {
                            ...current.settings,
                            includeProfessionalSellers: event.target.checked,
                          },
                        }))
                      }
                    />
                    <FormField
                      label={t(
                        "admin.homepageConfigurationPanel.marchesAutorisesCodesSeparesParDesVirgules",
                      )}
                    >
                      <Input
                        value={(section.settings.allowedMarkets || []).join(
                          ", ",
                        )}
                        onChange={(event) =>
                          replaceSection(section.key, (current) => ({
                            ...current,
                            settings: {
                              ...current.settings,
                              allowedMarkets: event.target.value
                                .split(",")
                                .map((value) => value.trim().toUpperCase())
                                .filter(Boolean),
                            },
                          }))
                        }
                      />
                    </FormField>
                    <FormField
                      label={t(
                        "admin.homepageConfigurationPanel.branchesTaxonomiquesAutoriseesSlugsSeparesParDesVirgules",
                      )}
                    >
                      <Input
                        value={(section.settings.taxonomyBranches || []).join(
                          ", ",
                        )}
                        onChange={(event) =>
                          replaceSection(section.key, (current) => ({
                            ...current,
                            settings: {
                              ...current.settings,
                              taxonomyBranches: event.target.value
                                .split(",")
                                .map((value) => value.trim())
                                .filter(Boolean),
                            },
                          }))
                        }
                      />
                    </FormField>
                    <FormField
                      label={t(
                        "admin.homepageConfigurationPanel.annoncesManuellesEpingleesIdentifiantsSeparesParDesVirgules",
                      )}
                    >
                      <Input
                        value={(section.settings.offerOverrides || [])
                          .filter((item) => item.isPinned)
                          .map((item) => item.listingId)
                          .join(", ")}
                        onChange={(event) =>
                          replaceSection(section.key, (current) => {
                            const existing = new Map(
                              (current.settings.offerOverrides || []).map(
                                (item) => [item.listingId, item],
                              ),
                            );
                            const pinnedIds = event.target.value
                              .split(",")
                              .map((value) => value.trim())
                              .filter(Boolean);
                            const retainedHidden = [
                              ...existing.values(),
                            ].filter(
                              (item) =>
                                item.isHidden &&
                                !pinnedIds.includes(item.listingId),
                            );
                            return {
                              ...current,
                              settings: {
                                ...current.settings,
                                offerOverrides: [
                                  ...pinnedIds.map((listingId, sortOrder) => ({
                                    ...existing.get(listingId),
                                    listingId,
                                    isPinned: true,
                                    isHidden: false,
                                    sortOrder,
                                  })),
                                  ...retainedHidden,
                                ],
                              },
                            };
                          })
                        }
                      />
                    </FormField>
                    <FormField
                      label={t(
                        "admin.homepageConfigurationPanel.annoncesAMasquerIdentifiantsSeparesParDesVirgules",
                      )}
                    >
                      <Input
                        value={(section.settings.offerOverrides || [])
                          .filter((item) => item.isHidden)
                          .map((item) => item.listingId)
                          .join(", ")}
                        onChange={(event) =>
                          replaceSection(section.key, (current) => {
                            const existing = new Map(
                              (current.settings.offerOverrides || []).map(
                                (item) => [item.listingId, item],
                              ),
                            );
                            const hiddenIds = event.target.value
                              .split(",")
                              .map((value) => value.trim())
                              .filter(Boolean);
                            const retainedPinned = [
                              ...existing.values(),
                            ].filter(
                              (item) =>
                                item.isPinned &&
                                !hiddenIds.includes(item.listingId),
                            );
                            return {
                              ...current,
                              settings: {
                                ...current.settings,
                                offerOverrides: [
                                  ...retainedPinned,
                                  ...hiddenIds.map((listingId) => ({
                                    ...existing.get(listingId),
                                    listingId,
                                    isPinned: false,
                                    isHidden: true,
                                  })),
                                ],
                              },
                            };
                          })
                        }
                      />
                    </FormField>
                    {(section.settings.offerOverrides || []).length ? (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-text-emphasis">
                          {t(
                            "admin.homepageConfigurationPanel.programmationDesOverridesDAnnonces",
                          )}
                        </h4>
                        {section.settings.offerOverrides?.map((override) => (
                          <div
                            key={override.listingId}
                            className="grid gap-2 rounded-control border border-border-disabled bg-bg-surface p-3 sm:grid-cols-3"
                          >
                            <div className="self-center truncate text-xs font-bold text-text-emphasis">
                              {override.listingId}
                            </div>
                            <Input
                              type="datetime-local"
                              aria-label={`Début ${override.listingId}`}
                              value={toLocalDateTime(override.startsAt)}
                              onChange={(event) =>
                                replaceSection(section.key, (current) => ({
                                  ...current,
                                  settings: {
                                    ...current.settings,
                                    offerOverrides:
                                      current.settings.offerOverrides?.map(
                                        (item) =>
                                          item.listingId === override.listingId
                                            ? {
                                                ...item,
                                                startsAt: toIsoDateTime(
                                                  event.target.value,
                                                ),
                                              }
                                            : item,
                                      ),
                                  },
                                }))
                              }
                            />
                            <Input
                              type="datetime-local"
                              aria-label={`Fin ${override.listingId}`}
                              value={toLocalDateTime(override.endsAt)}
                              onChange={(event) =>
                                replaceSection(section.key, (current) => ({
                                  ...current,
                                  settings: {
                                    ...current.settings,
                                    offerOverrides:
                                      current.settings.offerOverrides?.map(
                                        (item) =>
                                          item.listingId === override.listingId
                                            ? {
                                                ...item,
                                                endsAt: toIsoDateTime(
                                                  event.target.value,
                                                ),
                                              }
                                            : item,
                                      ),
                                  },
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <aside className="min-w-0 space-y-4 2xl:sticky 2xl:top-4 2xl:self-start">
          <div className="rounded-control border border-border-disabled bg-bg-surface p-5 shadow-xs">
            <h2 className="text-sm font-bold text-text-main">
              {t("admin.homepageConfigurationPanel.apercuDeLaPageComplete")}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-text-tertiary">
              {t(
                "admin.homepageConfigurationPanel.resolutionReelleDuBrouillonPour",
              )}{" "}
              {marketCode}. Les sections en erreur restent isolées des autres.
            </p>
            <FormField
              label={t(
                "admin.homepageConfigurationPanel.viewportDePrevisualisation",
              )}
              className="mt-4"
            >
              <Select
                labelledByAncestor
                value={previewViewport}
                onChange={(event) =>
                  setPreviewViewport(event.target.value as "mobile" | "desktop")
                }
              >
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
              </Select>
            </FormField>
            <ol className="mt-4 space-y-2" data-testid="homepage-admin-preview">
              {preview?.sections
                .filter((section) =>
                  previewViewport === "mobile"
                    ? section.mobileVisible
                    : section.desktopVisible,
                )
                .map((section, position) => {
                  const itemCount =
                    section.deals?.length ||
                    section.listings?.length ||
                    section.universeGroups
                      ?.filter((group) =>
                        previewViewport === "mobile"
                          ? group.mobileVisible
                          : group.desktopVisible,
                      )
                      .reduce(
                        (total, group) => total + group.listings.length,
                        0,
                      ) ||
                    section.trending?.topics.length ||
                    0;
                  return (
                    <li
                      key={section.key}
                      className="rounded-control border border-border-disabled bg-surface-soft p-3"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-text-disabled">
                          {position + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-text-main">
                            {section.title}
                          </div>
                          <div className="mt-0.5 text-xs text-text-tertiary">
                            {section.status}
                            {section.suppressed
                              ? " · masquée par le seuil minimum"
                              : ""}
                            {itemCount ? ` · ${itemCount} élément(s)` : ""}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              {!preview ? (
                <li className="rounded-control border border-dashed border-border-prominent p-6 text-center text-sm text-text-tertiary">
                  {t(
                    "admin.homepageConfigurationPanel.lancezLApercuPourResoudreLeContenu",
                  )}
                </li>
              ) : null}
            </ol>
          </div>
          <div className="rounded-control border border-border-disabled bg-bg-surface p-5 shadow-xs">
            <FormField
              label={t(
                "admin.homepageConfigurationPanel.motifDeModificationPublication",
              )}
            >
              <Textarea
                value={changeReason}
                minLength={HOMEPAGE_ADMIN_CONSTRAINTS.changeReason.minLength}
                maxLength={HOMEPAGE_ADMIN_CONSTRAINTS.changeReason.maxLength}
                onChange={(event) => setChangeReason(event.target.value)}
                placeholder={t(
                  "admin.homepageConfigurationPanel.expliquezLeChangementPourLHistoriqueDAudit",
                )}
              />
            </FormField>
            <p className="mt-3 text-xs leading-relaxed text-text-tertiary">
              {t(
                "admin.homepageConfigurationPanel.lesVersionsPublieesSontHistoriseesAvecLActeurLeMarche",
              )}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
};
