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
import {
  Checkbox,
  FormField,
  Input,
  Select,
  Textarea,
} from "../../design-system/primitives/FormField";
import { useTranslation } from "../../i18n/I18nProvider";

const SECTION_LABELS: Record<HomepageSectionType, string> = {
  hero: "En-tête et recherche",
  recent_searches: "Recherches récentes",
  trending: "En ce moment sur Shongre",
  deals: "Meilleures offres",
  recent_listings: "Annonces récentes",
  collections: "Collections du moment",
  pro_cta: "Bloc Professionnels",
};

const OFFER_LABELS = {
  verified_price_reduction: "Baisse de prix vérifiée",
  marketplace_deal: "Offre marketplace",
  time_limited_promotion: "Promotion limitée",
  professional_discount: "Remise professionnelle",
} as const;

const toLocalDateTime = (value?: string) =>
  value ? value.slice(0, 16) : "";
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
      const draft = await services.homepage.getHomepageDraft(query);
      setConfiguration(draft);
      setPreview(await services.homepage.previewHomepage(draft, query));
    } catch {
      toast.error("Impossible de charger la configuration de la page d’accueil.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [marketCode, locale]);

  const replaceSection = (
    key: HomepageSectionType,
    update: (section: HomepageSectionConfiguration) => HomepageSectionConfiguration,
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

  if (isLoading || !configuration) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-control border border-stone-200 bg-bg-surface text-sm font-medium text-stone-500">
        <RefreshCw className="mr-2 h-icon-md w-icon-md animate-spin" />
        {t("admin.homepageConfigurationPanel.chargementDeLaPageDAccueil")}
      </div>
    );
  }

  const sections = [...configuration.sections].sort((a, b) => a.order - b.order);

  return (
    <section className="space-y-6" aria-labelledby="homepage-config-title">
      <div className="flex flex-col justify-between gap-4 rounded-control border border-stone-200 bg-bg-surface p-5 shadow-xs sm:flex-row sm:items-end sm:p-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <LayoutDashboard className="h-icon-md w-icon-md" /> Page d’accueil
          </div>
          <h1
            id="homepage-config-title"
            className="text-2xl font-black tracking-tight text-text-main"
          >
            {t("admin.homepageConfigurationPanel.configurationCentralisee")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500">
            {t("invoicing.product.previewMarket")} <strong>{marketCode}</strong> · langue <strong>{locale}</strong> {t("admin.homepageConfigurationPanel.revision")} {configuration.revision}. Les modifications restent en
            brouillon jusqu’à publication.
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
              className="rounded-control border border-stone-200 bg-bg-surface p-4 shadow-xs sm:p-5"
              data-testid={`homepage-admin-section-${section.key}`}
            >
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-pill bg-primary-light text-xs font-black text-primary">
                  {index + 1}
                </span>
                <h2 className="min-w-0 flex-1 text-sm font-black text-text-main">
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
                <FormField label={t("admin.homepageConfigurationPanel.nombreMaximalDElements")}>
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
                <FormField label={`Sous-titre (${locale})`} className="sm:col-span-2">
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
                    label={t("admin.homepageConfigurationPanel.visibleSurMobile")}
                    checked={section.mobileVisible}
                    onChange={(event) =>
                      replaceSection(section.key, (current) => ({
                        ...current,
                        mobileVisible: event.target.checked,
                      }))
                    }
                  />
                  <Checkbox
                    label={t("admin.homepageConfigurationPanel.visibleSurDesktop")}
                    checked={section.desktopVisible}
                    onChange={(event) =>
                      replaceSection(section.key, (current) => ({
                        ...current,
                        desktopVisible: event.target.checked,
                      }))
                    }
                  />
                </div>
                {section.type === "deals" ? (
                  <div className="space-y-3 rounded-control border border-primary-border bg-primary-light p-4 sm:col-span-2">
                    <h3 className="text-xs font-black uppercase tracking-wide text-primary">
                      {t("admin.homepageConfigurationPanel.reglesDEligibiliteDesOffres")}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label={t("admin.adminTrendingPage.modeDeSelection")}>
                        <Select
                          labelledByAncestor
                          value={section.settings.selectionMode || "hybrid"}
                          onChange={(event) =>
                            replaceSection(section.key, (current) => ({
                              ...current,
                              settings: {
                                ...current.settings,
                                selectionMode: event.target.value as (typeof HOMEPAGE_SELECTION_MODES)[number],
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
                          value={(section.settings.minimumDiscountBps || 0) / 100}
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
                      label={t("admin.homepageConfigurationPanel.inclureLesVendeursProfessionnels")}
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
                    <FormField label={t("admin.homepageConfigurationPanel.marchesAutorisesCodesSeparesParDesVirgules")}>
                      <Input
                        value={(section.settings.allowedMarkets || []).join(", ")}
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
                    <FormField label={t("admin.homepageConfigurationPanel.branchesTaxonomiquesAutoriseesSlugsSeparesParDesVirgules")}>
                      <Input
                        value={(section.settings.taxonomyBranches || []).join(", ")}
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
                    <FormField label={t("admin.homepageConfigurationPanel.annoncesManuellesEpingleesIdentifiantsSeparesParDesVirgules")}>
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
                            const retainedHidden = [...existing.values()].filter(
                              (item) => item.isHidden && !pinnedIds.includes(item.listingId),
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
                    <FormField label={t("admin.homepageConfigurationPanel.annoncesAMasquerIdentifiantsSeparesParDesVirgules")}>
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
                            const retainedPinned = [...existing.values()].filter(
                              (item) => item.isPinned && !hiddenIds.includes(item.listingId),
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
                        <h4 className="text-xs font-bold text-stone-700">
                          {t("admin.homepageConfigurationPanel.programmationDesOverridesDAnnonces")}
                        </h4>
                        {section.settings.offerOverrides?.map((override) => (
                          <div
                            key={override.listingId}
                            className="grid gap-2 rounded-control border border-stone-200 bg-bg-surface p-3 sm:grid-cols-3"
                          >
                            <div className="self-center truncate text-xs font-bold text-stone-700">
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
          <div className="rounded-control border border-stone-200 bg-bg-surface p-5 shadow-xs">
            <h2 className="text-sm font-black text-text-main">
              {t("admin.homepageConfigurationPanel.apercuDeLaPageComplete")}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              {t("admin.homepageConfigurationPanel.resolutionReelleDuBrouillonPour")} {marketCode}. Les sections en
              erreur restent isolées des autres.
            </p>
            <FormField label={t("admin.homepageConfigurationPanel.viewportDePrevisualisation")} className="mt-4">
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
                  section.trending?.topics.length ||
                  0;
                return (
                  <li
                    key={section.key}
                    className="rounded-control border border-stone-200 bg-stone-50 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-black text-text-disabled">
                        {position + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-text-main">
                          {section.title}
                        </div>
                        <div className="mt-0.5 text-xs text-stone-500">
                          {section.status}
                          {itemCount ? ` · ${itemCount} élément(s)` : ""}
                        </div>
                      </div>
                    </div>
                  </li>
                );
                })}
              {!preview ? (
                <li className="rounded-control border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
                  {t("admin.homepageConfigurationPanel.lancezLApercuPourResoudreLeContenu")}
                </li>
              ) : null}
            </ol>
          </div>
          <div className="rounded-control border border-stone-200 bg-bg-surface p-5 shadow-xs">
            <FormField label={t("admin.homepageConfigurationPanel.motifDeModificationPublication")}>
              <Textarea
                value={changeReason}
                minLength={HOMEPAGE_ADMIN_CONSTRAINTS.changeReason.minLength}
                maxLength={HOMEPAGE_ADMIN_CONSTRAINTS.changeReason.maxLength}
                onChange={(event) => setChangeReason(event.target.value)}
                placeholder={t("admin.homepageConfigurationPanel.expliquezLeChangementPourLHistoriqueDAudit")}
              />
            </FormField>
            <p className="mt-3 text-xs leading-relaxed text-stone-500">
              {t("admin.homepageConfigurationPanel.lesVersionsPublieesSontHistoriseesAvecLActeurLeMarche")}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
};
