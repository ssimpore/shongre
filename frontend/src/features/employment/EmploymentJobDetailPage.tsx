import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flag,
  GraduationCap,
  Heart,
  Languages,
  MapPin,
  Radio,
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
import { EMPLOYMENT_TEXT_LIMITS } from "@shongre/contracts/employment";
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
  Select,
  Skeleton,
  StatePanel,
  Textarea,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { storageService } from "../../services/storage.service";
import { JobCard } from "./components/JobCard";
import { formatEmploymentDate, formatSalary } from "./employment-format";
import { publicRouteUrl } from "../../domains/market/market-routing";
import { usePublicRouteData } from "../../app/providers/PublicRouteDataProvider";
import {
  pageMetaForPolicy,
  resolveSeoPolicy,
  structuredDataForPolicy,
} from "../../platform/seo/seo-policy";

export const EmploymentJobDetailPage: React.FC = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const { currentUser } = useAuth();
  const { currentLocale, marketContext, activeMarket } = useMarketLocation();
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

  useEffect(() => {
    if (initialData) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(false);
    services.employment
      .getJob(slug)
      .then(async (result) => {
        const [nextCatalog, nextSimilar] = await Promise.all([
          services.employment.getCatalog(result.marketCode),
          services.employment.getSimilarJobs(result.id),
        ]);
        if (!active) return;
        setJob(result);
        setCatalog(nextCatalog);
        setSimilar(nextSimilar);
        const recentKey = `shongre_employment_recent_jobs:${currentUser?.id || "guest"}`;
        const recent = storageService.get<string[]>(recentKey, []);
        storageService.set(
          recentKey,
          [result.id, ...recent.filter((id) => id !== result.id)].slice(0, 12),
        );
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [currentUser?.id, initialData, slug]);

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

  const save = async () => {
    const result = await services.employment.toggleSavedJob(job.id);
    setJob({ ...job, saved: result.saved });
    toast.success(result.saved ? "Offre enregistrée" : "Offre retirée");
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

        <div className="grid items-start gap-5 lg:grid-cols-content-aside-md">
          <div className="min-w-0 space-y-5">
            <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {job.isUrgent ? (
                      <Badge variant="warning">Recrutement urgent</Badge>
                    ) : null}
                    {job.isFeatured ? (
                      <Badge variant="primary">À la une</Badge>
                    ) : null}
                    {job.isSponsored ? (
                      <Badge>Placement sponsorisé</Badge>
                    ) : null}
                  </div>
                  <h1 className="text-2xl font-black text-text-main sm:text-3xl">
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
                      <span className="inline-flex items-center gap-1 text-success">
                        <BadgeCheck
                          className="h-icon-sm w-icon-sm"
                          aria-hidden="true"
                        />
                        Employeur vérifié
                      </span>
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
                    onClick={save}
                    leftIcon={
                      <Heart
                        className={`h-icon-sm w-icon-sm ${job.saved ? "fill-primary" : ""}`}
                      />
                    }
                  >
                    {job.saved ? "Enregistrée" : "Enregistrer"}
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

              <dl className="mt-6 grid gap-3 rounded-card bg-bg-subtle p-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  [MapPin, "Localisation", job.primaryLocation.label],
                  [BriefcaseBusiness, "Métier", job.professionLabel],
                  [Building2, "Secteur", job.industryLabel],
                  [Radio, "Organisation", job.workingArrangementLabel],
                  [BriefcaseBusiness, "Contrat", job.contractTypeLabel],
                  [
                    Clock3,
                    "Temps de travail",
                    catalog?.dictionaries.find(
                      (entry) => entry.id === job.workingTimeId,
                    )?.label || "Selon l’offre",
                  ],
                ].map(([Icon, label, value]) => {
                  const ItemIcon = Icon as typeof MapPin;
                  return (
                    <div key={String(label)}>
                      <dt className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-wide text-text-secondary">
                        <ItemIcon
                          className="h-icon-xs w-icon-xs"
                          aria-hidden="true"
                        />
                        {String(label)}
                      </dt>
                      <dd className="mt-1 text-xs font-bold text-text-main">
                        {String(value)}
                      </dd>
                    </div>
                  );
                })}
              </dl>

              <p className="mt-5 text-lg font-black text-primary">
                {formatSalary(job.salary, catalog, currentLocale)}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-icon-xs w-icon-xs" />
                  Publiée le{" "}
                  {formatEmploymentDate(job.publishedAt, currentLocale)}
                </span>
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
              <h2 className="text-lg font-black text-text-main">Le poste</h2>
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
                <h2 className="flex items-center gap-2 text-base font-black">
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
                <h2 className="flex items-center gap-2 text-base font-black">
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
                <h2 className="text-lg font-black">Conditions & avantages</h2>
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
              <h2 className="text-lg font-black">
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
              <h3 className="mt-5 text-sm font-black">
                Processus de recrutement
              </h3>
              <ol className="mt-3 space-y-2">
                {job.recruitmentProcess.map((step, index) => (
                  <li key={step} className="text-sm text-text-secondary">
                    <span className="mr-2 font-black text-primary">
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
              className="inline-flex min-h-control-md items-center gap-2 text-xs font-bold text-text-secondary hover:text-primary"
            >
              <Flag className="h-icon-sm w-icon-sm" /> Signaler cette offre
            </button>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-card border border-border-base bg-bg-surface p-5 shadow-sm">
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
              <h2 className="flex items-center gap-2 text-sm font-black text-text-main">
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

        {similar.length ? (
          <section className="mt-10">
            <h2 className="text-xl font-black text-text-main">
              Offres similaires
            </h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {similar.map((item) => (
                <JobCard key={item.id} job={item} catalog={catalog} compact />
              ))}
            </div>
          </section>
        ) : null}
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
