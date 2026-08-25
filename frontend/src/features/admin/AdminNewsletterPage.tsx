import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  MarketingCampaign,
  MarketingAnalytics,
  MarketingDashboard,
  MarketingJourney,
  MarketingList,
  MarketingPreflight,
  MarketingProfile,
  MarketingSegment,
  MarketingSuppression,
  MarketingTemplate,
  MarketingUsage,
} from "@shongre/contracts";
import {
  BarChart3,
  Ban,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Eye,
  LayoutTemplate,
  ListFilter,
  Mail,
  PlusCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { services } from "../../api/client/service-registry";
import { useToast } from "../../app/providers/ToastProvider";
import { Badge } from "../../design-system/primitives/Badge";
import { Button } from "../../design-system/primitives/Button";
import {
  FormField,
  Input,
  Select,
  Textarea,
} from "../../design-system/primitives/FormField";
import { Modal } from "../../design-system/primitives/Modal";
import { EmptyState, Skeleton } from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatDate } from "../../utilities/formatters";
import { NewsletterPreviewModal } from "../newsletter/components/NewsletterPreviewModal";

type MarketingTab =
  | "overview"
  | "campaigns"
  | "audiences"
  | "templates"
  | "automation"
  | "analytics"
  | "compliance";

interface MarketingSnapshot {
  dashboard: MarketingDashboard;
  campaigns: MarketingCampaign[];
  profiles: MarketingProfile[];
  lists: MarketingList[];
  segments: MarketingSegment[];
  templates: MarketingTemplate[];
  suppressions: MarketingSuppression[];
  journeys: MarketingJourney[];
  analytics: MarketingAnalytics | null;
  usage: MarketingUsage | null;
}

const EMPTY_DASHBOARD: MarketingDashboard = {
  activeProfiles: 0,
  pendingProfiles: 0,
  suppressedProfiles: 0,
  campaignsSent: 0,
  scheduledCampaigns: 0,
  delivered: 0,
  deliveryRate: 0,
  uniqueClicks: 0,
  clickThroughRate: 0,
  unsubscribes: 0,
  providerConfigured: false,
};

const statusVariant = (
  status: MarketingCampaign["status"],
): "neutral" | "primary" | "success" | "warning" => {
  if (status === "COMPLETED") return "success";
  if (["QUEUED", "SENDING", "APPROVED"].includes(status)) return "primary";
  if (["SCHEDULED", "REVIEW", "PAUSED"].includes(status)) return "warning";
  return "neutral";
};

const statusLabel: Record<MarketingCampaign["status"], string> = {
  DRAFT: "Brouillon",
  REVIEW: "À valider",
  APPROVED: "Approuvée",
  SCHEDULED: "Programmée",
  QUEUED: "En file",
  SENDING: "En cours",
  PAUSED: "Suspendue",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  FAILED: "Échec",
};

