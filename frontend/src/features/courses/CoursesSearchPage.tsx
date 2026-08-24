import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowUpDown,
  BookOpen,
  Check,
  Filter,
  GitCompareArrows,
  GraduationCap,
  MapPin,
  Search,
  X,
} from "lucide-react";
import type {
  CourseCatalog,
  DeliveryMode,
  TutorSearchItem,
  TutorSearchQuery,
} from "@shongre/contracts/courses";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Button,
  Container,
  Drawer,
  FilterPanel,
  Skeleton,
  StatePanel,
} from "../../design-system";
import type { FilterPanelPresentation } from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { CourseTutorCard } from "./components/CourseTutorCard";

interface CourseFiltersProps {
  catalog: CourseCatalog;
  params: URLSearchParams;
  updateParam: (key: string, value?: string) => void;
  onReset: () => void;
  onApplyMobile?: () => void;
  presentation?: FilterPanelPresentation;
}

const COURSE_FILTER_KEYS = [
  "subject",
  "levels",
  "city",
  "delivery",
  "availability",
  "maxPrice",
  "language",
  "tutorType",
  "verified",
  "rating",
] as const;

const splitParam = (value: string | null) =>
  (value || "").split(",").filter(Boolean);

const CourseFilters: React.FC<CourseFiltersProps> = ({
  catalog,
  params,
  updateParam,
  onReset,
  onApplyMobile,
  presentation = "surface",
}) => {
  const levels = splitParam(params.get("levels"));
  const deliveryModes = splitParam(params.get("delivery"));
  const availability = splitParam(params.get("availability"));
  const toggleList = (key: string, current: string[], value: string) => {
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    updateParam(key, next.length ? next.join(",") : undefined);
  };

  return (
    <FilterPanel
      title="Filtres"
      presentation={presentation}
      onReset={onReset}
      footer={
        onApplyMobile ? (
          <Button fullWidth onClick={onApplyMobile}>
            Voir les résultats
          </Button>
        ) : undefined
      }
    >
      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">
          Matière
        </legend>
        <select
          aria-label="Matière"
          value={params.get("subject") || ""}
          onChange={(event) =>
            updateParam("subject", event.target.value || undefined)
          }
          className="h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3 text-xs text-text-main focus:border-primary"
        >
          <option value="">Toutes les matières</option>
          {catalog.subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.label}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">
          Niveau
        </legend>
        <div className="space-y-1.5">
          {catalog.levels.map((level) => (
            <label
              key={level.id}
              className="flex min-h-control-target cursor-pointer items-center gap-2 text-xs text-text-secondary"
            >
              <input
                type="checkbox"
                checked={levels.includes(level.id)}
                onChange={() => toggleList("levels", levels, level.id)}
              />
              {level.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">Lieu</legend>
        <label className="relative block">
          <span className="sr-only">Ville</span>
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 h-icon-sm w-icon-sm -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            value={params.get("city") || ""}
            onChange={(event) =>
              updateParam("city", event.target.value || undefined)
            }
            placeholder="Ville ou code postal"
            className="h-control-touch w-full rounded-control border border-border-base bg-bg-surface pl-9 pr-3 text-xs text-text-main"
          />
        </label>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">
          En ligne / À domicile
        </legend>
        <div className="space-y-1.5">
          {[
            ["online", "En ligne"],
            ["in_person", "À domicile ou en présentiel"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-control-target cursor-pointer items-center gap-2 text-xs text-text-secondary"
            >
              <input
                type="checkbox"
                checked={deliveryModes.includes(value)}
                onChange={() => toggleList("delivery", deliveryModes, value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">
          Disponibilités
        </legend>
        <div className="space-y-1.5">
          {[
            ["weekday", "En semaine"],
            ["evening", "Le soir"],
            ["weekend", "Le week-end"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-control-target cursor-pointer items-center gap-2 text-xs text-text-secondary"
            >
              <input
                type="checkbox"
                checked={availability.includes(value)}
                onChange={() => toggleList("availability", availability, value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">
          Prix par heure
        </legend>
        <select
          aria-label="Prix maximum par heure"
          value={params.get("maxPrice") || ""}
          onChange={(event) =>
            updateParam("maxPrice", event.target.value || undefined)
          }
          className="h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3 text-xs text-text-main"
        >
          <option value="">Sans maximum</option>
          <option value="2500">25 € maximum</option>
          <option value="3000">30 € maximum</option>
          <option value="4000">40 € maximum</option>
          <option value="6000">60 € maximum</option>
        </select>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">
          Langue
        </legend>
        <select
          aria-label="Langue"
          value={params.get("language") || ""}
          onChange={(event) =>
            updateParam("language", event.target.value || undefined)
          }
          className="h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3 text-xs text-text-main"
        >
          <option value="">Toutes les langues</option>
          <option value="fr">Français</option>
          <option value="en">Anglais</option>
          <option value="es">Espagnol</option>
        </select>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">
          Type de professeur
        </legend>
        <select
          aria-label="Type de professeur"
          value={params.get("tutorType") || "all"}
          onChange={(event) =>
            updateParam(
              "tutorType",
              event.target.value === "all" ? undefined : event.target.value,
            )
          }
          className="h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3 text-xs text-text-main"
        >
          <option value="all">Tous les profils</option>
          <option value="individual">Professeur indépendant</option>
          <option value="organization">École ou organisme</option>
        </select>
      </fieldset>

      <fieldset className="space-y-2 border-t border-border-subtle pt-4">
        <legend className="sr-only">Confiance</legend>
        <label className="flex min-h-control-target cursor-pointer items-center justify-between gap-3 text-xs font-semibold text-text-main">
          <span>Profils vérifiés</span>
          <input
            type="checkbox"
            checked={params.get("verified") === "true"}
            onChange={(event) =>
              updateParam("verified", event.target.checked ? "true" : undefined)
            }
          />
        </label>
        <label className="block text-xs font-bold text-text-main">
          Note moyenne
          <select
            value={params.get("rating") || ""}
            onChange={(event) =>
              updateParam("rating", event.target.value || undefined)
            }
            className="mt-2 h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3 text-xs font-normal text-text-main"
          >
            <option value="">Toutes les notes</option>
            <option value="4">4 et plus, avec assez d’avis</option>
            <option value="4.5">4,5 et plus, avec assez d’avis</option>
          </select>
        </label>
      </fieldset>
    </FilterPanel>
  );
};

export const CoursesSearchPage: React.FC = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { activeMarket } = useMarketLocation();
  const toast = useToast();
  const [catalog, setCatalog] = useState<CourseCatalog | null>(null);
  const [items, setItems] = useState<TutorSearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const freeText = params.get("query") || "";
  usePageMeta({
    title: t("verticals.education.searchTitle"),
    description:
      "Recherchez un professeur par matière, niveau, lieu, disponibilité et mode de cours.",
    canonicalPath: "/education",
    noIndex: Boolean(freeText),
  });

  useEffect(() => {
    services.courses
      .getCatalog(activeMarket.code)
      .then(setCatalog)
      .catch(() =>
        setError("Le catalogue de cours est momentanément indisponible."),
      );
  }, [activeMarket.code]);

  useEffect(() => {
    services.courses
      .getSavedTutorIds(currentUser?.id || "guest")
      .then(setSavedIds)
      .catch(() => setSavedIds([]));
  }, [currentUser?.id]);

  const query = useMemo<TutorSearchQuery>(
    () => ({
      marketCode: activeMarket.code,
      query: freeText || undefined,
      subjectId: params.get("subject") || undefined,
      levelIds: splitParam(params.get("levels")),
      city: params.get("city") || undefined,
      deliveryModes: splitParam(params.get("delivery")) as DeliveryMode[],
      maxPriceMinor: params.get("maxPrice")
        ? Number(params.get("maxPrice"))
        : undefined,
      availability: splitParam(
        params.get("availability"),
      ) as TutorSearchQuery["availability"],
      languages: params.get("language") ? [params.get("language")!] : undefined,
      tutorType:
        (params.get("tutorType") as TutorSearchQuery["tutorType"]) || "all",
      verifiedOnly: params.get("verified") === "true" || undefined,
      minRating: params.get("rating")
        ? Number(params.get("rating"))
        : undefined,
      sort: (params.get("sort") as TutorSearchQuery["sort"]) || "relevance",
      limit: 20,
    }),
    [activeMarket.code, freeText, params],
  );

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    services.courses
      .searchTutors(query)
      .then((result) => {
        setItems(result.items);
        setTotal(result.total);
      })
      .catch(() => setError("La recherche de professeurs a échoué."))
      .finally(() => setIsLoading(false));
  }, [query]);

  const updateParam = (key: string, value?: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (!value) next.delete(key);
      else next.set(key, value);
      next.delete("cursor");
      return next;
    });
  };

  const resetFilters = () => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      COURSE_FILTER_KEYS.forEach((key) => next.delete(key));
      next.delete("cursor");
      return next;
    });
  };

  const toggleCompare = (id: string) => {
    setComparedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) {
        toast.info("Vous pouvez comparer jusqu’à 4 professeurs.");
        return current;
      }
      return [...current, id];
    });
  };

  const toggleSaved = async (id: string) => {
    try {
      const isSaved = await services.courses.toggleSavedTutor(
        currentUser?.id || "guest",
        id,
      );
      setSavedIds((current) =>
        isSaved
          ? Array.from(new Set([...current, id]))
          : current.filter((item) => item !== id),
      );
      toast.success(
        isSaved ? "Professeur sauvegardé." : "Professeur retiré des favoris.",
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Impossible de modifier les favoris.",
      );
    }
  };

  const compared = items.filter((item) => comparedIds.includes(item.tutor.id));

  if (error && !catalog) {
    return (
      <Container className="py-10">
        <StatePanel
          title={t("verticals.education.unavailable")}
          description={error}
          action={
            <Button onClick={() => window.location.reload()}>Réessayer</Button>
          }
        />
      </Container>
    );
  }

  return (
    <Container className="py-5 sm:py-7">
      <div className="mb-5 flex flex-col gap-4 sm:mb-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold text-primary">
              <GraduationCap
                className="h-icon-sm w-icon-sm"
                aria-hidden="true"
              />
              {t("verticals.education.brand")}
            </p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-text-main sm:text-2xl">
              Trouver un professeur
            </h1>
            <p className="mt-1 text-xs text-text-secondary sm:text-sm">
              Comparez l’expérience, les modalités et les informations
              réellement vérifiées.
            </p>
          </div>
          <Button
            to="/education/demande"
            variant="outline"
            size="compact"
            leftIcon={<BookOpen className="h-icon-sm w-icon-sm" />}
          >
            Décrire mon besoin
          </Button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            updateParam("query", String(data.get("query") || "") || undefined);
          }}
          className="grid gap-2 rounded-card border border-border-base bg-bg-surface p-3 shadow-xs sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <label className="relative min-w-0">
            <span className="sr-only">
              Rechercher une matière ou un professeur
            </span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-icon-sm w-icon-sm -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              name="query"
              type="search"
              defaultValue={freeText}
              placeholder="Matière, objectif ou nom du professeur"
              className="h-control-touch w-full rounded-control border border-border-base bg-bg-base pl-9 pr-3 text-sm text-text-main"
            />
          </label>
          <Button type="submit" size="compact">
            Rechercher
          </Button>
        </form>
      </div>

      <div
        className={`grid min-w-0 gap-6 ${compared.length > 0 ? "lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_16rem]" : "lg:grid-cols-[16rem_minmax(0,1fr)]"}`}
      >
        <aside
          className="hidden self-start lg:sticky lg:top-24 lg:block"
          aria-label={t("verticals.education.filters")}
        >
          {catalog && (
            <CourseFilters
              catalog={catalog}
              params={params}
              updateParam={updateParam}
              onReset={resetFilters}
            />
          )}
        </aside>

        <main className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsFilterOpen(true)}
                leftIcon={<Filter className="h-icon-sm w-icon-sm" />}
              >
                Filtres
              </Button>
              <p
                className="text-xs font-semibold text-text-secondary"
                aria-live="polite"
              >
                {isLoading
                  ? "Recherche en cours…"
                  : `${total} professeur${total > 1 ? "s" : ""}`}
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
              <ArrowUpDown className="h-icon-sm w-icon-sm" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Trier par</span>
              <select
                value={query.sort}
                onChange={(event) => updateParam("sort", event.target.value)}
                className="h-control-sm rounded-control border border-border-base bg-bg-surface pl-3 pr-8 text-xs text-text-main"
              >
                <option value="relevance">Pertinence</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
                <option value="rating">Avis vérifiés</option>
                <option value="response_time">Temps de réponse</option>
              </select>
            </label>
          </div>

          {isLoading ? (
            <div className="space-y-3" aria-label="Chargement des professeurs">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-64 w-full rounded-card" />
              ))}
            </div>
          ) : error ? (
            <StatePanel
              title="Recherche indisponible"
              description={error}
              action={
                <Button onClick={() => setParams(params)}>Réessayer</Button>
              }
            />
          ) : items.length === 0 ? (
            <StatePanel
              variant="notFound"
              title="Aucun professeur ne correspond exactement"
              description="Élargissez le lieu, le mode de cours ou le budget, ou décrivez votre besoin pour recevoir des propositions pertinentes."
              action={
                <Button to="/education/demande">Décrire mon besoin</Button>
              }
              secondaryAction={
                <Button variant="outline" onClick={() => setParams({})}>
                  Effacer les filtres
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <CourseTutorCard
                  key={item.offer.id}
                  item={item}
                  isCompared={comparedIds.includes(item.tutor.id)}
                  isSaved={savedIds.includes(item.tutor.id)}
                  onToggleCompare={toggleCompare}
                  onToggleSaved={toggleSaved}
                />
              ))}
              <section className="flex flex-col items-start justify-between gap-4 rounded-card border border-primary-border bg-primary-light p-5 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-sm font-black text-text-main">
                    Vous ne trouvez pas le professeur idéal ?
                  </h2>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-text-secondary">
                    Décrivez votre besoin. La mise en relation privilégie la
                    matière, le niveau, les disponibilités et la sécurité — pas
                    seulement le forfait du professeur.
                  </p>
                </div>
                <Button to="/education/demande" size="compact">
                  Décrire mon besoin
                </Button>
              </section>
            </div>
          )}
        </main>

        {compared.length > 0 && (
          <aside className="hidden self-start rounded-card border border-border-base bg-bg-surface shadow-xs xl:block xl:sticky xl:top-24">
            <div className="flex items-center justify-between border-b border-border-subtle p-4">
              <h2 className="flex items-center gap-2 text-sm font-black text-text-main">
                <GitCompareArrows
                  className="h-icon-sm w-icon-sm"
                  aria-hidden="true"
                />
                Comparer ({compared.length}/4)
              </h2>
              <button
                type="button"
                aria-label="Vider la comparaison"
                onClick={() => setComparedIds([])}
                className="touch-square h-control-sm w-control-sm rounded-control text-text-muted hover:bg-bg-subtle"
              >
                <X className="h-icon-sm w-icon-sm" aria-hidden="true" />
              </button>
            </div>
            <div className="divide-y divide-border-subtle">
              {compared.map((item) => (
                <div key={item.tutor.id} className="p-4 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-text-main">
                        {item.tutor.displayName}
                      </p>
                      <p className="mt-0.5 text-text-muted">
                        {item.subjectLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Retirer ${item.tutor.displayName} de la comparaison`}
                      onClick={() => toggleCompare(item.tutor.id)}
                      className="touch-square h-control-sm w-control-sm rounded-control text-text-muted hover:bg-bg-subtle"
                    >
                      <X className="h-icon-xs w-icon-xs" aria-hidden="true" />
                    </button>
                  </div>
                  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-text-secondary">
                    <dt>Prix</dt>
                    <dd className="text-right font-semibold text-text-main">
                      {(item.fromPrice.amountMinor / 100).toLocaleString(
                        "fr-FR",
                      )}{" "}
                      € / h
                    </dd>
                    <dt>Format</dt>
                    <dd className="text-right">
                      {item.offer.deliveryModes.includes("online")
                        ? "En ligne"
                        : "Présentiel"}
                    </dd>
                    <dt>Identité</dt>
                    <dd className="flex items-center justify-end gap-1 text-right">
                      {item.tutor.verifications.identity === "verified" && (
                        <Check
                          className="h-icon-xs w-icon-xs text-success"
                          aria-hidden="true"
                        />
                      )}
                      {item.tutor.verifications.identity === "verified"
                        ? "Vérifiée"
                        : "Non vérifiée"}
                    </dd>
                  </dl>
                </div>
              ))}
            </div>
            <div className="p-4">
              <Button
                to={`/education/demande?compare=${compared.map((item) => item.tutor.id).join(",")}`}
                fullWidth
                size="compact"
              >
                Contacter ma sélection
              </Button>
            </div>
          </aside>
        )}
      </div>

      {catalog && (
        <Drawer
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="Filtrer les professeurs"
        >
          <CourseFilters
            catalog={catalog}
            params={params}
            updateParam={updateParam}
            onReset={resetFilters}
            onApplyMobile={() => setIsFilterOpen(false)}
            presentation="drawer"
          />
        </Drawer>
      )}

      {compared.length > 0 && (
        <div className="fixed inset-x-3 bottom-[calc(var(--mobile-nav-total-h)+0.75rem)] z-sticky rounded-card border border-border-base bg-bg-surface p-3 shadow-overlay xl:hidden md:bottom-4 md:left-auto md:right-4 md:w-80">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-text-main">
                {compared.length} professeur{compared.length > 1 ? "s" : ""} à
                comparer
              </p>
              <p className="truncate text-micro text-text-muted">
                {compared.map((item) => item.tutor.displayName).join(", ")}
              </p>
            </div>
            <Button
              to={`/education/demande?compare=${compared.map((item) => item.tutor.id).join(",")}`}
              size="sm"
            >
              Comparer
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
};
