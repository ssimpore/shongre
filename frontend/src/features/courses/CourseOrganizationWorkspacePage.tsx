import React, { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Inbox,
  Lock,
  MapPin,
  Plus,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type { CourseOrganizationWorkspace } from "@shongre/contracts/courses";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { isCoursePlanFeatureOperational } from "@shongre/contracts/vertical-monetization-adapters";
import { services } from "../../api/client/service-registry";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { routes } from "../../configuration/routes";
import {
  Badge,
  Button,
  FormField,
  Input,
  Modal,
  ScrollableRegion,
  Select,
  Skeleton,
  StatePanel,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";
import { useTranslation } from "../../i18n/I18nProvider";
import { getPermissionDisplayName } from "../../security/permissions";

const ROLE_LABELS = {
  owner: "Propriétaire",
  admin: "Administrateur",
  manager: "Responsable",
  tutor: "Professeur",
  lead_coordinator: "Coordination des demandes",
  billing: "Facturation",
} as const;

export const CourseOrganizationWorkspacePage: React.FC = () => {
  const { activeMarket } = useMarketLocation();
  const { formatNumber } = useRegionalFormatters();
  const { t } = useTranslation();
  const toast = useToast();
  const [workspace, setWorkspace] =
    useState<CourseOrganizationWorkspace | null>(null);
  const [error, setError] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState<
    "tutor" | "manager" | "lead_coordinator"
  >("tutor");
  const [locationLabel, setLocationLabel] = useState("");
  const [saving, setSaving] = useState(false);

  usePageMeta({
    title: t("verticals.education.organizationTitle"),
    description: "Équipe, lieux, cours et demandes centralisés.",
    canonicalPath: "/compte/education/organisation",
    noIndex: true,
  });

  useEffect(() => {
    services.courses
      .getOrganizationWorkspace("org_college_lumiere")
      .then(setWorkspace)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <StatePanel
        title="Espace organisme inaccessible"
        description="Vérifiez votre appartenance et vos permissions d’équipe."
        action={
          <Button to="/compte/education">
            {t("verticals.education.returnToWorkspace")}
          </Button>
        }
      />
    );
  }
  if (!workspace) return <Skeleton className="h-160 w-full rounded-card" />;

  const { organization, analytics, plan } = workspace;
  const teamManagementAvailable = isCoursePlanFeatureOperational(
    BASELINE_MONETIZATION_CATALOG,
    plan.id,
    "teamMembers",
  );
  const locationManagementAvailable = isCoursePlanFeatureOperational(
    BASELINE_MONETIZATION_CATALOG,
    plan.id,
    "locations",
  );
  const centralInboxAvailable = isCoursePlanFeatureOperational(
    BASELINE_MONETIZATION_CATALOG,
    plan.id,
    "centralLeadInbox",
  );

  const inviteMember = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const next = await services.courses.inviteOrganizationMember(
        organization.id,
        { email: memberName, role: memberRole },
      );
      setWorkspace(next);
      setMemberName("");
      setInviteOpen(false);
      toast.success("Invitation ajoutée à l’espace organisme.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Invitation impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  const addLocation = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const next = await services.courses.addOrganizationLocation(
        organization.id,
        { label: locationLabel },
      );
      setWorkspace(next);
      setLocationLabel("");
      setLocationOpen(false);
      toast.success("Lieu ajouté à l’espace organisme.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Ajout impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black text-text-main sm:text-2xl">
              {organization.publicName}
            </h1>
            <Badge variant="pro">Organisme</Badge>
            {organization.verificationStatus === "verified" && (
              <Badge variant="success" icon>
                Vérifié
              </Badge>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-xs text-text-secondary">
            {organization.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setInviteOpen(true)}
            disabled={!teamManagementAvailable}
            variant="outline"
            size="compact"
            leftIcon={<UserPlus className="h-icon-sm w-icon-sm" />}
          >
            {teamManagementAvailable
              ? "Inviter un membre"
              : "Invitations indisponibles"}
          </Button>
          <Button
            to={routes.courses.publish()}
            size="compact"
            leftIcon={<Plus className="h-icon-sm w-icon-sm" />}
          >
            Ajouter un cours
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs lg:grid-cols-5">
        {[
          [BarChart3, "Vues", formatNumber(analytics.profileViews)],
          [Inbox, "Demandes", analytics.leadsReceived],
          [CheckCircle2, "Acceptées", analytics.leadsAccepted],
          [Users, "Professeurs", analytics.activeTutors],
          [BookOpen, "Cours actifs", organization.activeOfferCount],
        ].map(([Icon, label, value], index) => {
          const MetricIcon = Icon as React.ComponentType<{
            className?: string;
          }>;
          return (
            <article
              key={String(label)}
              className={`p-4 ${index ? "border-l border-border-subtle" : ""} ${index === 4 ? "col-span-2 border-t lg:col-span-1 lg:border-t-0" : ""}`}
            >
              <p className="flex items-center gap-1.5 text-micro font-semibold text-text-muted">
                <MetricIcon className="h-icon-xs w-icon-xs" />
                {String(label)}
              </p>
              <p className="mt-1 text-lg font-black text-text-main">
                {String(value)}
              </p>
              <p className="text-micro text-text-muted">30 derniers jours</p>
            </article>
          );
        })}
      </section>

      <div className="grid gap-5 xl:grid-cols-content-aside">
        <main className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
            <div className="flex items-center justify-between gap-3 border-b border-border-subtle p-4">
              <div>
                <h2 className="text-sm font-black text-text-main">
                  Équipe et permissions
                </h2>
                <p className="mt-0.5 text-micro text-text-muted">
                  Les accès sont accordés par rôle, jamais par simple
                  appartenance.
                </p>
              </div>
              <Badge variant="neutral">
                {organization.memberCount} membres
              </Badge>
            </div>
            {!teamManagementAvailable && (
              <p className="border-b border-warning-border bg-warning-surface px-4 py-3 text-xs text-warning">
                Consultation uniquement : les invitations restent suspendues
                jusqu’à la disponibilité du parcours de production.
              </p>
            )}
            <ScrollableRegion aria-label="Tableau des membres de l’organisme">
              <table className="w-full min-w-168 text-left text-xs">
                <thead className="bg-bg-subtle text-micro font-bold uppercase tracking-wide text-text-secondary">
                  <tr>
                    <th className="px-4 py-2.5">Membre</th>
                    <th className="px-4 py-2.5">Rôle</th>
                    <th className="px-4 py-2.5">Permissions</th>
                    <th className="px-4 py-2.5">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {workspace.members.map((member) => (
                    <tr key={member.id}>
                      <td className="px-4 py-3 font-bold text-text-main">
                        {member.displayName}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {ROLE_LABELS[member.role]}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {member.permissions
                          .slice(0, 2)
                          .map(getPermissionDisplayName)
                          .join(" · ")}
                        {member.permissions.length > 2
                          ? ` +${member.permissions.length - 2}`
                          : ""}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            member.status === "active" ? "success" : "warning"
                          }
                        >
                          {member.status === "active" ? "Actif" : "Invité"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableRegion>
          </section>

          <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black text-text-main">
                Lieux d’enseignement
              </h2>
              <Button
                onClick={() => setLocationOpen(true)}
                disabled={!locationManagementAvailable}
                variant="ghost"
                size="sm"
                leftIcon={<Plus className="h-icon-xs w-icon-xs" />}
              >
                {locationManagementAvailable
                  ? "Ajouter un lieu"
                  : "Ajout indisponible"}
              </Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {workspace.locations.map((location) => (
                <article
                  key={location.id}
                  className="rounded-card border border-border-subtle p-4"
                >
                  <MapPin className="h-icon-md w-icon-md text-primary" />
                  <p className="mt-2 text-xs font-black text-text-main">
                    {location.label}
                  </p>
                  <p className="mt-1 text-micro text-text-muted">
                    {location.activeTutorCount} professeurs actifs
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-text-main">
                  Boîte de réception centralisée
                </h2>
                <p className="mt-0.5 text-micro text-text-muted">
                  L’affectation par matière, niveau, lieu et disponibilité reste
                  suspendue.
                </p>
              </div>
              <Badge variant="primary">
                {centralInboxAvailable
                  ? `${analytics.leadsReceived - analytics.leadsAccepted} à traiter`
                  : "Indisponible"}
              </Badge>
            </div>
            {centralInboxAvailable ? (
              <div className="mt-4 rounded-card border border-info-border bg-info-surface p-4 text-xs text-text-secondary">
                Les coordonnées sont retenues jusqu’à l’acceptation de la
                demande par un membre autorisé. Les refus et contestations de
                lead restent auditables.
              </div>
            ) : (
              <div className="mt-4 rounded-card border border-warning-border bg-warning-surface p-4 text-xs text-warning">
                La boîte centralisée n’est pas incluse tant que son parcours de
                production reste suspendu.
              </div>
            )}
          </section>
        </main>

        <aside className="space-y-4">
          <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-black text-text-main">
              <Building2 className="h-icon-sm w-icon-sm text-primary" />
              Formule
            </h2>
            <p className="mt-3 text-lg font-black text-text-main">
              {plan.name}
            </p>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-text-muted">Membres</dt>
                <dd className="font-bold">
                  {teamManagementAvailable
                    ? `${organization.memberCount} / ${plan.entitlements.teamMembers}`
                    : `${organization.memberCount} · lecture seule`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Lieux</dt>
                <dd className="font-bold">
                  {locationManagementAvailable
                    ? `${workspace.locations.length} / ${plan.entitlements.locations}`
                    : `${workspace.locations.length} · lecture seule`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Cours</dt>
                <dd className="font-bold">
                  {organization.activeOfferCount} /{" "}
                  {plan.entitlements.maxActiveOffers}
                </dd>
              </div>
            </dl>
            <Button
              to={routes.workspace.pro.subscriptions()}
              variant="ghost"
              size="sm"
              className="mt-3"
            >
              Gérer la formule
            </Button>
          </section>
          <section className="rounded-card border border-success-border bg-success-surface p-4">
            <h2 className="flex items-center gap-2 text-sm font-black text-text-main">
              <ShieldCheck className="h-icon-sm w-icon-sm text-success" />
              Organisme vérifié
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">
              Le statut public ne révèle ni document, ni identifiant
              administratif privé.
            </p>
          </section>
          <section className="rounded-card border border-warning-border bg-warning-surface p-4">
            <h2 className="flex items-center gap-2 text-sm font-black text-text-main">
              <Lock className="h-icon-sm w-icon-sm text-warning" />
              Paiements désactivés
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">
              Les réservations et versements restent hors service sur le marché
              {activeMarket.name}.
            </p>
          </section>
        </aside>
      </div>
      <Modal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Inviter un membre"
        description="L’invitation reste en attente jusqu’à l’acceptation du membre."
      >
        <form onSubmit={inviteMember} className="space-y-4">
          <FormField label="Adresse e-mail du membre" required>
            <Input
              type="email"
              value={memberName}
              onChange={(event) => setMemberName(event.target.value)}
              autoFocus
              required
            />
          </FormField>
          <FormField label="Rôle" required>
            <Select
              aria-label="Rôle du membre"
              value={memberRole}
              onChange={(event) =>
                setMemberRole(event.target.value as typeof memberRole)
              }
            >
              <option value="tutor">Professeur</option>
              <option value="manager">Responsable</option>
              <option value="lead_coordinator">
                Coordination des demandes
              </option>
            </Select>
          </FormField>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setInviteOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" isLoading={saving}>
              Envoyer l’invitation
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={locationOpen}
        onClose={() => setLocationOpen(false)}
        title="Ajouter un lieu"
        description="Ce lieu sera disponible pour l’affectation des professeurs et des cours."
      >
        <form onSubmit={addLocation} className="space-y-4">
          <FormField label="Nom ou zone du lieu" required>
            <Input
              value={locationLabel}
              onChange={(event) => setLocationLabel(event.target.value)}
              placeholder="Ex. Lyon 6e"
              autoFocus
              required
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLocationOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" isLoading={saving}>
              Ajouter le lieu
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