export const AdminNewsletterPage: React.FC = () => {
  usePageMeta({
    title: "Marketing & Newsletter | Administration Shongre",
    description:
      "Audiences, campagnes, modèles, conformité et délivrabilité Marketing.",
    canonicalPath: "/admin/marketing",
    noIndex: true,
  });
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<MarketingTab>("overview");
  const [snapshot, setSnapshot] = useState<MarketingSnapshot>({
    dashboard: EMPTY_DASHBOARD,
    campaigns: [],
    profiles: [],
    lists: [],
    segments: [],
    templates: [],
    suppressions: [],
    journeys: [],
    analytics: null,
    usage: null,
  });
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [previewCampaign, setPreviewCampaign] =
    useState<MarketingCampaign | null>(null);
  const [preflightCampaign, setPreflightCampaign] =
    useState<MarketingCampaign | null>(null);
  const [preflight, setPreflight] = useState<MarketingPreflight | null>(null);
  const [checkingPreflight, setCheckingPreflight] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [audienceKey, setAudienceKey] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        dashboard,
        campaigns,
        profilePage,
        lists,
        segments,
        templates,
        suppressions,
        journeys,
        analytics,
        usage,
      ] = await Promise.all([
        services.marketing.getDashboard(),
        services.marketing.listCampaigns(),
        services.marketing.listProfiles({ limit: 20 }),
        services.marketing.listLists(),
        services.marketing.listSegments(),
        services.marketing.listTemplates(),
        services.marketing.listSuppressions(),
        services.marketing.listJourneys(),
        services.marketing.getAnalytics(),
        services.marketing.getUsage(),
      ]);
      setSnapshot({
        dashboard,
        campaigns,
        profiles: profilePage.items,
        lists,
        segments,
        templates,
        suppressions,
        journeys,
        analytics,
        usage,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de charger l’espace Marketing.",
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const audienceOptions = useMemo(
    () => [
      ...snapshot.lists.map((list) => ({
        value: `list:${list.id}`,
        label: `Liste · ${list.name} (${list.memberCount.toLocaleString("fr-FR")})`,
      })),
      ...snapshot.segments.map((segment) => ({
        value: `segment:${segment.id}`,
        label: `Segment · ${segment.name} (~${segment.estimatedCount.toLocaleString("fr-FR")})`,
      })),
    ],
    [snapshot.lists, snapshot.segments],
  );

  const openPreflight = async (campaign: MarketingCampaign) => {
    setPreflightCampaign(campaign);
    setPreflight(null);
    setCheckingPreflight(true);
    try {
      setPreflight(await services.marketing.preflight(campaign.id));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Pré-vol impossible.",
      );
    } finally {
      setCheckingPreflight(false);
    }
  };

  const sendCampaign = async (campaign: MarketingCampaign) => {
    setSubmitting(true);
    try {
      const validation = await services.marketing.preflight(campaign.id);
      if (!validation.canSend) {
        setPreflightCampaign(campaign);
        setPreflight(validation);
        return;
      }
      const result = await services.marketing.send(campaign.id);
      toast.success(
        `${result.queuedRecipients.toLocaleString("fr-FR")} destinataires éligibles mis en file. Aucun doublon ne sera créé lors des reprises.`,
        "Campagne mise en file",
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const createCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !subject.trim() || !audienceKey) {
      toast.error("Renseignez le nom, l’objet et une audience.");
      return;
    }
    const [audienceType, audienceId] = audienceKey.split(":");
    setSubmitting(true);
    try {
      await services.marketing.createCampaign({
        name: name.trim(),
        subject: subject.trim(),
        previewText: previewText.trim() || undefined,
        campaignType: "NEWSLETTER",
        locale: "fr-FR",
        timezone: "Europe/Paris",
        audience: {
          includeListIds: audienceType === "list" ? [audienceId] : [],
          includeSegmentIds: audienceType === "segment" ? [audienceId] : [],
          includeProfileIds: [],
          excludeListIds: [],
          excludeSegmentIds: [],
          excludeProfileIds: [],
          recentRecipientDays: 2,
        },
        content: {
          blocks: [
            {
              id: "heading",
              type: "HEADING",
              level: "H1",
              text: heading.trim() || subject.trim(),
            },
            {
              id: "body",
              type: "PARAGRAPH",
              text:
                body.trim() ||
                "Découvrez cette semaine les nouveautés sélectionnées par Shongre.",
            },
            {
              id: "cta",
              type: "BUTTON",
              label: "Découvrir la sélection",
              href: "https://shongre.example/recherche",
            },
            {
              id: "preferences",
              type: "PREFERENCE_CENTER",
              text: "Gérer mes préférences",
            },
            {
              id: "unsubscribe",
              type: "UNSUBSCRIBE",
              text: "Me désabonner en un clic",
            },
          ],
        },
      });
      setCreateOpen(false);
      setName("");
      setSubject("");
      setPreviewText("");
      setHeading("");
      setBody("");
      setAudienceKey("");
      toast.success(
        "Le contenu et l’audience ont été enregistrés dans une version immuable.",
        "Brouillon créé",
      );
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Création impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: Array<{
    id: MarketingTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: "overview", label: "Vue d’ensemble", icon: BarChart3 },
    {
      id: "campaigns",
      label: "Campagnes",
      icon: Mail,
      count: snapshot.campaigns.length,
    },
    {
      id: "audiences",
      label: "Audiences",
      icon: Users,
      count: snapshot.lists.length + snapshot.segments.length,
    },
    {
      id: "templates",
      label: "Modèles",
      icon: LayoutTemplate,
      count: snapshot.templates.length,
    },
    {
      id: "automation",
      label: "Parcours",
      icon: Clock3,
      count: snapshot.journeys.length,
    },
    {
      id: "analytics",
      label: "Analyses",
      icon: BarChart3,
    },
    {
      id: "compliance",
      label: "Conformité",
      icon: ShieldCheck,
      count: snapshot.suppressions.length,
    },
  ];

  return (
    <div className="space-y-5 pb-8">
      <section className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-950 p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-micro font-bold uppercase tracking-wider text-violet-300">
              <span>CRM · Marketing</span>
              <span aria-hidden>·</span>
              <span>Provider Platform partagée</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Marketing & Newsletter
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-stone-400 sm:text-sm">
              Audiences CRM et marketing, campagnes versionnées, consentement,
              délivrabilité et analyse depuis un domaine multi-tenant unique.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                snapshot.dashboard.providerConfigured ? "success" : "warning"
              }
              size="sm"
            >
              {snapshot.dashboard.providerConfigured
                ? "Email Delivery configuré"
                : "Fournisseur requis"}
            </Badge>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateOpen(true)}
              leftIcon={<PlusCircle className="h-4 w-4" />}
            >
              Nouvelle campagne
            </Button>
          </div>
        </div>
      </section>

      <nav
        aria-label="Sections Marketing"
        className="flex gap-1 overflow-x-auto rounded-2xl border border-border-base bg-white p-1.5 shadow-xs"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`flex min-h-control-sm shrink-0 items-center gap-2 rounded-control px-3 text-xs font-bold transition-colors ${
                activeTab === tab.id
                  ? "bg-stone-950 text-white"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-micro ${
                    activeTab === tab.id
                      ? "bg-white/15 text-white"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === "overview" && (
            <Overview
              snapshot={snapshot}
              onCampaign={setPreviewCampaign}
              onPreflight={openPreflight}
            />
          )}
          {activeTab === "campaigns" && (
            <Campaigns
              campaigns={snapshot.campaigns}
              onPreview={setPreviewCampaign}
              onPreflight={openPreflight}
              onSend={sendCampaign}
              sending={submitting}
            />
          )}
          {activeTab === "audiences" && (
            <Audiences
              lists={snapshot.lists}
              segments={snapshot.segments}
              profiles={snapshot.profiles}
            />
          )}
          {activeTab === "templates" && (
            <Templates templates={snapshot.templates} />
          )}
          {activeTab === "automation" && (
            <Automation journeys={snapshot.journeys} usage={snapshot.usage} />
          )}
          {activeTab === "analytics" && snapshot.analytics && (
            <Analytics analytics={snapshot.analytics} usage={snapshot.usage} />
          )}
          {activeTab === "compliance" && (
            <Compliance suppressions={snapshot.suppressions} />
          )}
        </>
      )}

      {previewCampaign && (
        <NewsletterPreviewModal
          isOpen
          onClose={() => setPreviewCampaign(null)}
          campaign={previewCampaign}
        />
      )}

      <Modal
        isOpen={Boolean(preflightCampaign)}
        onClose={() => {
          setPreflightCampaign(null);
          setPreflight(null);
        }}
        title={`Pré-vol · ${preflightCampaign?.name ?? ""}`}
        description="Les exclusions légales et opérationnelles sont évaluées côté service."
      >
        {checkingPreflight || !preflight ? (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div
              className={`rounded-xl border p-4 ${
                preflight.canSend
                  ? "border-success-border bg-success-surface"
                  : "border-danger-border bg-danger-surface"
              }`}
            >
              <div className="flex items-center gap-2">
                {preflight.canSend ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <CircleAlert className="h-5 w-5 text-danger" />
                )}
                <strong className="text-sm">
                  {preflight.canSend
                    ? "Campagne prête à être mise en file"
                    : "Des blocages empêchent l’envoi"}
                </strong>
              </div>
              <p className="mt-2 text-stone-700">
                {preflight.audience.eligible.toLocaleString("fr-FR")} éligibles
                · {preflight.audience.excluded.toLocaleString("fr-FR")} exclus ·{" "}
                {preflight.audience.selected.toLocaleString("fr-FR")}{" "}
                sélectionnés
              </p>
            </div>
            {[
              ["Blocages", preflight.blockers, "text-danger bg-danger-surface"],
              [
                "Avertissements",
                preflight.warnings,
                "text-warning bg-warning-surface",
              ],
              ["Informations", preflight.info, "text-info bg-info-surface"],
            ].map(([label, issues, tone]) => {
              const values = issues as MarketingPreflight["blockers"];
              if (!values.length) return null;
              return (
                <section key={label as string}>
                  <h3 className="mb-2 font-black">{label as string}</h3>
                  <ul className="space-y-1.5">
                    {values.map((issue) => (
                      <li
                        key={issue.code}
                        className={`rounded-lg p-3 ${tone as string}`}
                      >
                        <strong>{issue.code}</strong> · {issue.message}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            <div className="flex justify-end gap-2 border-t border-border-subtle pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreflightCampaign(null)}
              >
                Fermer
              </Button>
              {preflight.canSend && preflightCampaign && (
                <Button
                  size="sm"
                  disabled={submitting}
                  onClick={() => void sendCampaign(preflightCampaign)}
                >
                  <Send className="h-3.5 w-3.5" />
                  Mettre en file
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Créer une campagne"
        description="Le brouillon restera modifiable jusqu’au snapshot d’envoi."
      >
        <form onSubmit={createCampaign} className="space-y-4 text-xs">
          <FormField label="Nom interne" required>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Sélection Pro · septembre"
            />
          </FormField>
          <FormField label="Objet de l’email" required>
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Les nouveautés choisies pour vous"
            />
          </FormField>
          <FormField label="Texte d’aperçu">
            <Input
              value={previewText}
              onChange={(event) => setPreviewText(event.target.value)}
              placeholder="La sélection de la semaine en un coup d’œil"
            />
          </FormField>
          <FormField label="Audience" required>
            <Select
              aria-label="Audience de la campagne"
              value={audienceKey}
              onChange={(event) => setAudienceKey(event.target.value)}
              options={[
                { value: "", label: "Choisir une liste ou un segment" },
                ...audienceOptions,
              ]}
            />
          </FormField>
          <FormField label="Titre principal">
            <Input
              value={heading}
              onChange={(event) => setHeading(event.target.value)}
              placeholder="Cette semaine sur Shongre"
            />
          </FormField>
          <FormField label="Introduction">
            <Textarea
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Présentez l’information essentielle en quelques phrases."
            />
          </FormField>
          <div className="rounded-xl border border-success-border bg-success-surface p-3 text-success">
            Le bloc préférences et le désabonnement sont ajoutés
            automatiquement. Les suppressions restent prioritaires sur
            l’audience.
          </div>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Création…" : "Créer le brouillon"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}> = ({ label, value, detail, icon: Icon }) => (
  <article className="rounded-2xl border border-border-base bg-white p-5 shadow-xs">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-micro font-bold uppercase tracking-wider text-stone-500">
          {label}
        </p>
        <p className="mt-2 text-2xl font-black tabular-nums text-stone-950">
          {value}
        </p>
        <p className="mt-1 text-xs text-stone-500">{detail}</p>
      </div>
      <span className="rounded-xl bg-violet-50 p-2.5 text-violet-700">
        <Icon className="h-4 w-4" />
      </span>
    </div>
  </article>
);

const Overview: React.FC<{
  snapshot: MarketingSnapshot;
  onCampaign: (campaign: MarketingCampaign) => void;
  onPreflight: (campaign: MarketingCampaign) => void;
}> = ({ snapshot, onCampaign, onPreflight }) => (
  <div className="space-y-5">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Profils abonnés"
        value={snapshot.dashboard.activeProfiles.toLocaleString("fr-FR")}
        detail={`${snapshot.dashboard.pendingProfiles} confirmations en attente`}
        icon={Users}
      />
      <MetricCard
        label="Délivrabilité"
        value={`${(snapshot.dashboard.deliveryRate * 100).toFixed(1)} %`}
        detail={`${snapshot.dashboard.delivered.toLocaleString("fr-FR")} emails délivrés`}
        icon={CheckCircle2}
      />
      <MetricCard
        label="Taux de clic"
        value={`${(snapshot.dashboard.clickThroughRate * 100).toFixed(1)} %`}
        detail={`${snapshot.dashboard.uniqueClicks.toLocaleString("fr-FR")} clics uniques`}
        icon={BarChart3}
      />
      <MetricCard
        label="Suppressions"
        value={snapshot.dashboard.suppressedProfiles.toLocaleString("fr-FR")}
        detail={`${snapshot.dashboard.unsubscribes} désabonnements suivis`}
        icon={Ban}
      />
    </section>
    <div className="grid gap-5 xl:grid-cols-3">
      <div className="min-w-0 xl:col-span-2">
        <Campaigns
          campaigns={snapshot.campaigns.slice(0, 4)}
          onPreview={onCampaign}
          onPreflight={onPreflight}
          onSend={() => undefined}
          sending={false}
          compact
        />
      </div>
      <section className="min-w-0 rounded-2xl border border-border-base bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-success" />
          <h2 className="text-sm font-black">Garde-fous actifs</h2>
        </div>
        <ul className="mt-4 space-y-3 text-xs text-stone-600">
          {[
            "Consentement MARKETING distinct du transactionnel",
            "Suppression prioritaire sur listes, segments, imports et IA",
            "Snapshot d’audience et contenu immuables pendant l’envoi",
            "Clé idempotente par version, destinataire et variante",
            "Aucun fallback Demo ou fournisseur plateforme silencieux",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  </div>
);

const Campaigns: React.FC<{
  campaigns: MarketingCampaign[];
  onPreview: (campaign: MarketingCampaign) => void;
  onPreflight: (campaign: MarketingCampaign) => void;
  onSend: (campaign: MarketingCampaign) => void;
  sending: boolean;
  compact?: boolean;
}> = ({
  campaigns,
  onPreview,
  onPreflight,
  onSend,
  sending,
  compact = false,
}) => (
  <section className="min-w-0 rounded-2xl border border-border-base bg-white p-5 shadow-xs">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-black text-stone-950">
          {compact ? "Campagnes récentes" : "Campagnes"}
        </h2>
        <p className="mt-1 text-xs text-stone-500">
          Versions, validation, planification et file d’envoi.
        </p>
      </div>
      <Badge variant="neutral" size="sm">
        {campaigns.length}
      </Badge>
    </div>
    {campaigns.length === 0 ? (
      <EmptyState
        icon={<Mail className="h-7 w-7" />}
        title="Aucune campagne"
        description="Créez un premier brouillon à partir d’une audience existante."
        action={null}
      />
    ) : (
      <div className="divide-y divide-border-subtle">
        {campaigns.map((campaign) => (
          <article
            key={campaign.id}
            className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-black text-stone-950">
                  {campaign.name}
                </h3>
                <Badge variant={statusVariant(campaign.status)} size="sm">
                  {statusLabel[campaign.status]}
                </Badge>
                <span className="text-micro font-bold text-stone-600">
                  v{campaign.currentVersion}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-stone-600">
                {campaign.subject}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-micro text-stone-600">
                <span>{campaign.campaignType}</span>
                <span>{campaign.locale}</span>
                <span>
                  {campaign.scheduledAt
                    ? `Programmé ${formatDate(campaign.scheduledAt)}`
                    : `Mis à jour ${formatDate(campaign.updatedAt)}`}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPreview(campaign)}
                aria-label={`Aperçu de ${campaign.name}`}
              >
                <Eye className="h-3.5 w-3.5" />
                Aperçu
              </Button>
              {!["COMPLETED", "CANCELLED"].includes(campaign.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPreflight(campaign)}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Pré-vol
                </Button>
              )}
              {!compact &&
                ["DRAFT", "APPROVED", "SCHEDULED"].includes(
                  campaign.status,
                ) && (
                  <Button
                    size="sm"
                    disabled={sending}
                    onClick={() => onSend(campaign)}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Envoyer
                  </Button>
                )}
            </div>
          </article>
        ))}
      </div>
    )}
  </section>
);

const Audiences: React.FC<{
  lists: MarketingList[];
  segments: MarketingSegment[];
  profiles: MarketingProfile[];
}> = ({ lists, segments, profiles }) => (
  <div className="grid gap-5 xl:grid-cols-2">
    <section className="rounded-2xl border border-border-base bg-white p-5 shadow-xs">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-black">Listes statiques</h2>
      </div>
      <div className="mt-4 space-y-2">
        {lists.map((list) => (
          <article
            key={list.id}
            className="rounded-xl border border-border-subtle p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xs font-black">{list.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  {list.description}
                </p>
              </div>
              <strong className="text-sm tabular-nums">
                {list.memberCount.toLocaleString("fr-FR")}
              </strong>
            </div>
          </article>
        ))}
      </div>
    </section>
    <section className="rounded-2xl border border-border-base bg-white p-5 shadow-xs">
      <div className="flex items-center gap-2">
        <ListFilter className="h-4 w-4 text-violet-700" />
        <h2 className="text-sm font-black">Segments dynamiques</h2>
      </div>
      <div className="mt-4 space-y-2">
        {segments.map((segment) => (
          <article
            key={segment.id}
            className="rounded-xl border border-border-subtle p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xs font-black">{segment.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  {segment.description}
                </p>
                <p className="mt-2 text-micro font-bold uppercase tracking-wider text-stone-600">
                  {segment.definition.combinator} ·{" "}
                  {segment.definition.conditions.length} conditions
                </p>
              </div>
              <strong className="text-sm tabular-nums">
                ~{segment.estimatedCount.toLocaleString("fr-FR")}
              </strong>
            </div>
          </article>
        ))}
      </div>
    </section>
    <section className="rounded-2xl border border-border-base bg-white p-5 shadow-xs xl:col-span-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black">Profils récents</h2>
          <p className="mt-1 text-xs text-stone-500">
            Profils marketing-only et profils liés aux contacts CRM.
          </p>
        </div>
        <Badge variant="neutral" size="sm">
          Aperçu {profiles.length}
        </Badge>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-2xl text-left text-xs">
          <thead className="border-b border-border-base text-micro uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-3 py-2 font-bold">Profil</th>
              <th className="px-3 py-2 font-bold">Statut</th>
              <th className="px-3 py-2 font-bold">Source</th>
              <th className="px-3 py-2 font-bold">Sujets</th>
              <th className="px-3 py-2 font-bold">CRM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {profiles.map((profile) => (
              <tr key={profile.id}>
                <td className="px-3 py-3">
                  <strong className="block">{profile.email}</strong>
                  <span className="text-stone-600">
                    {[profile.firstName, profile.lastName]
                      .filter(Boolean)
                      .join(" ") || "Marketing-only"}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Badge
                    variant={
                      profile.status === "SUBSCRIBED"
                        ? "success"
                        : profile.status === "PENDING"
                          ? "warning"
                          : "neutral"
                    }
                    size="sm"
                  >
                    {profile.status}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-stone-600">{profile.source}</td>
                <td className="px-3 py-3 text-stone-600">
                  {profile.topics.join(", ") || "—"}
                </td>
                <td className="px-3 py-3">
                  {profile.crmContactId ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <span className="text-stone-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  </div>
);

const Templates: React.FC<{ templates: MarketingTemplate[] }> = ({
  templates,
}) => (
  <section className="rounded-2xl border border-border-base bg-white p-5 shadow-xs">
    <div className="flex items-center gap-2">
      <LayoutTemplate className="h-4 w-4 text-primary" />
      <div>
        <h2 className="text-sm font-black">Modèles versionnés</h2>
        <p className="mt-1 text-xs text-stone-500">
          Une modification future ne change jamais une campagne déjà envoyée.
        </p>
      </div>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <article
          key={template.id}
          className="rounded-2xl border border-border-subtle p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="rounded-xl bg-violet-50 p-2 text-violet-700">
              <Sparkles className="h-4 w-4" />
            </span>
            <Badge variant="neutral" size="sm">
              v{template.currentVersion}
            </Badge>
          </div>
          <h3 className="mt-4 text-sm font-black">{template.name}</h3>
          <p className="mt-1 text-xs text-stone-500">{template.subject}</p>
          <p className="mt-3 text-micro font-bold uppercase tracking-wider text-stone-600">
            {template.category} · {template.locale} ·{" "}
            {template.content.blocks.length} blocs
          </p>
        </article>
      ))}
    </div>
  </section>
);

const Automation: React.FC<{
  journeys: MarketingJourney[];
  usage: MarketingUsage | null;
}> = ({ journeys, usage }) => (
  <div className="grid gap-5 xl:grid-cols-3">
    <section className="rounded-2xl border border-border-base bg-white p-5 shadow-xs xl:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black">Parcours marketing</h2>
          <p className="mt-1 text-xs text-stone-500">
            Runtime partagé, versions immuables, attentes persistées et reprise
            idempotente.
          </p>
        </div>
        <Badge
          variant={usage?.entitlements.automation ? "success" : "warning"}
          size="sm"
        >
          {usage?.entitlements.automation ? "Droit actif" : "Non inclus"}
        </Badge>
      </div>
      <div className="mt-4 space-y-3">
        {journeys.map((journey) => (
          <article
            key={journey.id}
            className="rounded-xl border border-border-subtle p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-stone-950">
                  {journey.name}
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  {journey.description}
                </p>
              </div>
              <Badge
                variant={journey.status === "ACTIVE" ? "success" : "neutral"}
                size="sm"
              >
                {journey.status} · v{journey.currentVersion}
              </Badge>
            </div>
            <p className="mt-3 text-micro font-bold uppercase tracking-wider text-stone-600">
              {journey.definition.trigger.type} ·{" "}
              {journey.definition.nodes.length} étapes · profondeur max.{" "}
              {journey.definition.maxExecutionDepth}
            </p>
          </article>
        ))}
      </div>
    </section>
    <section className="rounded-2xl border border-border-base bg-white p-5 shadow-xs">
      <h2 className="text-sm font-black">Sécurité d’exécution</h2>
      <ul className="mt-4 space-y-3 text-xs text-stone-600">
        {[
          "Boucles rejetées à l’activation",
          "Clé idempotente par événement et version",
          "Attentes et reprises côté worker",
          "Consentement et fréquence revérifiés avant envoi",
        ].map((item) => (
          <li key={item} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  </div>
);

const Analytics: React.FC<{
  analytics: MarketingAnalytics;
  usage: MarketingUsage | null;
}> = ({ analytics, usage }) => (
  <div className="space-y-5">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Délivrés"
        value={analytics.delivered.toLocaleString("fr-FR")}
        detail={`${(analytics.deliveryRate * 100).toFixed(1)} % des acceptés`}
        icon={CheckCircle2}
      />
      <MetricCard
        label="Clics uniques"
        value={analytics.uniqueClicks.toLocaleString("fr-FR")}
        detail={`${(analytics.clickThroughRate * 100).toFixed(1)} % de CTR`}
        icon={BarChart3}
      />
      <MetricCard
        label="Conversions"
        value={analytics.conversions.toLocaleString("fr-FR")}
        detail={`${(analytics.conversionRate * 100).toFixed(1)} % des délivrés`}
        icon={Sparkles}
      />
      <MetricCard
        label="Envois du mois"
        value={(usage?.attemptedSends ?? 0).toLocaleString("fr-FR")}
        detail={`Quota ${(usage?.entitlements.maxMonthlySends ?? 0).toLocaleString("fr-FR")}`}
        icon={Send}
      />
    </section>
    <section className="rounded-2xl border border-border-base bg-white p-5 shadow-xs">
      <h2 className="text-sm font-black">Qualité et délivrabilité</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-xs">
        <div className="rounded-xl bg-stone-100 p-3">
          <strong className="block text-lg">{analytics.softBounces}</strong>
          Bounces temporaires
        </div>
        <div className="rounded-xl bg-stone-100 p-3">
          <strong className="block text-lg">{analytics.hardBounces}</strong>
          Bounces durs
        </div>
        <div className="rounded-xl bg-stone-100 p-3">
          <strong className="block text-lg">{analytics.complaints}</strong>
          Plaintes
        </div>
        <div className="rounded-xl bg-stone-100 p-3">
          <strong className="block text-lg">{analytics.unsubscribes}</strong>
          Désabonnements
        </div>
      </div>
      <p className="mt-4 text-micro text-stone-500">
        {analytics.openMetricCaveat}
      </p>
    </section>
  </div>
);

const Compliance: React.FC<{ suppressions: MarketingSuppression[] }> = ({
  suppressions,
}) => (
  <div className="grid gap-5 xl:grid-cols-3">
    <section className="rounded-2xl border border-border-base bg-white p-5 shadow-xs xl:col-span-2">
      <div className="flex items-center gap-2">
        <Ban className="h-4 w-4 text-danger" />
        <div>
          <h2 className="text-sm font-black">Suppressions actives</h2>
          <p className="mt-1 text-xs text-stone-500">
            Elles gagnent toujours sur listes, segments, imports,
            automatisations et suggestions IA.
          </p>
        </div>
      </div>
      {suppressions.length ? (
        <div className="mt-4 divide-y divide-border-subtle">
          {suppressions.map((suppression) => (
            <article
              key={suppression.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div>
                <strong className="text-xs">
                  {suppression.normalizedEmail}
                </strong>
                <p className="mt-1 text-micro text-stone-500">
                  {suppression.source} · {formatDate(suppression.occurredAt)}
                </p>
              </div>
              <Badge variant="warning" size="sm">
                {suppression.reason}
              </Badge>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-success-border bg-success-surface p-4 text-xs text-success">
          Aucune suppression ajoutée pendant cette session de démonstration. Les
          profils non éligibles restent exclus par leur statut.
        </div>
      )}
    </section>
    <section className="rounded-2xl border border-border-base bg-white p-5 shadow-xs">
      <div className="flex items-center gap-2">
        <Clock3 className="h-4 w-4 text-violet-700" />
        <h2 className="text-sm font-black">Finalités séparées</h2>
      </div>
      <div className="mt-4 space-y-3 text-xs">
        <div className="rounded-xl bg-violet-50 p-3 text-violet-950">
          <strong className="block">MARKETING</strong>
          Bloqué par désabonnement, plainte, bounce dur ou suppression légale.
        </div>
        <div className="rounded-xl bg-stone-100 p-3 text-stone-700">
          <strong className="block">TRANSACTIONAL / SECURITY</strong>
          N’est pas bloqué automatiquement par un désabonnement Newsletter.
        </div>
      </div>
      <p className="mt-4 text-micro leading-relaxed text-stone-500">
        La preuve de consentement est historisée par canal, finalité, source et
        version. Les événements ne sont pas modifiables.
      </p>
    </section>
  </div>
);
