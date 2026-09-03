import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  BadgeCheck,
  Boxes,
  CreditCard,
  ExternalLink,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Plus,
  Sparkles,
  Tags,
  Target,
  UsersRound,
  Unplug,
} from "lucide-react";
import type {
  CrmAccount,
  CrmActivity,
  CrmContact,
  CrmOpportunity,
  CrmShongreIntelligence,
} from "@shongre/contracts/crm";
import { services } from "../../../api/client/service-registry";
import { Button } from "../../../design-system/primitives/Button";
import { Modal } from "../../../design-system/primitives/Modal";
import {
  FormField,
  Input,
  Select,
  Textarea,
} from "../../../design-system/primitives/FormField";
import { Skeleton } from "../../../design-system";
import { useToast } from "../../../app/providers/ToastProvider";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useCrmSurface } from "../../crm/CrmSurfaceContext";
import { useTranslation } from "../../../i18n/I18nProvider";
import { sourceMessageKey } from "../../../domains/crm/crm.labels";

function money(amountMinor: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

const lifecycleOptions = [
  { value: "lead", label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "qualified", label: "Qualifié" },
  { value: "customer", label: "Client" },
  { value: "partner", label: "Partenaire" },
  { value: "do_not_contact", label: "Ne pas contacter" },
  { value: "archived", label: "Archivé" },
];

export const CrmCompanyDetailPage: React.FC = () => {
  const { id = "" } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const crmPaths = useCrmSurface();
  const { activeMarket, currentLocale } = useMarketLocation();
  const toast = useToast();
  const [account, setAccount] = useState<CrmAccount | null>(null);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [shongre, setShongre] = useState<CrmShongreIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteOpen, setNoteOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  usePageMeta({
    title: account
      ? `${account.name} | CRM Shongre`
      : "Entreprise CRM | Shongre",
    description: t("admin.crmCompanyDetailPage.vueCompleteDuCompteCrm"),
    canonicalPath: id ? crmPaths.company(id) : undefined,
    noIndex: true,
  });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [item, contactPage, opportunityPage, intelligence] =
        await Promise.all([
          services.crm.getAccount(id),
          services.crm.listContacts({ limit: 100 }),
          services.crm.listOpportunities({ limit: 100 }),
          services.crm.getAccountShongreIntelligence(id),
        ]);
      if (
        crmPaths.kind === "prospects" &&
        item.marketCode !== activeMarket.code
      ) {
        setAccount(null);
        return;
      }
      setAccount(item);
      setShongre(intelligence);
      setContacts(
        contactPage.items.filter((contact) =>
          contact.accountIds.includes(item.id),
        ),
      );
      setOpportunities(
        opportunityPage.items.filter(
          (opportunity) => opportunity.accountId === item.id,
        ),
      );
      setActivities(await services.crm.listActivities("account", item.id));
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Entreprise introuvable.",
      );
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [activeMarket.code, crmPaths.kind, id]);

  const updateLifecycle = async (value: CrmAccount["lifecycle"]) => {
    if (!account) return;
    try {
      const updated = await services.crm.updateAccount(
        account.id,
        account.version,
        {
          lifecycle: value,
        },
      );
      setAccount(updated);
      toast.success("Cycle de vie mis à jour.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Mise à jour impossible.",
      );
    }
  };

  const addNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!account || !note.trim()) return;
    setSubmitting(true);
    try {
      const activity = await services.crm.createActivity({
        entityType: "account",
        entityId: account.id,
        activityType: "NOTE_CREATED",
        title: "Note entreprise",
        description: note.trim(),
      });
      setActivities((items) => [activity, ...items]);
      setNote("");
      setNoteOpen(false);
      toast.success("Note enregistrée.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Note non enregistrée.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const updateTags = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!account) return;
    const uniqueTags = new Map<string, string>();
    for (const rawTag of tagDraft.split(",")) {
      const tag = rawTag.trim();
      const key = tag.toLocaleLowerCase("fr");
      if (tag && !uniqueTags.has(key)) uniqueTags.set(key, tag);
    }
    const tags = [...uniqueTags.values()];
    if (tags.length > 50) {
      toast.error("Une fiche ne peut pas contenir plus de 50 tags.");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await services.crm.updateAccount(
        account.id,
        account.version,
        { tags },
      );
      setAccount(updated);
      setTagsOpen(false);
      toast.success("Tags mis à jour.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Mise à jour impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  if (!account)
    return (
      <section className="rounded-2xl border border-border-base bg-bg-surface p-10 text-center">
        <Building2 className="mx-auto h-8 w-8 text-text-disabled" />
        <h1 className="mt-3 text-lg font-bold">Entreprise introuvable</h1>
        <Button
          className="mt-4"
          size="sm"
          onClick={() => navigate(crmPaths.companies)}
        >
          {t("admin.crmCompanyDetailPage.retourAuxEntreprises")}
        </Button>
      </section>
    );

  const accountSourceKey = sourceMessageKey(account.source);
  const accountSourceLabel = accountSourceKey
    ? t(accountSourceKey)
    : account.source;
  const openValue = opportunities
    .filter((opportunity) => opportunity.status === "open")
    .reduce((sum, opportunity) => sum + opportunity.amount.amountMinor, 0);
  const currency = opportunities[0]?.amount.currency ?? "EUR";

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-text-inverse shadow-sm sm:p-6">
        <Link
          to={crmPaths.companies}
          className="inline-flex items-center gap-1 text-micro font-bold uppercase tracking-wider text-text-disabled hover:text-text-inverse"
        >
          <ArrowLeft className="h-icon-sm w-icon-sm" /> Entreprises
        </Link>
        <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-control border border-stone-700 bg-stone-900 text-lg font-bold">
              {account.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {account.name}
                </h1>
                {account.fitScore !== undefined && (
                  <span className="inline-flex items-center gap-1 rounded-pill bg-violet-950 px-2 py-1 text-micro font-bold text-violet-300">
                    <Sparkles className="h-icon-xs w-icon-xs" /> Fit{" "}
                    {account.fitScore}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-text-disabled">
                {account.industry ?? "Secteur non renseigné"} ·{" "}
                {[account.city, account.country].filter(Boolean).join(", ")}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-micro text-text-disabled">
                {account.website && (
                  <a
                    href={account.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-text-inverse"
                  >
                    {account.domain ?? account.website}
                    <ExternalLink className="h-icon-xs w-icon-xs" />
                  </a>
                )}
                {account.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-icon-xs w-icon-xs" /> {account.email}
                  </span>
                )}
                {account.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-icon-xs w-icon-xs" /> {account.phone}
                  </span>
                )}
              </div>
              {account.tags.length > 0 && (
                <div
                  className="mt-3 flex flex-wrap gap-1.5"
                  aria-label="Tags CRM"
                >
                  {account.tags.map((tag) => (
                    <span
                      key={tag.toLocaleLowerCase("fr")}
                      className="rounded-pill border border-stone-700 bg-stone-900 px-2 py-1 text-micro font-bold text-stone-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <label>
              <span className="sr-only">
                {t("admin.adminFeatureFlagsPage.cycleDeVie")}
              </span>
              <Select
                aria-label={t(
                  "admin.crmCompanyDetailPage.cycleDeVieDeLEntreprise",
                )}
                value={account.lifecycle}
                onChange={(event) =>
                  void updateLifecycle(
                    event.target.value as CrmAccount["lifecycle"],
                  )
                }
                options={lifecycleOptions}
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              className="border-stone-700 bg-stone-900 text-text-inverse hover:bg-stone-800"
              onClick={() => setNoteOpen(true)}
            >
              <MessageSquareText className="h-icon-md w-icon-md" /> Note
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-stone-700 bg-stone-900 text-text-inverse hover:bg-stone-800"
              onClick={() => {
                setTagDraft(account.tags.join(", "));
                setTagsOpen(true);
              }}
            >
              <Tags className="h-icon-md w-icon-md" /> Tags
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article className="rounded-2xl border border-border-base bg-bg-surface p-4 shadow-xs">
          <span className="text-micro font-bold uppercase tracking-wider text-stone-500">
            Contacts
          </span>
          <strong className="mt-1 block text-2xl font-bold">
            {contacts.length}
          </strong>
        </article>
        <article className="rounded-2xl border border-border-base bg-bg-surface p-4 shadow-xs">
          <span className="text-micro font-bold uppercase tracking-wider text-stone-500">
            {t("admin.crmCompanyDetailPage.opportunitesOuvertes")}
          </span>
          <strong className="mt-1 block text-2xl font-bold">
            {opportunities.filter((item) => item.status === "open").length}
          </strong>
        </article>
        <article className="rounded-2xl border border-border-base bg-bg-surface p-4 shadow-xs">
          <span className="text-micro font-bold uppercase tracking-wider text-stone-500">
            {t("admin.crmCompanyDetailPage.pipeline")}
          </span>
          <strong className="mt-1 block text-2xl font-bold text-primary">
            {money(openValue, currency, currentLocale)}
          </strong>
        </article>
        <article className="rounded-2xl border border-border-base bg-bg-surface p-4 shadow-xs">
          <span className="text-micro font-bold uppercase tracking-wider text-stone-500">
            {t("invoicing.product.previewMarket")}
          </span>
          <strong className="mt-1 block text-2xl font-bold">
            {account.marketCode}
          </strong>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border-base bg-bg-surface shadow-xs">
        <div className="flex flex-col gap-2 border-b border-border-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                <Boxes className="h-icon-md w-icon-md" />
              </span>
              <h2 className="text-sm font-bold">Intelligence Shongre</h2>
              {shongre?.organization?.verified && (
                <span className="inline-flex items-center gap-1 rounded-pill bg-success-surface px-2 py-1 text-micro font-bold text-success">
                  <BadgeCheck className="h-icon-xs w-icon-xs" />{" "}
                  {t("identityBadge.verification.professional")}
                </span>
              )}
            </div>
            <p className="mt-1 text-micro text-stone-500">
              {t(
                "admin.crmCompanyDetailPage.lectureDesDomainesCanoniquesLeCrmNeModifieNiAnnonces",
              )}
            </p>
          </div>
          {shongre?.lastSynchronizedAt && (
            <time className="text-micro text-stone-500">
              {t("admin.crmCompanyDetailPage.synchroniseLe")}{" "}
              {new Intl.DateTimeFormat(currentLocale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(shongre.lastSynchronizedAt))}
            </time>
          )}
        </div>
        {!shongre?.linked ? (
          <div className="flex items-start gap-3 p-5 text-xs text-text-secondary">
            <Unplug className="mt-0.5 h-icon-md w-icon-md shrink-0 text-text-disabled" />
            <div>
              <strong className="block text-text-main">
                {t("admin.crmCompanyDetailPage.aucuneOrganisationShongreLiee")}
              </strong>
              {t(
                "admin.crmCompanyDetailPage.cetteFicheResteUnCompteCrmAutonomeUneReferenceExterne",
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-0 divide-y divide-border-subtle md:grid-cols-3 md:divide-x md:divide-y-0">
            <article className="p-5">
              <div className="flex items-center gap-2 text-stone-500">
                <Building2 className="h-icon-md w-icon-md" />
                <span className="text-micro font-bold uppercase tracking-wider">
                  Profil Pro
                </span>
              </div>
              <strong className="mt-2 block text-sm font-bold">
                {shongre.organization?.name}
              </strong>
              <p className="mt-1 text-xs text-stone-500">
                {shongre.professional.ownerName} ·{" "}
                {shongre.organization?.marketCode}
              </p>
              <p className="mt-3 text-micro text-stone-500">
                Email{" "}
                {shongre.professional.emailVerified ? "vérifié" : "non vérifié"}{" "}
                {t("admin.crmCompanyDetailPage.telephone")}{" "}
                {shongre.professional.phoneVerified ? "vérifié" : "non vérifié"}
              </p>
            </article>
            <article className="p-5">
              <div className="flex items-center gap-2 text-stone-500">
                <Boxes className="h-icon-md w-icon-md" />
                <span className="text-micro font-bold uppercase tracking-wider">
                  {t("admin.adminMarketsPage.annonces")}
                </span>
              </div>
              <strong className="mt-2 block text-2xl font-bold">
                {shongre.listings.published}
                <span className="text-xs font-bold text-text-muted">
                  {" "}
                  / {shongre.listings.total}{" "}
                  {t("admin.crmCompanyDetailPage.publiees")}
                </span>
              </strong>
              <ul className="mt-2 space-y-1.5">
                {shongre.listings.recent.slice(0, 2).map((listing) => (
                  <li
                    key={listing.id}
                    className="truncate text-micro text-text-secondary"
                  >
                    {listing.title}
                  </li>
                ))}
              </ul>
            </article>
            <article className="p-5">
              <div className="flex items-center gap-2 text-stone-500">
                <CreditCard className="h-icon-md w-icon-md" />
                <span className="text-micro font-bold uppercase tracking-wider">
                  Abonnement
                </span>
              </div>
              <strong className="mt-2 block text-sm font-bold capitalize">
                {shongre.subscription.status ?? "Aucun abonnement actif"}
              </strong>
              {shongre.subscription.productId && (
                <p className="mt-1 text-xs text-stone-500">
                  {shongre.subscription.productId.replaceAll("-", " ")}
                </p>
              )}
              {shongre.subscription.currentPeriodEndsAt && (
                <p className="mt-3 text-micro text-stone-500">
                  {t("admin.crmCompanyDetailPage.periodeJusquAu")}{" "}
                  {new Intl.DateTimeFormat(currentLocale, {
                    dateStyle: "medium",
                  }).format(new Date(shongre.subscription.currentPeriodEndsAt))}
                </p>
              )}
            </article>
          </div>
        )}
        {shongre?.linked && (
          <div className="flex flex-wrap gap-2 border-t border-border-subtle bg-stone-50 px-5 py-3 text-micro text-stone-500">
            {[
              ["Publicité", shongre.advertising.availability],
              ["Leads", shongre.leads.availability],
              [
                "Activité marketplace",
                shongre.marketplaceActivity.availability,
              ],
            ].map(([label, availability]) => (
              <span
                key={label}
                className="rounded-pill border border-stone-200 bg-bg-surface px-2 py-1"
              >
                {label} ·{" "}
                {availability === "not_connected"
                  ? "non connecté"
                  : availability}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* The explicit `grid-cols-1` is not cosmetic. Without it the single
          column below `xl` is an *implicit* track sized `auto`, whose floor is
          the content's min-content width — so this panel rendered 359px wide
          inside a 320px viewport and took the whole document with it.
          `grid-cols-1` compiles to `repeat(1, minmax(0, 1fr))`, which can
          shrink; the `xl:` override already does. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <section className="rounded-2xl border border-border-base bg-bg-surface shadow-xs">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
              <div>
                <h2 className="text-sm font-bold">
                  {t("admin.crmOverviewPage.opportunites")}
                </h2>
                <p className="text-micro text-stone-500">
                  {t("admin.crmCompanyDetailPage.pipelineAssocieACeCompte")}
                </p>
              </div>
              <Button to={crmPaths.pipeline} variant="outline" size="sm">
                <Plus className="h-icon-md w-icon-md" /> Ajouter
              </Button>
            </div>
            <div className="divide-y divide-border-subtle px-5">
              {opportunities.length === 0 ? (
                <p className="py-8 text-center text-xs text-stone-500">
                  {t("admin.crmCompanyDetailPage.aucuneOpportuniteAssociee")}
                </p>
              ) : (
                opportunities.map((opportunity) => (
                  <div
                    key={opportunity.id}
                    className="flex items-center gap-3 py-3"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
                      <Target className="h-icon-md w-icon-md" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {/* `block` is load-bearing: `truncate` sets
                          `overflow:hidden` and `white-space:nowrap`, neither of
                          which applies to an inline box. Without it the link
                          never ellipsised and its full unbreakable width fed the
                          grid's min-content, widening the whole page to 375px
                          inside a 320px viewport. */}
                      <Link
                        to={crmPaths.opportunity(opportunity.id)}
                        className="block truncate text-xs font-bold text-text-main hover:text-primary"
                      >
                        {opportunity.name}
                      </Link>
                      <p className="text-micro text-stone-500">
                        {opportunity.stageName} · {opportunity.probability}%
                      </p>
                    </div>
                    <strong className="text-xs font-bold tabular-nums">
                      {money(
                        opportunity.amount.amountMinor,
                        opportunity.amount.currency,
                        currentLocale,
                      )}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-border-base bg-bg-surface shadow-xs">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
              <div>
                <h2 className="text-sm font-bold">
                  {t("admin.crmCompanyDetailPage.activiteRecente")}
                </h2>
                <p className="text-micro text-stone-500">
                  {t("admin.crmCompanyDetailPage.notesEtInteractionsDuCompte")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNoteOpen(true)}
              >
                <Plus className="h-icon-md w-icon-md" /> Note
              </Button>
            </div>
            <div className="divide-y divide-border-subtle px-5">
              {activities.length === 0 ? (
                <p className="py-8 text-center text-xs text-stone-500">
                  {t("admin.crmCompanyDetailPage.aucuneActiviteEnregistree")}
                </p>
              ) : (
                activities.map((activity) => (
                  <article key={activity.id} className="flex gap-3 py-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-stone-100 text-text-secondary">
                      <MessageSquareText className="h-icon-sm w-icon-sm" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-xs font-bold">
                          {activity.title}
                        </strong>
                        <time className="text-micro text-stone-500">
                          {new Intl.DateTimeFormat(currentLocale, {
                            dateStyle: "medium",
                          }).format(new Date(activity.occurredAt))}
                        </time>
                      </div>
                      {activity.description && (
                        <p className="mt-1 text-xs text-text-secondary">
                          {activity.description}
                        </p>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
        <aside className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-border-base bg-bg-surface shadow-xs">
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3.5">
              <div>
                <h2 className="text-sm font-bold">Contacts</h2>
                <p className="text-micro text-stone-500">
                  {t("admin.crmCompanyDetailPage.personnesLiees")}
                </p>
              </div>
              <UsersRound className="h-icon-md w-icon-md text-primary" />
            </div>
            <div className="divide-y divide-border-subtle px-4">
              {contacts.length === 0 ? (
                <p className="py-7 text-center text-xs text-stone-500">
                  {t("admin.crmCompanyDetailPage.aucunContactLie")}
                </p>
              ) : (
                contacts.map((contact) => (
                  <Link
                    key={contact.id}
                    to={crmPaths.contact(contact.id)}
                    className="flex items-center gap-3 py-3 hover:text-primary"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-stone-950 text-micro font-bold text-text-inverse">
                      {contact.firstName[0]}
                      {contact.lastName[0]}
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-xs">
                        {contact.fullName}
                      </strong>
                      <span className="block truncate text-micro text-stone-500">
                        {contact.jobTitle ?? contact.email ?? "Contact"}
                      </span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-border-base bg-bg-surface p-4 shadow-xs">
            <h2 className="text-sm font-bold">Adresse & qualification</h2>
            <dl className="mt-3 divide-y divide-border-subtle text-xs">
              {[
                ["Adresse", account.address ?? "Non renseignée"],
                [
                  "Ville",
                  [account.postalCode, account.city]
                    .filter(Boolean)
                    .join(" ") || "Non renseignée",
                ],
                ["Région", account.region ?? "Non renseignée"],
                ["Pays", account.country],
                ["Source", accountSourceLabel],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 py-2.5">
                  <dt className="shrink-0 text-stone-500">{label}</dt>
                  <dd className="min-w-0 break-words text-right font-bold text-stone-800">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {account.city && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-micro text-stone-500">
                <MapPin className="h-icon-sm w-icon-sm" />{" "}
                {t(
                  "admin.crmCompanyDetailPage.donneeDeclarativeAucuneGeolocalisationImplicite",
                )}
              </div>
            )}
          </section>
        </aside>
      </div>

      <Modal
        isOpen={noteOpen}
        onClose={() => setNoteOpen(false)}
        title={t("admin.crmCompanyDetailPage.ajouterUneNoteEntreprise")}
        description={t(
          "admin.crmCompanyDetailPage.laNoteEstAjouteeALHistoriqueCrmDuCompte",
        )}
      >
        <form onSubmit={addNote} className="space-y-4 text-xs">
          <FormField label="Note" required>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={5}
              required
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNoteOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={tagsOpen}
        onClose={() => setTagsOpen(false)}
        title={t("admin.crmCompanyDetailPage.gererLesTags")}
        description={t(
          "admin.crmCompanyDetailPage.lesTagsSontNormalisesDansLeCatalogueDuTenantEt",
        )}
      >
        <form onSubmit={updateTags} className="space-y-4 text-xs">
          <FormField
            label={t("admin.crmCompanyDetailPage.tagsSeparesParDesVirgules")}
            hint="50 tags maximum, 80 caractères par tag."
          >
            <Input
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              placeholder={t(
                "admin.crmCompanyDetailPage.compteCleMobilierRelanceQ4",
              )}
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTagsOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
