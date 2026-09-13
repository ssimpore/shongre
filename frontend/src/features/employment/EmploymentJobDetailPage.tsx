import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Flag,
  GraduationCap,
  Heart,
  Languages,
  Share2,
  ShieldAlert,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type {
  EmploymentCatalog,
  EmploymentJobReport,
  JobPostingCard,
  JobPostingDetail,
} from "@shongre/contracts/employment";
import {
  EMPLOYMENT_TEXT_LIMITS,
  employmentSearchQuerySchema,
} from "@shongre/contracts/employment";
import { getListingPromotionBadges } from "@shongre/features/listings/presentation";
import { useListingPromotionRefresh } from "@shongre/features/listings/web";
import { VerificationBadge } from "@shongre/ui/web";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { routes } from "../../configuration/routes";
import {
  Badge,
  Button,
  Container,
  FormField,
  Modal,
  SellerIdentityLink,
  Select,
  Skeleton,
  StatePanel,
  Textarea,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { JobCard } from "./components/JobCard";
import { formatEmploymentDate, formatSalary } from "./employment-format";
import { publicRouteUrl } from "../../domains/market/market-routing";
import { usePublicRouteData } from "../../app/providers/PublicRouteDataProvider";
import {
  pageMetaForPolicy,
  resolveSeoPolicy,
  structuredDataForPolicy,
} from "../../platform/seo/seo-policy";
import { useTranslation } from "../../i18n/I18nProvider";
import { PAGE_SIZES } from "../../configuration/pagination.config";
import { ListingCharacteristics } from "../listings/components/ListingCharacteristics";
import { ListingLocationSection } from "../listings/components/ListingLocationSection";
import { ListingDiscoveryRail } from "../listings/components/ListingDiscoveryRail";
import { DetailMobileActionPanel } from "../listings/components/DetailMobileActionPanel";
import { localizeListingCharacteristics } from "@shongre/features/listings/facts";

export const EmploymentJobDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { slug = "" } = useParams<{ slug: string }>();
  const { currentUser } = useAuth();
  const { currentLocale, marketContext, activeMarket, convertMoney } =
    useMarketLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const publicRouteData = usePublicRouteData();
  const initialData =
    publicRouteData?.kind === "job" && publicRouteData.job.slug === slug
      ? publicRouteData
      : null;
  const [job, setJob] = useState<JobPostingDetail | null>(
    initialData?.job ?? null,
  );
  const [catalog, setCatalog] = useState<EmploymentCatalog | null>(
    initialData?.catalog ?? null,
  );
  const [employerJobs, setEmployerJobs] = useState<JobPostingCard[]>([]);
  const [similar, setSimilar] = useState<JobPostingCard[]>(
    initialData?.similarJobs ?? [],
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] =
    useState<EmploymentJobReport["reason"]>("fraud");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const [favoritePendingIds, setFavoritePendingIds] = useState<string[]>([]);
  const accountId = currentUser?.id;
  const favoriteScope = `${accountId || "guest"}:${activeMarket.code}`;
  const [favoriteState, setFavoriteState] = useState<{
    scope: string;
    ids: string[];
    loadState: "loading" | "ready" | "error";
  }>(() => ({ scope: "", ids: [], loadState: "loading" }));
  const favoriteIds = useMemo(
    () =>
      new Set(favoriteState.scope === favoriteScope ? favoriteState.ids : []),
    [favoriteScope, favoriteState],
  );
  const favoriteLoadState =
    favoriteState.scope === favoriteScope ? favoriteState.loadState : "loading";

  useListingPromotionRefresh(job?.resolvedPromotion);
  const promotionBadge = getListingPromotionBadges(
    {
      marketCode: activeMarket.code,
      promotion: job?.resolvedPromotion,
    },
    {
      boosted: t("ui.listingCard.boosted"),
      sponsored: t("ui.listingCard.sponsored"),
      featured: t("ui.listingCard.featured"),
      urgent: t("ui.listingCard.urgent"),
      promotion: t("ui.listingCard.promotion"),
    },
  )[0];

  const loadFavoriteIds = useCallback(async () => {
    const scope = favoriteScope;
    setFavoriteState((current) => ({
      scope,
      ids: current.scope === scope ? current.ids : [],
      loadState: "loading",
    }));
    if (!accountId) {
      setFavoriteState({ scope, ids: [], loadState: "ready" });
      return;
    }
    try {
      const ids = await services.employment.getSavedJobIds(activeMarket.code);
      setFavoriteState((current) =>
        current.scope === scope
          ? { scope, ids: Array.from(new Set(ids)), loadState: "ready" }
          : current,
      );
    } catch (cause) {
      setFavoriteState((current) =>
        current.scope === scope ? { ...current, loadState: "error" } : current,
      );
      throw cause;
    }
  }, [accountId, activeMarket.code, favoriteScope]);

  useEffect(() => {
    void loadFavoriteIds().catch(() => undefined);
  }, [loadFavoriteIds]);

  /*
   * The employer's other openings.
   *
   * Separate from the job fetch because that one returns early when the server
   * already supplied the job, which is the common path — a rail hung off it
   * would be invisible to almost every visitor. Filtered by the API on an
   * indexed column rather than by reading the board and matching names.
   */
  const railEmployerId = job?.employer.id;
  const railJobId = job?.id;
  const railMarketCode = activeMarket.code;
  useEffect(() => {
    if (!railEmployerId || !railJobId) {
      setEmployerJobs([]);
      return;
    }
    let active = true;
    services.employment
      .searchJobs(
        employmentSearchQuerySchema.parse({
          marketCode: railMarketCode,
          employerId: railEmployerId,
          sort: "newest",
          limit: PAGE_SIZES.similarVerticalListings,
        }),
      )
      .then((found) => {
        if (!active) return;
        setEmployerJobs(
          found.items.filter((row) => row.id !== railJobId).slice(0, 8),
        );
      })
      .catch(() => {
        if (active) setEmployerJobs([]);
      });
    return () => {
      active = false;
    };
  }, [railEmployerId, railJobId, railMarketCode]);

  useEffect(() => {
    const marketCode = activeMarket.code;
    if (initialData?.job.marketCode === marketCode) {
      setJob(initialData.job);
      setCatalog(initialData.catalog);
      setSimilar(initialData.similarJobs);
      setError(false);
      setLoading(false);
      return;
    }
    let active = true;
    setJob(null);
    setCatalog(null);
    setSimilar([]);
    setEmployerJobs([]);
    setLoading(true);
    setError(false);
    services.employment
      .getJob(slug, marketCode)
      .then(async (result) => {
        const [nextCatalog, nextSimilar] = await Promise.all([
          services.employment.getCatalog(marketCode),
          services.employment.getSimilarJobs(result.id, marketCode),
        ]);
        if (!active) return;
        if (result.marketCode !== marketCode)
          throw new Error("Offre d’emploi introuvable sur ce marché.");
        setJob(result);
        setCatalog(nextCatalog);
        setSimilar(nextSimilar);
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [activeMarket.code, initialData, slug]);

  const pageMeta = React.useMemo(() => {
    if (!job || !catalog || !marketContext) {
      return {
        title: "Offre d’emploi indisponible",
        description: "Cette offre d’emploi n’est pas disponible sur Shongre.",
        canonicalPath: `/emploi/offre/${slug}`,
        noIndex: true,
        follow: false,
      };
    }
    const routeData = {
      status: "found" as const,
      data: {
        kind: "job" as const,
        job,
        catalog,
        similarJobs: similar,
      },
    };
    const policy = resolveSeoPolicy({
      pathname: `/emploi/offre/${slug}`,
      marketContext,
      routeData,
    });
    return pageMetaForPolicy(
      policy,
      structuredDataForPolicy(policy, marketContext, routeData),
    );
  }, [catalog, job, marketContext, similar, slug]);
  usePageMeta(pageMeta);

  if (loading) {
    return (
      <div className="bg-bg-base py-8">
        <Container className="grid gap-5 lg:grid-cols-content-aside">
          <Skeleton className="h-152 rounded-card" />
          <Skeleton className="h-80 rounded-card" />
        </Container>
      </div>
    );
  }
  if (error || !job) {
    return (
      <div className="bg-bg-base py-12">
        <Container>
          <StatePanel
            variant="notFound"
            title="Cette offre n’est plus disponible"
            description="Elle a peut-être expiré, été clôturée ou retirée après modération."
            action={
              <Button onClick={() => navigate("/emploi")}>
                Voir les offres actives
              </Button>
            }
          />
        </Container>
      </div>
    );
  }

  const apply = () => {
    if (job.applicationMethod === "external" && job.externalApplicationUrl) {
      window.location.assign(job.externalApplicationUrl);
      return;
    }
    if (job.applicationMethod === "contact_recruiter") {
      navigate(`/messages?employmentJob=${encodeURIComponent(job.id)}`);
      return;
    }
    navigate(`/emploi/offre/${job.slug}/postuler`);
  };

  const setFavorite = async (targetId: string) => {
    if (favoriteLoadState !== "ready" || favoritePendingIds.includes(targetId))
      return;
    if (!currentUser) {
      navigate(routes.auth.login(window.location.pathname));
      return;
    }
    setFavoritePendingIds((current) => [...current, targetId]);
    try {
      const isFavorite = await services.employment.setSavedJob(
        targetId,
        activeMarket.code,
        !favoriteIds.has(targetId),
      );
      setFavoriteState((current) =>
        current.scope === favoriteScope
          ? {
              ...current,
              ids: isFavorite
                ? Array.from(new Set([...current.ids, targetId]))
                : current.ids.filter((id) => id !== targetId),
            }
          : current,
      );
      toast.success(isFavorite ? "Offre enregistrée" : "Offre retirée");
    } catch {
      toast.error(t("ui.listingCard.favoriErreur"));
    } finally {
      setFavoritePendingIds((current) =>
        current.filter((id) => id !== targetId),
      );
    }
  };

  const save = () => setFavorite(job.id);

  const saveSimilar = async (target: JobPostingCard) => {
    await setFavorite(target.id);
  };

  const share = async () => {
    const url = publicRouteUrl({
      route: `/emploi/offre/${encodeURIComponent(job.slug)}`,
      countryCode: marketContext?.countryCode ?? activeMarket.code,
    });
    if (navigator.share) await navigator.share({ title: job.title, url });
    else {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié");
    }
  };

  const report = async () => {
    setReporting(true);
    try {
      await services.employment.reportJob(job.id, {
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      setReportOpen(false);
      setReportDetails("");
      toast.success("Votre signalement a été transmis à la modération.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Signalement non transmis.",
      );
    } finally {
      setReporting(false);
    }
  };

  const employerPublicUrl = routes.seller.publicPage({
    id: job.employer.id,
    slug: job.employer.slug,
    isProfessional: Boolean(job.employer.organizationId),
  });

  return (
    <div className="min-h-screen bg-bg-base">
      <Container className="py-5 sm:py-8">
        <nav
          aria-label="Fil d’Ariane"
          className="mb-4 text-xs text-text-secondary"
        >
          <Link to="/emploi" className="hover:text-primary">
            Emploi
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{job.professionLabel}</span>
        </nav>

        <DetailMobileActionPanel
          eyebrow="Candidater à cette offre"
          summary={formatSalary(
            job.salary,
            catalog,
            currentLocale,
            convertMoney,
          )}
        >
          <Button variant="primary" className="w-full" onClick={apply}>
            {job.applicationMethod === "shongre"
              ? "Postuler gratuitement"
              : job.applicationMethod === "external"
                ? "Postuler sur le site employeur"
                : "Contacter le recruteur"}
          </Button>
        </DetailMobileActionPanel>

        <div className="grid items-start gap-5 lg:grid-cols-content-aside-md">
          <div className="min-w-0 space-y-5">
            <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  {promotionBadge ? (
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span
                        data-testid="employment-job-promotion"
                        data-listing-badge={promotionBadge.kind}
                      >
                        <Badge
                          variant={
                            promotionBadge.variant === "urgent"
                              ? "warning"
                              : "primary"
                          }
                        >
                          {promotionBadge.label}
                        </Badge>
                      </span>
                    </div>
                  ) : null}
                  <h1 className="text-2xl font-bold text-text-main sm:text-3xl">
                    {job.title}
                  </h1>
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold text-text-secondary">
                    <Building2
                      className="h-icon-sm w-icon-sm"
                      aria-hidden="true"
                    />
                    <Link
                      to={employerPublicUrl}
                      className="rounded-control transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {job.employer.name}
                    </Link>
                    {job.employer.isPubliclyVerified ? (
                      <VerificationBadge
                        label={t("ui.identityStatus.verification.employer")}
                      />
                    ) : (
                      <span className="font-normal text-text-muted">
                        Identité déclarée
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={
                      favoriteLoadState === "error"
                        ? () => void loadFavoriteIds().catch(() => undefined)
                        : save
                    }
                    disabled={
                      favoriteLoadState === "loading" ||
                      favoritePendingIds.includes(job.id)
                    }
                    leftIcon={
                      <Heart
                        className={`h-icon-sm w-icon-sm ${favoriteIds.has(job.id) ? "fill-primary" : ""}`}
                      />
                    }
                  >
                    {favoriteLoadState === "error"
                      ? "Réessayer"
                      : favoriteLoadState === "loading"
                        ? "Chargement…"
                        : favoriteIds.has(job.id)
                          ? "Enregistrée"
                          : "Enregistrer"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={share}
                    leftIcon={<Share2 className="h-icon-sm w-icon-sm" />}
                  >
                    Partager
                  </Button>
                </div>
              </div>

              {/*
               * A job's headline facts are the same kind of information as a
               * vehicle's or a rental's, so they use the same list rather than a
               * four-across tinted panel that only this page understood.
               */}
              <ListingCharacteristics
                key={job.id}
                className="mt-7"
                state="ready"
                data={localizeListingCharacteristics(
                  job.taxonomy?.detailCharacteristics,
                  currentLocale,
                )}
              />

              <ListingLocationSection
                className="mt-7"
                marketCode={job.marketCode}
                city={job.primaryLocation.city}
                postalCode={job.primaryLocation.postalCode}
                latitude={job.primaryLocation.latitude}
                longitude={job.primaryLocation.longitude}
              />

              <p className="mt-5 text-lg font-bold text-primary">
                {formatSalary(job.salary, catalog, currentLocale, convertMoney)}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-secondary">
                {job.publishedAt ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-icon-xs w-icon-xs" />
                    Publiée le{" "}
                    {formatEmploymentDate(job.publishedAt, currentLocale)}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-icon-xs w-icon-xs" />
                  Expire le {formatEmploymentDate(job.expiresAt, currentLocale)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UsersRound className="h-icon-xs w-icon-xs" />
                  {job.positionsCount} poste{job.positionsCount > 1 ? "s" : ""}
                </span>
              </div>
            </section>

            <section className="rounded-card border border-border-base bg-bg-surface p-5 sm:p-7">
              <h2 className="text-lg font-bold text-text-main">Le poste</h2>
              <ul className="mt-4 space-y-3">
                {job.responsibilities.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-sm leading-relaxed text-text-secondary"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-icon-sm w-icon-sm shrink-0 text-success"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <div className="rounded-card border border-border-base bg-bg-surface p-5">
                <h2 className="flex items-center gap-2 text-base font-bold">
                  <Sparkles className="h-icon-sm w-icon-sm text-primary" />
                  Compétences
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {job.requiredSkills.map((skill) => (
                    <Badge key={skill} variant="primary">
                      {skill}
                    </Badge>
                  ))}
                  {job.preferredSkills.map((skill) => (
                    <Badge key={skill}>{skill} · appréciée</Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-card border border-border-base bg-bg-surface p-5">
                <h2 className="flex items-center gap-2 text-base font-bold">
                  <GraduationCap className="h-icon-sm w-icon-sm text-primary" />
                  Expérience & formation
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-text-secondary">
                  {job.qualificationSummary ||
                    "Les compétences directement utiles au poste seront étudiées. Consultez les critères détaillés avec le recruteur."}
                </p>
                {job.languages.length ? (
                  <p className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
                    <Languages className="h-icon-sm w-icon-sm" />
                    {job.languages.map((language) => language.label).join(", ")}
                  </p>
                ) : null}
              </div>
            </section>

            {job.benefits.length || job.accessibilityInformation ? (
              <section className="rounded-card border border-border-base bg-bg-surface p-5 sm:p-7">
                <h2 className="text-lg font-bold">Conditions & avantages</h2>
                {job.benefits.length ? (
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {job.benefits.map((benefit) => (
                      <li key={benefit} className="text-sm text-text-secondary">
                        • {benefit}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {job.accessibilityInformation ? (
                  <p className="mt-4 rounded-control bg-success-surface p-3 text-xs text-success">
                    Accessibilité : {job.accessibilityInformation}
                  </p>
                ) : null}
              </section>
            ) : null}

            <section className="rounded-card border border-border-base bg-bg-surface p-5 sm:p-7">
              <h2 className="text-lg font-bold">
                À propos de{" "}
                <Link
                  to={employerPublicUrl}
                  className="rounded-control transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {job.employer.name}
                </Link>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {job.employerDescription || job.employer.description}
              </p>
              <h3 className="mt-5 text-sm font-bold">
                Processus de recrutement
              </h3>
              <ol className="mt-3 space-y-2">
                {job.recruitmentProcess.map((step, index) => (
                  <li key={step} className="text-sm text-text-secondary">
                    <span className="mr-2 font-bold text-primary">
                      {index + 1}.
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>

            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex min-h-control-md items-center gap-2 text-xs font-semibold text-text-secondary hover:text-primary"
            >
              <Flag className="h-icon-sm w-icon-sm" /> Signaler cette offre
            </button>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-card border border-border-base bg-bg-surface p-5 shadow-sm">
              <SellerIdentityLink
                to={employerPublicUrl}
                name={job.employer.name}
                avatarUrl={job.employer.logoUrl}
                isVerified={job.employer.isPubliclyVerified}
                isProfessional={Boolean(job.employer.organizationId)}
                rating={job.employer.rating}
                reviewCount={job.employer.reviewCount}
                locationLabel={job.employer.locationLabel}
                className="mb-4 border-b border-border-subtle pb-4"
              />
              <Button variant="primary" className="w-full" onClick={apply}>
                {job.applicationMethod === "shongre"
                  ? "Postuler gratuitement"
                  : job.applicationMethod === "external"
                    ? "Postuler sur le site employeur"
                    : "Contacter le recruteur"}
              </Button>
              <p className="mt-3 text-center text-micro text-text-muted">
                Aucun paiement n’est requis pour postuler.
              </p>
            </div>
            <div className="rounded-card border border-warning-border bg-warning-surface p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-text-main">
                <ShieldAlert className="h-icon-sm w-icon-sm text-warning" />
                Conseils de sécurité
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                {job.safetyNotice}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                Ne transmettez pas de coordonnées bancaires ni de pièce
                d’identité avant d’avoir vérifié l’employeur et la finalité de
                la demande.
              </p>
            </div>
          </aside>
        </div>

        <div className="mt-10 space-y-7">
          <ListingDiscoveryRail
            kind="seller"
            title={t("listings.discovery.fromThisEmployer", {
              employer: job.employer.name,
            })}
            subtitle={t("listings.discovery.fromThisEmployerSubtitle")}
            moreHref={employerPublicUrl}
            moreLabel={t("listings.discovery.seeMoreFromSeller")}
          >
            {employerJobs.map((item) => (
              <JobCard
                key={item.id}
                job={{ ...item, saved: favoriteIds.has(item.id) }}
                catalog={catalog}
                onSave={saveSimilar}
                favoriteLoadState={favoriteLoadState}
                onFavoriteRetry={loadFavoriteIds}
                compact
              />
            ))}
          </ListingDiscoveryRail>

          <ListingDiscoveryRail
            kind="similar"
            title="Offres similaires"
            subtitle={t("listings.discovery.similarSubtitleGeneric")}
          >
            {similar.map((item) => (
              <JobCard
                key={item.id}
                job={{ ...item, saved: favoriteIds.has(item.id) }}
                catalog={catalog}
                onSave={saveSimilar}
                favoriteLoadState={favoriteLoadState}
                onFavoriteRetry={loadFavoriteIds}
                compact
              />
            ))}
          </ListingDiscoveryRail>
        </div>
        <Modal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          title="Signaler cette offre"
          description="Aidez l’équipe Trust & Safety à examiner une offre potentiellement dangereuse ou non conforme."
        >
          <div className="space-y-4">
            <FormField label="Motif du signalement">
              <Select
                aria-label="Motif du signalement"
                value={reportReason}
                onChange={(event) =>
                  setReportReason(
                    event.target.value as EmploymentJobReport["reason"],
                  )
                }
              >
                <option value="fraud">Fraude ou fausse offre</option>
                <option value="candidate_fee">
                  Paiement demandé au candidat
                </option>
                <option value="discrimination">
                  Critère potentiellement discriminatoire
                </option>
                <option value="malicious_link">
                  Lien suspect ou malveillant
                </option>
                <option value="misleading">Information trompeuse</option>
                <option value="other">Autre motif</option>
              </Select>
            </FormField>
            <FormField label="Précisions (facultatif)">
              <Textarea
                rows={4}
                maxLength={EMPLOYMENT_TEXT_LIMITS.reportDetails}
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReportOpen(false)}>
                Annuler
              </Button>
              <Button variant="danger" onClick={report} disabled={reporting}>
                {reporting ? "Envoi…" : "Envoyer le signalement"}
              </Button>
            </div>
          </div>
        </Modal>
      </Container>
    </div>
  );
};
