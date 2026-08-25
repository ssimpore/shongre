import React, { useState, useMemo } from "react";
import {
  Sliders,
  ShieldAlert,
  RefreshCw,
  Plus,
  Info,
  Tag,
  Globe,
  FolderTree,
  Package,
  CreditCard,
  Handshake,
  Truck,
  Briefcase,
  Landmark,
  Rocket,
  Settings2,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { Button } from "../../design-system/primitives/Button";
import { Modal } from "../../design-system/primitives/Modal";
import { Badge } from "../../design-system/primitives/Badge";
import { ProgressBar } from "../../design-system/primitives/ProgressBar";
import { ConfirmModal } from "../../design-system/primitives/ConfirmModal";
import { marketService } from "../../domains/market/market.service";
import { MarketStatus } from "../../domains/market/market.types";
import { plural } from "../../utilities/formatters";
import {
  getTaxonomyLabel,
  taxonomyService,
} from "../../domains/taxonomy/taxonomy.service";
import { CategoryIcon } from "../../design-system/primitives/CategoryIcon";
import { useToast } from "../../app/providers/ToastProvider";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import {
  normalizeRecentSearchesLimit,
  normalizePriceFilterStops,
  RECENT_SEARCHES_LIMIT_DEFAULT,
  RECENT_SEARCHES_LIMIT_MAX,
  RECENT_SEARCHES_LIMIT_MIN,
} from "../../domains/market/market.constants";
import { labelIdentifier } from "../../utilities/identifier-label";
import { MARKET_CODE_LENGTH } from "@shongre/contracts";

type AdminTab = "overview" | "editor" | "matrix";
type DomainTab =
  | "general"
  | "localization"
  | "taxonomy"
  | "listings"
  | "payments"
  | "reservation"
  | "delivery"
  | "pro"
  | "taxes"
  | "monetization"
  | "features";

export const AdminMarketsPage: React.FC = () => {
  const { t } = useTranslation();
  const baselineMarket = marketService.getDefaultMarket();
  usePageMeta({
    title: t("meta.adminMarkets.title"),
    description: t("meta.adminMarkets.description"),
    canonicalPath: "/admin/marches",
    noIndex: true,
  });

  const { can, currentUser } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [selectedMarketCode, setSelectedMarketCode] = useState<string>(
    () =>
      marketService.getMarkets().find((market) => !market.isDefault)?.code ||
      baselineMarket.code,
  );
  const [activeDomainTab, setActiveDomainTab] = useState<DomainTab>("payments");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals state
  const [isAddMarketModalOpen, setIsAddMarketModalOpen] = useState(false);
  const [isEditOverrideModalOpen, setIsEditOverrideModalOpen] = useState(false);
  const [pendingResetMarketCode, setPendingResetMarketCode] = useState<
    string | null
  >(null);
  const [activeEditingPath, setActiveEditingPath] = useState<string | null>(
    null,
  );
  const [editingValueInput, setEditingValueInput] = useState<string>("");
  const [editingFieldLabel, setEditingFieldLabel] = useState<string>("");
  const [editingValueType, setEditingValueType] = useState<
    "string" | "number" | "boolean"
  >("string");

  // New market form state
  const [newMarketCode, setNewMarketCode] = useState("");
  const [newMarketName, setNewMarketName] = useState("");
  const [newMarketFlag, setNewMarketFlag] = useState("🌐");
  const [newMarketLocale, setNewMarketLocale] = useState(
    baselineMarket.defaultLocale,
  );
  const [newMarketCurrency, setNewMarketCurrency] = useState(
    baselineMarket.currency,
  );
  const [newMarketStatus, setNewMarketStatus] = useState<MarketStatus>("draft");

  const canManageMarkets = can("market.manage");
  const canConfigureMarkets = can("market.configure");

  // Load live markets
  const markets = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return marketService.getMarkets();
  }, [refreshTrigger]);

  const selectedMarket = useMemo(() => {
    return markets.find((m) => m.code === selectedMarketCode) || markets[0];
  }, [markets, selectedMarketCode]);

  const effectiveConfig = useMemo(() => {
    return marketService.getEffectiveConfig(selectedMarket.code);
  }, [selectedMarket, refreshTrigger]);

  const inheritanceMetrics = useMemo(() => {
    return marketService.getInheritanceMetrics(selectedMarket.code);
  }, [selectedMarket, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCreateMarket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarketCode || !newMarketName) return;

    try {
      const created = marketService.createMarket(
        {
          code: newMarketCode.toUpperCase().trim(),
          name: newMarketName.trim(),
          flag: newMarketFlag.trim(),
          defaultLocale: newMarketLocale.trim(),
          currency: newMarketCurrency.toUpperCase().trim(),
          status: newMarketStatus,
        },
        currentUser
          ? {
              id: currentUser.id,
              name: currentUser.name,
              role: currentUser.role,
            }
          : undefined,
      );

      setIsAddMarketModalOpen(false);
      setNewMarketCode("");
      setNewMarketName("");
      setSelectedMarketCode(created.code);
      setActiveTab("editor");
      handleRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleStatusChange = (code: string, newStatus: MarketStatus) => {
    try {
      marketService.updateMarketStatus(
        code,
        newStatus,
        currentUser
          ? {
              id: currentUser.id,
              name: currentUser.name,
              role: currentUser.role,
            }
          : undefined,
      );
      handleRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleResetOverride = (path: string) => {
    try {
      marketService.resetMarketOverride(
        selectedMarket.code,
        path,
        currentUser
          ? {
              id: currentUser.id,
              name: currentUser.name,
              role: currentUser.role,
            }
          : undefined,
      );
      handleRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleResetAllToFrance = (code: string) => {
    setPendingResetMarketCode(code);
  };

  const confirmResetAll = () => {
    if (!pendingResetMarketCode) return;
    try {
      marketService.resetAllOverridesToBaseline(
        pendingResetMarketCode,
        currentUser
          ? {
              id: currentUser.id,
              name: currentUser.name,
              role: currentUser.role,
            }
          : undefined,
      );
      setPendingResetMarketCode(null);
      handleRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const openEditOverride = (
    path: string,
    label: string,
    currentVal: any,
    type: "string" | "number" | "boolean",
  ) => {
    setActiveEditingPath(path);
    setEditingFieldLabel(label);
    setEditingValueType(type);
    setEditingValueInput(String(currentVal ?? ""));
    setIsEditOverrideModalOpen(true);
  };

  const handleSaveOverride = () => {
    if (!activeEditingPath) return;

    let parsedVal: any = editingValueInput;
    if (activeEditingPath === "search.priceFilterStopsMajor") {
      parsedVal = normalizePriceFilterStops(editingValueInput);
    } else if (editingValueType === "number") {
      parsedVal = Number(editingValueInput);
      if (activeEditingPath === "features.recentSearchesLimit") {
        parsedVal = normalizeRecentSearchesLimit(parsedVal);
      }
    } else if (editingValueType === "boolean") {
      parsedVal = editingValueInput === "true";
    }

    try {
      marketService.updateMarketOverride(
        selectedMarket.code,
        activeEditingPath,
        parsedVal,
        currentUser
          ? {
              id: currentUser.id,
              name: currentUser.name,
              role: currentUser.role,
            }
          : undefined,
      );
      setIsEditOverrideModalOpen(false);
      handleRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const renderStatusBadge = (status: MarketStatus) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Actif</Badge>;
      case "coming_soon":
        return (
          <Badge variant="warning">
            {t("admin.adminMarketsPage.bientotDisponible")}
          </Badge>
        );
      case "draft":
        return <Badge variant="neutral">Brouillon</Badge>;
      case "paused":
        return <Badge variant="urgent">En pause</Badge>;
      case "archived":
        return (
          <Badge variant="neutral">{t("admin.adminMarketsPage.archive")}</Badge>
        );
      default:
        return <Badge variant="neutral">{labelIdentifier(status)}</Badge>;
    }
  };

  /**
   * Helper to render an individual setting row with its provenance and override/reset buttons
   */
  const renderSettingRow = (
    path: string,
    label: string,
    description: string,
    type: "string" | "number" | "boolean" = "string",
    formatter?: (val: any) => string,
  ) => {
    const resolution = marketService.resolveSetting(selectedMarket.code, path);
    const isBaseline =
      selectedMarket.isDefault || selectedMarket.code === baselineMarket.code;
    const isOverridden = resolution.overrideDefined;
    const displayValue = formatter
      ? formatter(resolution.value)
      : String(resolution.value);
    const frenchRefDisplay = formatter
      ? formatter(resolution.baselineReferenceValue)
      : String(resolution.baselineReferenceValue);

    // If editing the baseline, calculate which markets inherit this setting.
    const impactedMarkets = isBaseline
      ? marketService.getImpactedMarkets(path)
      : [];

    return (
      <div className="py-3.5 px-4 rounded-xl border border-border-subtle bg-white hover:border-border-base transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-stone-900">{label}</span>
            <span className="text-micro font-mono text-stone-500">
              ({path})
            </span>

            {isBaseline ? (
              <span className="inline-flex items-center gap-1 text-micro bg-stone-100 text-stone-700 font-bold px-2 py-0.5 rounded-full border border-stone-200">
                Valeur canonique {baselineMarket.name}
              </span>
            ) : isOverridden ? (
              <span className="inline-flex items-center gap-1 text-micro bg-warning-surface text-warning font-bold px-2 py-0.5 rounded-full border border-warning-border">
                ✏️ Surcharge Locale ({selectedMarket.code})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-micro bg-success-surface text-success font-bold px-2 py-0.5 rounded-full border border-success-border">
                Hérité de {baselineMarket.name}
              </span>
            )}
          </div>
          <p className="text-micro text-stone-500">{description}</p>
        </div>

        {/* Value and Actions */}
        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          <div className="text-right">
            <div className="text-xs font-extrabold text-stone-900 font-mono">
              {displayValue}
            </div>
            {!isBaseline && !isOverridden && (
              <div className="text-micro text-stone-500">
                Identique à {baselineMarket.name}
              </div>
            )}
            {!isBaseline && isOverridden && (
              <div className="text-micro text-warning">
                ({baselineMarket.name} : {frenchRefDisplay})
              </div>
            )}
            {isBaseline && impactedMarkets.length > 0 && (
              <div className="text-micro text-info font-medium">
                Hérité par {impactedMarkets.join(", ")}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {canConfigureMarkets && (
              <Button
                variant="outline"
                size="sm"
                className="text-micro h-control-sm px-2.5"
                onClick={() =>
                  openEditOverride(path, label, resolution.value, type)
                }
              >
                {isBaseline
                  ? "Modifier"
                  : isOverridden
                    ? "Modifier"
                    : "Personnaliser"}
              </Button>
            )}

            {!isBaseline && isOverridden && canConfigureMarkets && (
              <Button
                variant="ghost"
                size="sm"
                className="text-micro h-control-sm px-2 text-stone-500 hover:text-danger hover:bg-danger-surface"
                title={t(
                  "admin.adminMarketsPage.supprimerLaSurchargeEtReactiver",
                )}
                onClick={() => handleResetOverride(path)}
              >
                <RefreshCw className="w-3 h-3 text-stone-400 mr-1" />
                Réinitialiser sur {baselineMarket.name}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-base pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900">
              {t("admin.adminMarketsPage.gestionMultiMarchesTerritoires")}
            </h1>
            <span className="text-xs bg-primary-light text-primary font-bold px-2 py-0.5 rounded-full">
              Architecture Canonique FR
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {t("admin.adminMarketsPage.gerezLesPaysActivesDevises")}
            <strong>
              {" "}
              {t("admin.adminMarketsPage.franceFrEstLeMarche")}
            </strong>{" "}
            dont héritent automatiquement toutes les valeurs non surchargées.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageMarkets && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddMarketModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              <span>{t("admin.adminMarketsPage.ajouterUnMarche")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-border-base overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          Vue d'ensemble ({plural(markets.length, "marché")})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("editor")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "editor"
              ? "border-primary text-primary"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <Settings2
            className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5"
            aria-hidden="true"
          />
          Éditeur d'Héritage & Surcharges ({selectedMarket.name})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("matrix")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "matrix"
              ? "border-primary text-primary"
              : "border-transparent text-stone-500 hover:text-stone-900"
          }`}
        >
          <BarChart3
            className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5"
            aria-hidden="true"
          />
          Matrice Comparative Multi-Pays
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-fast">
          {/* Informational Banner */}
          <div className="p-4 rounded-2xl bg-warning-surface/80 border border-warning-border/80 flex items-start gap-3">
            <Info className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="text-xs text-warning space-y-1">
              <span className="font-bold">
                {t("admin.adminMarketsPage.moteurDHeritageHierarchiqueEn")}
              </span>
              <p>
                {t(
                  "admin.adminMarketsPage.chaqueParametreNonExplicitementConfigure",
                )}
              </p>
            </div>
          </div>

          {/* Markets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {markets.map((m) => {
              const metrics = marketService.getInheritanceMetrics(m.code);
              const isDefault = m.isDefault || m.code === baselineMarket.code;

              return (
                <div
                  key={m.code}
                  className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                    isDefault
                      ? "border-primary/50 bg-gradient-to-b from-white to-primary-light/10 shadow-sm"
                      : "border-border-base bg-white hover:border-border-hover"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl shrink-0">{m.flag}</span>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-stone-900 flex items-center gap-1.5 min-w-0">
                            <span className="truncate">{m.name}</span>
                            <span className="font-mono text-xs text-stone-500 shrink-0">
                              ({m.code})
                            </span>
                          </div>
                          <div className="text-micro text-stone-500 font-medium truncate">
                            {m.currency} ({m.currencySymbol}) •{" "}
                            {m.defaultLocale}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0">
                        {renderStatusBadge(m.status)}
                      </span>
                    </div>

                    {/* Inheritance Metrics Bar */}
                    <div className="space-y-1 pt-2 border-t border-border-subtle">
                      <div className="flex justify-between text-micro font-bold">
                        {isDefault ? (
                          <span className="text-primary">
                            {t(
                              "admin.adminMarketsPage.marcheSourceCanonique100",
                            )}
                          </span>
                        ) : (
                          <>
                            <span className="text-success">
                              {metrics.percentInherited}% hérité de{" "}
                              {baselineMarket.name}
                            </span>
                            <span className="text-warning">
                              {metrics.percentOverridden}% personnalisé
                            </span>
                          </>
                        )}
                      </div>
                      <ProgressBar
                        value={isDefault ? 100 : metrics.percentInherited}
                        label={
                          isDefault
                            ? "Marché canonique"
                            : `Part héritée de ${baselineMarket.name}`
                        }
                        variant={isDefault ? "primary" : "success"}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-4 border-t border-border-subtle flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      aria-label={`Configurer le marché ${m.name}`}
                      onClick={() => {
                        setSelectedMarketCode(m.code);
                        setActiveTab("editor");
                      }}
                    >
                      <Sliders className="w-3.5 h-3.5 mr-1 text-primary" />
                      Configurer
                    </Button>

                    {/* Quick status toggle for non-default */}
                    {!isDefault && canManageMarkets && (
                      <select
                        aria-label={`Statut du marché ${m.name}`}
                        value={m.status}
                        onChange={(e) =>
                          handleStatusChange(
                            m.code,
                            e.target.value as MarketStatus,
                          )
                        }
                        className="text-micro bg-bg-base border border-border-base rounded-control px-2 py-1 font-semibold text-stone-700 focus:outline-none h-control-touch"
                      >
                        <option value="active">Actif</option>
                        <option value="coming_soon">
                          {t("admin.adminMarketsPage.bientot")}
                        </option>
                        <option value="paused">En pause</option>
                        <option value="draft">Brouillon</option>
                        <option value="archived">
                          {t("admin.adminMarketsPage.archive")}
                        </option>
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: INHERITANCE & OVERRIDE EDITOR */}
      {activeTab === "editor" && (
        <div className="space-y-6 animate-in fade-in duration-fast">
          {/* Market Picker Selector for Editor */}
          <div className="p-4 rounded-2xl bg-white border border-border-base flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedMarket.flag}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-stone-900">
                    Configuration de {selectedMarket.name} (
                    {selectedMarket.code})
                  </h2>
                  {renderStatusBadge(selectedMarket.status)}
                  {selectedMarket.isDefault && (
                    <span className="text-micro bg-primary-light text-primary font-bold px-2 py-0.5 rounded-full">
                      {t("admin.adminMarketsPage.referenceCanonique")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500">
                  {selectedMarket.isDefault
                    ? "Toutes les modifications sur ce marché constituent la base de référence pour l'ensemble des pays."
                    : `${inheritanceMetrics.percentInherited}% hérité de ${baselineMarket.name} • ${inheritanceMetrics.percentOverridden}% surchargé localement`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-500">
                {t("admin.adminMarketsPage.selectionnerUnMarche")}
              </span>
              <select
                value={selectedMarketCode}
                onChange={(e) => setSelectedMarketCode(e.target.value)}
                className="bg-stone-50 border border-border-base rounded-control px-3 py-1.5 text-xs font-bold text-stone-900 focus:outline-none h-control-touch"
              >
                {markets.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.flag} {m.name} ({m.code})
                  </option>
                ))}
              </select>

              {!selectedMarket.isDefault && canConfigureMarkets && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-stone-600 hover:text-danger"
                  onClick={() => handleResetAllToFrance(selectedMarket.code)}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Tout réinitialiser sur {baselineMarket.name}
                </Button>
              )}
            </div>
          </div>

          {/* Canonical market warning */}
          {selectedMarket.isDefault && (
            <div className="p-4 rounded-2xl bg-info-surface border border-info-border flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-info shrink-0 mt-0.5" />
              <div className="text-xs text-info space-y-1">
                <span className="font-bold">
                  Avertissement d'impact global :
                </span>
                <p>
                  Vous éditez actuellement la{" "}
                  <strong>configuration canonique {baselineMarket.name}</strong>
                  . Toute modification de valeur sur cette page se propagera
                  automatiquement et instantanément à tous les marchés
                  dépendants (Belgique, Espagne, Suisse, etc.) qui n'ont pas
                  défini de surcharge explicite sur le paramètre concerné.
                </p>
              </div>
            </div>
          )}

          {/* Domain Subtabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border-subtle">
            {[
              { id: "general", label: "Général", Icon: Tag },
              { id: "localization", label: "Localisation", Icon: Globe },
              {
                id: "taxonomy",
                label: "Taxonomie & Catégories",
                Icon: FolderTree,
              },
              { id: "listings", label: "Annonces", Icon: Package },
              {
                id: "payments",
                label: "Paiements & Versements",
                Icon: CreditCard,
              },
              { id: "reservation", label: "Réservation", Icon: Handshake },
              { id: "delivery", label: "Livraison", Icon: Truck },
              { id: "pro", label: "Professionnels", Icon: Briefcase },
              { id: "taxes", label: "Fiscalité & TVA", Icon: Landmark },
              { id: "monetization", label: "Monétisation", Icon: Rocket },
              { id: "features", label: "Fonctionnalités", Icon: Settings2 },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDomainTab(tab.id as DomainTab)}
                aria-current={activeDomainTab === tab.id ? "true" : undefined}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  activeDomainTab === tab.id
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                <tab.Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* DOMAIN CONFIGURATION CONTENT */}
          <div className="space-y-3">
            {activeDomainTab === "general" && (
              <>
                {renderSettingRow(
                  "general.name",
                  "Nom du Marché",
                  "Nom public affiché aux utilisateurs",
                )}
                {renderSettingRow(
                  "general.tagline",
                  "Slogan du Marché",
                  "Accroche commerciale pour ce pays",
                )}
                {renderSettingRow(
                  "general.supportEmail",
                  "Email du Support",
                  "Adresse email dédiée au service client local",
                )}
                {renderSettingRow(
                  "general.supportPhone",
                  "Téléphone Support",
                  "Numéro de téléphone d'assistance locale",
                )}
                {renderSettingRow(
                  "general.launchState",
                  "Mode de Déploiement",
                  "National complet ou villes ciblées uniquement",
                )}
              </>
            )}

            {activeDomainTab === "localization" && (
              <>
                {renderSettingRow(
                  "localization.defaultLocale",
                  "Locale par Défaut",
                  "Format des dates et nombres (ex: fr-FR, fr-BE, es-ES)",
                )}
                {renderSettingRow(
                  "localization.defaultCurrency",
                  "Devise Standard",
                  "Code ISO de la devise (ex: EUR, CHF)",
                )}
                {renderSettingRow(
                  "localization.currencySymbol",
                  "Symbole Devise",
                  `Symbole monétaire (ex. ${markets
                    .map((market) => market.currencySymbol)
                    .filter(
                      (symbol, index, all) => all.indexOf(symbol) === index,
                    )
                    .slice(0, 2)
                    .join(", ")})`,
                )}
                {renderSettingRow(
                  "localization.timezone",
                  "Fuseau Horaire",
                  `Identifiant IANA (ex: ${baselineMarket.timezone})`,
                )}
                {renderSettingRow(
                  "localization.phonePrefix",
                  "Préfixe Téléphonique",
                  "Indicatif international (ex: +33, +32, +34, +41)",
                )}
                {renderSettingRow(
                  "localization.phonePlaceholder",
                  "Exemple Numéro Téléphone",
                  "Format d'aide affiché dans les formulaires",
                )}
                {renderSettingRow(
                  "localization.postalCodePlaceholder",
                  "Exemple Code Postal",
                  "Format d'aide dans le champ ville",
                )}
                {renderSettingRow(
                  "localization.postalCodeRegex",
                  "Regex Code Postal",
                  "Expression régulière validant les codes postaux",
                )}
              </>
            )}

            {activeDomainTab === "taxonomy" && (
              <div className="space-y-4">
                <div className="p-4 bg-warning-surface/70 border border-warning-border rounded-2xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div className="text-xs text-warning space-y-1">
                    <span className="font-bold">
                      {t(
                        "admin.adminMarketsPage.gestionDesCategoriesParMarche",
                      )}
                    </span>
                    <p>
                      Par défaut, tous les marchés héritent des catégories de la
                      {baselineMarket.name}. Vous pouvez activer ou désactiver
                      spécifiquement des catégories ou sous-catégories pour{" "}
                      {selectedMarket.name} ({selectedMarket.code}).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {taxonomyService.getRootCategories().map((rootCat) => {
                    const isRootEnabled =
                      marketService.isCategoryEnabledInMarket(
                        selectedMarket.code,
                        rootCat.slug,
                      );

                    return (
                      <div
                        key={rootCat.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isRootEnabled
                            ? "bg-white border-border-base shadow-xs"
                            : "bg-stone-50/80 border-stone-200 opacity-75"
                        }`}
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                          <div className="flex items-center gap-2.5">
                            <CategoryIcon
                              iconName={rootCat.iconName || "tag"}
                              className="w-5 h-5 text-primary"
                            />
                            <div>
                              <div className="text-xs font-bold text-stone-900">
                                {getTaxonomyLabel(rootCat, "compact")}
                              </div>
                              <div className="text-micro text-stone-500">
                                Slug: {rootCat.slug}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-micro font-bold px-2 py-0.5 rounded-full ${
                                isRootEnabled
                                  ? "bg-success-surface text-success"
                                  : "bg-stone-200 text-stone-700"
                              }`}
                            >
                              {isRootEnabled ? "Ouverte" : "Fermée"}
                            </span>

                            {canConfigureMarkets && (
                              <button
                                type="button"
                                onClick={() => {
                                  marketService.setCategoryEnabledInMarket(
                                    selectedMarket.code,
                                    rootCat.slug,
                                    !isRootEnabled,
                                    false,
                                    currentUser ?? undefined,
                                  );
                                  setRefreshTrigger((prev) => prev + 1);
                                  toast.success(
                                    `Catégorie [${getTaxonomyLabel(rootCat, "compact")}] ${!isRootEnabled ? "ouverte" : "désactivée"} sur ${selectedMarket.name}.`,
                                  );
                                }}
                                className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                                  isRootEnabled
                                    ? "border-danger-border text-danger hover:bg-danger-surface"
                                    : "border-success-border text-success hover:bg-success-surface"
                                }`}
                              >
                                {isRootEnabled ? "Désactiver" : "Activer"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Subcategories list */}
                        {rootCat.children && rootCat.children.length > 0 && (
                          <div className="pt-3 space-y-1.5">
                            <div className="text-micro font-bold text-stone-500 uppercase tracking-wider">
                              Sous-catégories ({rootCat.children.length})
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {rootCat.children.map((sub) => {
                                const isSubEnabled =
                                  isRootEnabled &&
                                  marketService.isCategoryEnabledInMarket(
                                    selectedMarket.code,
                                    sub.slug,
                                  );
                                return (
                                  <div
                                    key={sub.id}
                                    className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                                      isSubEnabled
                                        ? "bg-bg-base/40 border-border-subtle text-stone-800"
                                        : "bg-stone-100 border-stone-200 text-stone-500 line-through"
                                    }`}
                                  >
                                    <span className="truncate pr-1 font-medium">
                                      {getTaxonomyLabel(sub, "compact")}
                                    </span>
                                    {canConfigureMarkets && isRootEnabled && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          marketService.setCategoryEnabledInMarket(
                                            selectedMarket.code,
                                            sub.slug,
                                            !isSubEnabled,
                                            true,
                                            currentUser ?? undefined,
                                          );
                                          setRefreshTrigger((prev) => prev + 1);
                                          toast.success(
                                            `Sous-catégorie [${getTaxonomyLabel(sub, "compact")}] ${!isSubEnabled ? "ouverte" : "désactivée"} sur ${selectedMarket.name}.`,
                                          );
                                        }}
                                        className="text-micro font-bold text-primary hover:underline ml-1"
                                      >
                                        {isSubEnabled ? "Fermer" : "Ouvrir"}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeDomainTab === "listings" && (
              <>
                {renderSettingRow(
                  "listings.maxActiveListingsIndividual",
                  "Annonces Max (Particulier)",
                  "Nombre max d'annonces actives simultanées",
                  "number",
                )}
                {renderSettingRow(
                  "listings.maxPhotosIndividual",
                  "Photos Max (Particulier)",
                  "Nombre maximum de photos par annonce",
                  "number",
                )}
                {renderSettingRow(
                  "listings.maxPhotosPro",
                  "Photos Max (Professionnel)",
                  "Nombre de photos autorisées pour les comptes Pro",
                  "number",
                )}
                {renderSettingRow(
                  "listings.expirationDays",
                  "Durée de Validité (Jours)",
                  "Délai avant expiration automatique d'une annonce",
                  "number",
                )}
                {renderSettingRow(
                  "listings.allowFreeDonations",
                  "Autoriser les Dons / Gratuit",
                  `Permet la publication d'annonces à 0 ${effectiveConfig.localization.currencySymbol}`,
                  "boolean",
                  (v) => (v ? "Activé (Oui)" : "Désactivé (Non)"),
                )}
                {renderSettingRow(
                  "listings.allowPriceNegotiation",
                  "Négociation de Prix",
                  "Permet aux acheteurs de faire des propositions d'offres",
                  "boolean",
                  (v) => (v ? "Activé (Oui)" : "Désactivé (Non)"),
                )}
                {renderSettingRow(
                  "listings.allowInstantBuy",
                  "Achat Immédiat Direct",
                  "Permet le paiement sans validation préalable du vendeur",
                  "boolean",
                  (v) => (v ? "Activé (Oui)" : "Désactivé (Non)"),
                )}
                {renderSettingRow(
                  "search.priceFilterStopsMajor",
                  "Paliers du filtre de prix",
                  "Montants en unité majeure, séparés par des virgules et hérités par marché",
                  "string",
                  (value) => normalizePriceFilterStops(value).join(", "),
                )}
              </>
            )}

            {activeDomainTab === "payments" && (
              <>
                {renderSettingRow(
                  "payments.enabled",
                  "Paiement Sécurisé Marketplace",
                  "Active la passerelle de paiement sur ce marché",
                  "boolean",
                  (v) => (v ? "Activé (Oui)" : "Désactivé (Non)"),
                )}
                {renderSettingRow(
                  "payments.provider",
                  "Passerelle de paiement",
                  "Fournisseur tiers (ex: stripe_connect)",
                )}
                {renderSettingRow(
                  "payments.buyerProtectionFeePercent",
                  "Taux Protection Acheteur (%)",
                  "Pourcentage appliqué sur le prix de l'article",
                  "number",
                  (v) => `${(v * 100).toFixed(1)} %`,
                )}
                {renderSettingRow(
                  "payments.buyerProtectionFixedFee",
                  "Frais Fixes Protection Acheteur",
                  "Frais fixes en devise locale par transaction",
                  "number",
                  (v) =>
                    `${v.toFixed(2)} ${effectiveConfig.localization.currencySymbol}`,
                )}
                {renderSettingRow(
                  "payments.minTransactionAmount",
                  "Montant Minimum Transaction",
                  "Montant minimal en devise locale",
                  "number",
                  (v) => `${v} ${effectiveConfig.localization.currencySymbol}`,
                )}
                {renderSettingRow(
                  "payments.maxTransactionAmount",
                  "Montant Maximum Transaction",
                  "Plafond maximal en devise locale",
                  "number",
                  (v) => `${v} ${effectiveConfig.localization.currencySymbol}`,
                )}
              </>
            )}

            {activeDomainTab === "reservation" && (
              <>
                {renderSettingRow(
                  "reservation.enabled",
                  "Réservation d'Annonce",
                  "Permet de réserver une annonce avec paiement en ligne",
                  "boolean",
                  (v) => (v ? "Activé (Oui)" : "Désactivé (Non)"),
                )}
                {renderSettingRow(
                  "reservation.sellerConfirmationTimeoutHours",
                  "Délai Confirmation Vendeur (Heures)",
                  "Temps alloué au vendeur pour accepter la réservation",
                  "number",
                  (v) => `${v} heures`,
                )}
                {renderSettingRow(
                  "reservation.buyerInspectionTimeoutHours",
                  "Délai Inspection Acheteur (Heures)",
                  "Temps alloué à l'acheteur après réception pour valider ou contester",
                  "number",
                  (v) => `${v} heures`,
                )}
                {renderSettingRow(
                  "reservation.requirePinForHandDelivery",
                  "Code PIN Remise en Main Propre",
                  "Code OTP à 6 chiffres pour sécuriser la remise physique",
                  "boolean",
                  (v) => (v ? "Requis (Oui)" : "Facultatif (Non)"),
                )}
              </>
            )}

            {activeDomainTab === "delivery" && (
              <>
                {renderSettingRow(
                  "delivery.enabled",
                  "Livraison Activée",
                  "Active les options de transport et d'expédition",
                  "boolean",
                  (v) => (v ? "Activé" : "Désactivé"),
                )}
                {renderSettingRow(
                  "delivery.handDeliveryEnabled",
                  "Remise en Main Propre",
                  "Autorise la remise physique sans transporteur",
                  "boolean",
                  (v) => (v ? "Activé" : "Désactivé"),
                )}
                {renderSettingRow(
                  "delivery.carriers.mondialRelay.enabled",
                  "Mondial Relay (Point Relais)",
                  "Transporteur relais standard",
                  "boolean",
                  (v) => (v ? "Activé" : "Désactivé"),
                )}
                {renderSettingRow(
                  "delivery.carriers.mondialRelay.defaultFee",
                  "Tarif Moyen Mondial Relay",
                  "Estimation tarifaire par défaut",
                  "number",
                  (v) =>
                    `${v.toFixed(2)} ${effectiveConfig.localization.currencySymbol}`,
                )}
                {renderSettingRow(
                  "delivery.carriers.colissimo.enabled",
                  "Colissimo (Domicile)",
                  "Livraison standard à domicile",
                  "boolean",
                  (v) => (v ? "Activé" : "Désactivé"),
                )}
                {renderSettingRow(
                  "delivery.carriers.colissimo.defaultFee",
                  "Tarif Moyen Colissimo",
                  "Estimation tarifaire par défaut",
                  "number",
                  (v) =>
                    `${v.toFixed(2)} ${effectiveConfig.localization.currencySymbol}`,
                )}
                {renderSettingRow(
                  "delivery.carriers.chronopost.enabled",
                  "Chronopost Express 24h",
                  "Livraison express prioritaire",
                  "boolean",
                  (v) => (v ? "Activé" : "Désactivé"),
                )}
                {renderSettingRow(
                  "delivery.carriers.chronopost.defaultFee",
                  "Tarif Moyen Chronopost",
                  "Estimation tarifaire par défaut",
                  "number",
                  (v) =>
                    `${v.toFixed(2)} ${effectiveConfig.localization.currencySymbol}`,
                )}
              </>
            )}

            {activeDomainTab === "pro" && (
              <>
                {renderSettingRow(
                  "pro.businessIdentifierLabel",
                  "Libellé Identifiant Entreprise",
                  "Intitulé légal (SIRET en FR, BCE en BE, NIF en ES, IDE en CH)",
                )}
                {renderSettingRow(
                  "pro.businessIdentifierHelper",
                  "Aide à la Saisie Identifiant",
                  "Texte explicatif pour les pros lors de l'inscription",
                )}
                {renderSettingRow(
                  "pro.businessIdentifierRegex",
                  "Regex Validation Identifiant",
                  "Expression régulière contrôlant le format",
                )}
                {renderSettingRow(
                  "pro.businessIdentifierFormatPlaceholder",
                  "Placeholder Identifiant",
                  "Exemple affiché dans le champ de saisie",
                )}
                {renderSettingRow(
                  "pro.vatNumberFormatPlaceholder",
                  "Format Numéro de TVA",
                  "Exemple de numéro de TVA intracommunautaire",
                )}
                {renderSettingRow(
                  "pro.vatNumberRegex",
                  "Regex Numéro de TVA",
                  "Expression de contrôle du numéro de TVA",
                )}
                {renderSettingRow(
                  "pro.requireKbis",
                  "Justificatif d'Immatriculation Requis",
                  "Exige un Kbis, attestation BCE ou équivalent",
                  "boolean",
                  (v) => (v ? "Requis" : "Optionnel"),
                )}
              </>
            )}

            {activeDomainTab === "taxes" && (
              <>
                {renderSettingRow(
                  "taxes.taxEnabled",
                  "Gestion Fiscale Activée",
                  "Active le calcul et l'affichage de la TVA",
                  "boolean",
                  (v) => (v ? "Activé" : "Désactivé"),
                )}
                {renderSettingRow(
                  "taxes.vatRateStandard",
                  "Taux de TVA Standard",
                  "Taux légal normal (20% FR, 21% BE/ES, 8.1% CH)",
                  "number",
                  (v) => `${(v * 100).toFixed(1)} %`,
                )}
                {renderSettingRow(
                  "taxes.pricesTaxInclusive",
                  "Prix Affichés TTC",
                  "Tous les prix sont affichés toutes taxes comprises",
                  "boolean",
                  (v) => (v ? "TTC" : "HT"),
                )}
              </>
            )}

            {activeDomainTab === "monetization" && (
              <>
                {renderSettingRow(
                  "monetization.payoutInstantFeePercent",
                  "Taux Virement Instantané (%)",
                  "Frais variables pour virement bancaire instantané",
                  "number",
                  (v) => `${(v * 100).toFixed(1)} %`,
                )}
                {renderSettingRow(
                  "monetization.payoutInstantFixedFee",
                  "Frais Fixes Virement Instantané",
                  "Frais fixes pour virement bancaire rapide",
                  "number",
                  (v) =>
                    `${v.toFixed(2)} ${effectiveConfig.localization.currencySymbol}`,
                )}
                {renderSettingRow(
                  "monetization.boostPricing.urgent",
                  "Pack Boost Urgent",
                  "Prix de l'option logo urgent 7 jours",
                  "number",
                  (v) =>
                    `${v.toFixed(2)} ${effectiveConfig.localization.currencySymbol}`,
                )}
                {renderSettingRow(
                  "monetization.boostPricing.highlight",
                  "Pack Boost En Vedette",
                  "Prix de l'option encadré coloré",
                  "number",
                  (v) =>
                    `${v.toFixed(2)} ${effectiveConfig.localization.currencySymbol}`,
                )}
                {renderSettingRow(
                  "monetization.boostPricing.top_of_list",
                  "Pack Boost Remontée en Tête",
                  "Prix de l'option tête de liste quotidienne",
                  "number",
                  (v) =>
                    `${v.toFixed(2)} ${effectiveConfig.localization.currencySymbol}`,
                )}
              </>
            )}

            {activeDomainTab === "features" && (
              <>
                {renderSettingRow(
                  "features.reviewsEnabled",
                  "Système d'Avis & Évaluations",
                  "Permet aux utilisateurs de se noter",
                  "boolean",
                  (v) => (v ? "Activé" : "Désactivé"),
                )}
                {renderSettingRow(
                  "features.aiAssistantEnabled",
                  "Assistant IA Gemini",
                  "Active la génération de descriptions et filtres IA",
                  "boolean",
                  (v) => (v ? "Activé" : "Désactivé"),
                )}
                {renderSettingRow(
                  "features.aiSafetyAuditEnabled",
                  "Audit Sécurité & Anti-Fraude IA",
                  "Modération automatique préventive",
                  "boolean",
                  (v) => (v ? "Activé" : "Désactivé"),
                )}
                {renderSettingRow(
                  "features.savedSearchesEnabled",
                  "Recherches Sauvegardées & Alertes",
                  "Notifications email/push sur nouveaux objets",
                  "boolean",
                  (v) => (v ? "Activé" : "Désactivé"),
                )}
                {renderSettingRow(
                  "features.recentSearchesLimit",
                  "Recherches récentes affichées",
                  `Nombre de recherches visibles sur l'accueil (de ${RECENT_SEARCHES_LIMIT_MIN} à ${RECENT_SEARCHES_LIMIT_MAX}, ${RECENT_SEARCHES_LIMIT_DEFAULT} par défaut)`,
                  "number",
                  (v) => {
                    const limit = normalizeRecentSearchesLimit(v);
                    return `${limit} recherche${limit > 1 ? "s" : ""}`;
                  },
                )}
                {renderSettingRow(
                  "features.proStorefrontsEnabled",
                  "Boutiques Pros Personnalisées",
                  "Pages vitrines dédiées avec bannière",
                  "boolean",
                  (v) => (v ? "Activé" : "Désactivé"),
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: COMPARATIVE MATRIX */}
      {activeTab === "matrix" && (
        <div className="space-y-6 animate-in fade-in duration-fast">
          <div className="p-4 rounded-2xl bg-white border border-border-base overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-base bg-stone-50">
                  <th scope="col" className="p-3 font-bold text-stone-900">
                    {t("admin.adminMarketsPage.parametreRegle")}
                  </th>
                  {markets.map((m) => (
                    <th
                      scope="col"
                      key={m.code}
                      className="p-3 font-bold text-stone-900 min-w-40"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{m.flag}</span>
                        <span>{m.name}</span>
                        {m.isDefault && (
                          <span className="text-micro bg-primary-light text-primary px-1.5 py-0.2 rounded font-bold">
                            Source
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                <tr>
                  <td className="p-3 font-bold text-stone-700">
                    {t("admin.adminMarketsPage.statutDuMarche")}
                  </td>
                  {markets.map((m) => (
                    <td key={m.code} className="p-3">
                      {renderStatusBadge(m.status)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-bold text-stone-700">
                    Devise & Symbole
                  </td>
                  {markets.map((m) => {
                    const cfg = marketService.getEffectiveConfig(m.code);
                    const res = marketService.resolveSetting(
                      m.code,
                      "localization.defaultCurrency",
                    );
                    return (
                      <td key={m.code} className="p-3">
                        <div className="font-mono font-bold text-stone-900">
                          {cfg.localization.defaultCurrency} (
                          {cfg.localization.currencySymbol})
                        </div>
                        {res.overrideDefined && (
                          <span className="text-micro text-warning font-bold">
                            {t("admin.adminMarketsPage.surcharge")}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="p-3 font-bold text-stone-700">
                    {t("admin.adminMarketsPage.tauxDeTvaStandard")}
                  </td>
                  {markets.map((m) => {
                    const cfg = marketService.getEffectiveConfig(m.code);
                    const res = marketService.resolveSetting(
                      m.code,
                      "taxes.vatRateStandard",
                    );
                    return (
                      <td key={m.code} className="p-3">
                        <div className="font-mono font-bold text-stone-900">
                          {(cfg.taxes.vatRateStandard * 100).toFixed(1)} %
                        </div>
                        {res.overrideDefined && (
                          <span className="text-micro text-warning font-bold">
                            {t("admin.adminMarketsPage.surcharge")}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="p-3 font-bold text-stone-700">
                    {t("admin.adminMarketsPage.fraisProtectionAcheteur")}
                  </td>
                  {markets.map((m) => {
                    const cfg = marketService.getEffectiveConfig(m.code);
                    const res = marketService.resolveSetting(
                      m.code,
                      "payments.buyerProtectionFixedFee",
                    );
                    return (
                      <td key={m.code} className="p-3">
                        <div className="font-mono font-bold text-stone-900">
                          {cfg.payments.buyerProtectionFixedFee.toFixed(2)}{" "}
                          {cfg.localization.currencySymbol} +{" "}
                          {(
                            cfg.payments.buyerProtectionFeePercent * 100
                          ).toFixed(1)}
                          %
                        </div>
                        {res.overrideDefined && (
                          <span className="text-micro text-warning font-bold">
                            {t("admin.adminMarketsPage.surcharge")}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="p-3 font-bold text-stone-700">
                    Identifiant Entreprise (Pro)
                  </td>
                  {markets.map((m) => {
                    const cfg = marketService.getEffectiveConfig(m.code);
                    const res = marketService.resolveSetting(
                      m.code,
                      "pro.businessIdentifierLabel",
                    );
                    return (
                      <td key={m.code} className="p-3">
                        <div className="font-semibold text-stone-900">
                          {cfg.pro.businessIdentifierLabel}
                        </div>
                        {res.overrideDefined && (
                          <span className="text-micro text-warning font-bold">
                            {t("admin.adminMarketsPage.surcharge")}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="p-3 font-bold text-stone-700">
                    {t("admin.adminMarketsPage.reservationAvecSequestre")}
                  </td>
                  {markets.map((m) => {
                    const cfg = marketService.getEffectiveConfig(m.code);
                    const res = marketService.resolveSetting(
                      m.code,
                      "reservation.enabled",
                    );
                    return (
                      <td key={m.code} className="p-3">
                        <span
                          className={`font-bold ${cfg.reservation.enabled ? "text-success" : "text-stone-500"}`}
                        >
                          {cfg.reservation.enabled
                            ? "✓ Activée"
                            : "✗ Désactivée"}
                        </span>
                        {res.overrideDefined && (
                          <span className="block text-micro text-warning font-bold">
                            ✏️ Surchargé ({String(res.value)})
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW MARKET */}
      <Modal
        isOpen={isAddMarketModalOpen}
        onClose={() => setIsAddMarketModalOpen(false)}
        title={t("admin.adminMarketsPage.ajouterUnNouveauMarchePays")}
        description={t("admin.adminMarketsPage.creezUnNouveauPaysQui")}
        maxWidth="md"
      >
        <form onSubmit={handleCreateMarket} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase">
                Code ISO Pays (2 lettres)
              </label>
              <input
                type="text"
                required
                minLength={MARKET_CODE_LENGTH}
                maxLength={MARKET_CODE_LENGTH}
                placeholder={t("admin.adminMarketsPage.exItPtDeUk")}
                value={newMarketCode}
                onChange={(e) => setNewMarketCode(e.target.value.toUpperCase())}
                className="w-full h-control-md px-3 text-xs uppercase font-mono font-bold bg-bg-base border border-border-base rounded-control focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase">
                Drapeau (Emoji)
              </label>
              <input
                type="text"
                required
                placeholder="ex: 🇮🇹, 🇵🇹, 🇩🇪"
                value={newMarketFlag}
                onChange={(e) => setNewMarketFlag(e.target.value)}
                className="w-full h-control-md px-3 text-sm bg-bg-base border border-border-base rounded-control focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 uppercase">
              {t("admin.adminMarketsPage.nomDuMarche")}
            </label>
            <input
              type="text"
              required
              placeholder="ex: Italie, Portugal, Allemagne"
              value={newMarketName}
              onChange={(e) => setNewMarketName(e.target.value)}
              className="w-full h-control-md px-3 text-xs bg-bg-base border border-border-base rounded-control focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase">
                {t("admin.adminMarketsPage.localeParDefaut")}
              </label>
              <input
                type="text"
                required
                placeholder={t("admin.adminMarketsPage.exItItPtPt")}
                value={newMarketLocale}
                onChange={(e) => setNewMarketLocale(e.target.value)}
                className="w-full h-control-md px-3 text-xs font-mono bg-bg-base border border-border-base rounded-control focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 uppercase">
                Devise
              </label>
              <input
                type="text"
                required
                placeholder="ex: EUR, CHF, GBP"
                value={newMarketCurrency}
                onChange={(e) =>
                  setNewMarketCurrency(e.target.value.toUpperCase())
                }
                className="w-full h-control-md px-3 text-xs font-mono font-bold bg-bg-base border border-border-base rounded-control focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-700 uppercase">
              Statut Initial
            </label>
            <select
              value={newMarketStatus}
              onChange={(e) =>
                setNewMarketStatus(e.target.value as MarketStatus)
              }
              className="w-full h-control-md px-3 text-xs bg-bg-base border border-border-base rounded-control focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none font-semibold"
            >
              <option value="draft">Brouillon (Non visible)</option>
              <option value="coming_soon">
                {t("admin.adminMarketsPage.bientotDisponibleVitrine")}
              </option>
              <option value="active">
                {t("admin.adminMarketsPage.actifOperationnel")}
              </option>
              <option value="paused">En pause</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsAddMarketModalOpen(false)}
            >
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Créer avec héritage {baselineMarket.name}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: EDIT OVERRIDE */}
      <Modal
        isOpen={isEditOverrideModalOpen}
        onClose={() => setIsEditOverrideModalOpen(false)}
        title={`Personnaliser : ${editingFieldLabel}`}
        description={`Définissez une surcharge locale explicite pour le marché [${selectedMarket.name}].`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="admin-edit-override-value"
              className="text-xs font-bold text-stone-700 uppercase"
            >
              Nouvelle Valeur pour {selectedMarket.name}
            </label>

            {editingValueType === "boolean" ? (
              <select
                value={editingValueInput}
                onChange={(e) => setEditingValueInput(e.target.value)}
                className="w-full h-control-md px-3 text-xs font-bold bg-bg-base border border-border-base rounded-control focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              >
                <option value="true">
                  {t("admin.adminMarketsPage.activeTrue")}
                </option>
                <option value="false">
                  {t("admin.adminMarketsPage.desactiveFalse")}
                </option>
              </select>
            ) : (
              <input
                id="admin-edit-override-value"
                type={editingValueType === "number" ? "number" : "text"}
                min={
                  editingValueType === "number" &&
                  activeEditingPath === "features.recentSearchesLimit"
                    ? RECENT_SEARCHES_LIMIT_MIN
                    : undefined
                }
                max={
                  editingValueType === "number" &&
                  activeEditingPath === "features.recentSearchesLimit"
                    ? RECENT_SEARCHES_LIMIT_MAX
                    : undefined
                }
                step={
                  editingValueType === "number" &&
                  activeEditingPath === "features.recentSearchesLimit"
                    ? 1
                    : undefined
                }
                value={editingValueInput}
                onChange={(e) => setEditingValueInput(e.target.value)}
                className="w-full h-control-md px-3 text-xs font-mono font-bold bg-bg-base border border-border-base rounded-control focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            )}
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-micro text-stone-600 space-y-1">
            <div className="font-bold text-stone-800">
              {t("admin.adminMarketsPage.regleDePersistance")}
            </div>
            <p>{t("admin.adminMarketsPage.cetteValeurSeraEnregistreeEn")}</p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditOverrideModalOpen(false)}
            >
              Annuler
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveOverride}>
              {t("admin.adminMarketsPage.enregistrerLaSurcharge")}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={pendingResetMarketCode !== null}
        onClose={() => setPendingResetMarketCode(null)}
        onConfirm={confirmResetAll}
        title={t("admin.adminMarketsPage.resetAllTitle")}
        message={t("admin.adminMarketsPage.resetAllMessage", {
          market: selectedMarket.name,
          baseline: baselineMarket.name,
        })}
        confirmText={t("admin.adminMarketsPage.resetAllConfirm")}
        variant="warning"
      />
    </div>
  );
};
