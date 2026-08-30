import React, { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Cable,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  KeyRound,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { ProviderControlPlaneSnapshot } from "@shongre/contracts/provider-platform";
import {
  PROVIDER_CREDENTIAL_CONSTRAINTS,
  type ProviderConnection,
} from "@shongre/contracts/provider-connections";
import { useLocation } from "react-router-dom";
import { services } from "../../../api/client/service-registry";
import { Button } from "../../../design-system/primitives/Button";
import {
  FormField,
  Input,
  Select,
} from "../../../design-system/primitives/FormField";
import { Modal } from "../../../design-system/primitives/Modal";
import { Skeleton } from "../../../design-system";
import { useToast } from "../../../app/providers/ToastProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useTranslation } from "../../../i18n/I18nProvider";

export const CrmProviderSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const aiOnly = useLocation().pathname.endsWith("/ai");
  usePageMeta({
    title: `${aiOnly ? "IA" : "Fournisseurs"} CRM | Shongre`,
    description: t("admin.crmProviderSettingsPage.connexionsFournisseursPartageesDuCrm"),
    canonicalPath: aiOnly
      ? "/admin/crm/configuration/ai"
      : "/admin/crm/configuration/providers",
    noIndex: true,
  });
  const [snapshot, setSnapshot] = useState<ProviderControlPlaneSnapshot | null>(
    null,
  );
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [rotating, setRotating] = useState<ProviderConnection>();
  const [providerId, setProviderId] = useState("");
  const [ownerType, setOwnerType] = useState<"TENANT" | "USER">("TENANT");
  const [displayName, setDisplayName] = useState("");
  const [credential, setCredential] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  useEffect(() => {
    void Promise.all([
      services.providerControlPlane.getSnapshot(),
      services.providerControlPlane.listConnections(),
    ]).then(([nextSnapshot, nextConnections]) => {
      setSnapshot(nextSnapshot);
      setConnections(nextConnections);
    });
  }, []);
  const providers = useMemo(
    () =>
      snapshot?.providers.filter(({ definition }) => {
        const text =
          `${definition.id} ${definition.category} ${definition.capabilities.join(" ")}`.toLowerCase();
        return aiOnly
          ? text.includes("ai.") ||
              text.includes("ai_") ||
              text.includes("openai") ||
              text.includes("anthropic")
          : text.includes("mail") ||
              text.includes("email") ||
              text.includes("calendar") ||
              text.includes("sms") ||
              text.includes("calling");
      }) ?? [],
    [snapshot, aiOnly],
  );
  const Icon = aiOnly ? Bot : Cable;
  const openCreate = () => {
    const first = providers[0]?.definition;
    setProviderId(first?.id ?? "");
    setDisplayName(first?.displayName ?? "");
    setOwnerType("TENANT");
    setCredential("");
    setCreateOpen(true);
  };
  const createConnection = async (event: React.FormEvent) => {
    event.preventDefault();
    const definition = providers.find(
      (entry) => entry.definition.id === providerId,
    )?.definition;
    if (!definition) return;
    setSubmitting(true);
    try {
      const providerFamily: ProviderConnection["providerFamily"] =
        definition.category === "AI"
          ? "AI"
          : definition.category === "MAILBOX"
            ? "MAILBOX"
            : definition.category === "EMAIL"
              ? "EMAIL_DELIVERY"
              : definition.capabilities.some((capability) =>
                    capability.startsWith("calendar."),
                  )
                ? "CALENDAR"
                : "OTHER";
      const connection = await services.providerControlPlane.createConnection({
        ownerType,
        providerId: definition.id,
        providerFamily,
        displayName: displayName.trim(),
        configuration: {},
        capabilities: [...definition.capabilities],
        isDefault: false,
        credential: credential || undefined,
      });
      setConnections((items) => [...items, connection]);
      setCredential("");
      setCreateOpen(false);
      toast.success("Connexion créée en brouillon.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Connexion non créée.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  const rotateCredential = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rotating) return;
    setSubmitting(true);
    try {
      const updated = await services.providerControlPlane.rotateCredential(
        rotating.id,
        {
          expectedVersion: rotating.version,
          credential,
        },
      );
      setConnections((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      setCredential("");
      setRotating(undefined);
      toast.success("Credential chiffré et rotation enregistrée.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Rotation impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-text-inverse sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-control bg-stone-900">
              <Icon className="h-5 w-5 text-violet-300" />
            </span>
            <div>
              <p className="text-micro font-bold uppercase tracking-wider text-violet-300">
                CRM · Provider Platform
              </p>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {aiOnly ? "IA & modèles" : "Communications"}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={openCreate}
              disabled={!snapshot || providers.length === 0}
            >
              <Plus className="h-icon-md w-icon-md" /> Nouvelle connexion
            </Button>
            <Button
              to="/admin/fournisseurs"
              variant="outline"
              size="sm"
              className="border-stone-700 bg-stone-900 text-text-inverse hover:bg-stone-800"
            >
              <ExternalLink className="h-icon-md w-icon-md" /> Console
              fournisseurs
            </Button>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-text-disabled">
          {t("admin.crmProviderSettingsPage.leCrmReutiliseLaPlateformeFournisseurShongreUneConnexionPersonnelle")}
        </p>
      </section>
      {!snapshot ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <article className="rounded-2xl border border-border-base bg-bg-surface p-4">
              <span className="text-micro font-bold uppercase text-stone-500">
                {t("admin.crmProviderSettingsPage.references")}
              </span>
              <strong className="mt-1 block text-2xl font-black">
                {providers.length}
              </strong>
            </article>
            <article className="rounded-2xl border border-border-base bg-bg-surface p-4">
              <span className="text-micro font-bold uppercase text-stone-500">
                {t("admin.crmProviderSettingsPage.implementes")}
              </span>
              <strong className="mt-1 block text-2xl font-black">
                {
                  providers.filter(
                    ({ definition }) =>
                      definition.adapterStatus === "IMPLEMENTED",
                  ).length
                }
              </strong>
            </article>
            <article className="rounded-2xl border border-border-base bg-bg-surface p-4">
              <span className="text-micro font-bold uppercase text-stone-500">
                {t("admin.crmProviderSettingsPage.operationnels")}
              </span>
              <strong className="mt-1 block text-2xl font-black text-success">
                {
                  providers.filter(
                    ({ runtime }) => runtime.health === "HEALTHY",
                  ).length
                }
              </strong>
            </article>
            <article className="rounded-2xl border border-border-base bg-bg-surface p-4">
              <span className="text-micro font-bold uppercase text-stone-500">
                Environnement
              </span>
              <strong className="mt-1 block text-2xl font-black">
                {snapshot.environment}
              </strong>
            </article>
          </section>
          <section className="overflow-hidden rounded-2xl border border-border-base bg-bg-surface shadow-xs">
            <div className="border-b border-border-subtle px-5 py-4">
              <h2 className="text-sm font-black">Connexions visibles</h2>
              <p className="text-micro text-stone-500">
                {t("admin.crmProviderSettingsPage.connexionsDuTenantEtConnexionsPersonnellesDuCompteCourantUniquement")}
              </p>
            </div>
            <div className="divide-y divide-border-subtle">
              {connections
                .filter((connection) =>
                  aiOnly
                    ? connection.providerFamily === "AI"
                    : connection.providerFamily !== "AI",
                )
                .map((connection) => (
                  <article
                    key={connection.id}
                    className="grid gap-3 px-5 py-4 sm:grid-cols-4 sm:items-center"
                  >
                    <div>
                      <strong className="text-xs font-black">
                        {connection.displayName}
                      </strong>
                      <p className="mt-0.5 text-micro text-stone-500">
                        {connection.providerId} ·{" "}
                        {connection.capabilities.join(", ")}
                      </p>
                      {connection.credentialConfigured && (
                        <p className="mt-1 inline-flex items-center gap-1 text-micro font-bold text-success">
                          <KeyRound className="h-icon-xs w-icon-xs" />{" "}
                          {t("admin.crmProviderSettingsPage.credentialConfigure")} {connection.credentialHint}
                        </p>
                      )}
                    </div>
                    <span className="rounded-pill bg-stone-100 px-2 py-1 text-center text-micro font-bold">
                      {connection.ownerType}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold ${connection.status === "ACTIVE" ? "text-success" : "text-stone-500"}`}
                    >
                      <CheckCircle2 className="h-icon-sm w-icon-sm" />{" "}
                      {connection.status}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRotating(connection);
                        setCredential("");
                      }}
                    >
                      <RefreshCw className="h-icon-sm w-icon-sm" /> Rotation
                    </Button>
                  </article>
                ))}
            </div>
          </section>
          <section className="overflow-hidden rounded-2xl border border-border-base bg-bg-surface shadow-xs">
            <div className="border-b border-border-subtle px-5 py-4">
              <h2 className="text-sm font-black">{t("admin.crmProviderSettingsPage.registrePartage")}</h2>
              <p className="text-micro text-stone-500">
                {t("admin.crmProviderSettingsPage.capacitesDeclareesEtEtatRuntimeVerifiable")}
              </p>
            </div>
            <div className="divide-y divide-border-subtle">
              {providers.map(({ definition, runtime, readiness }) => (
                <article
                  key={definition.id}
                  className="grid gap-3 px-5 py-4 lg:grid-cols-3"
                >
                  <div className="flex gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-stone-100">
                      {aiOnly ? (
                        <Bot className="h-icon-md w-icon-md" />
                      ) : (
                        <Mail className="h-icon-md w-icon-md" />
                      )}
                    </span>
                    <div>
                      <strong className="text-xs font-black">
                        {definition.displayName}
                      </strong>
                      <p className="mt-0.5 text-micro text-stone-500">
                        {definition.id} · {definition.adapterStatus}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {definition.capabilities
                          .slice(0, 5)
                          .map((capability) => (
                            <code
                              key={capability}
                              className="rounded bg-stone-100 px-1.5 py-0.5 text-micro text-text-secondary"
                            >
                              {capability}
                            </code>
                          ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-micro text-stone-500">
                      {t("admin.crmProviderSettingsPage.santeRuntime")}
                    </span>
                    <span
                      className={`mt-1 flex items-center gap-1 text-xs font-bold ${runtime.health === "HEALTHY" ? "text-success" : "text-stone-500"}`}
                    >
                      {runtime.health === "HEALTHY" ? (
                        <CheckCircle2 className="h-icon-sm w-icon-sm" />
                      ) : (
                        <CircleAlert className="h-icon-sm w-icon-sm" />
                      )}
                      {runtime.health}
                    </span>
                  </div>
                  <div>
                    <span className="text-micro text-stone-500">
                      {t("admin.crmProviderSettingsPage.preparation")}
                    </span>
                    <strong className="mt-1 block text-xs">
                      {readiness.productionReady
                        ? "Prêt production"
                        : `${readiness.score}%`}
                    </strong>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <div className="flex items-start gap-2 rounded-2xl border border-success-border bg-success-surface p-4 text-xs text-success">
            <ShieldCheck className="mt-0.5 h-icon-md w-icon-md shrink-0" />
            <span>
              <strong>{t("admin.crmProviderSettingsPage.resolutionFailClosed")}</strong> {t("admin.crmProviderSettingsPage.enModeApiUneCapaciteSansConnexionActiveEtAutorisee")}
            </span>
          </div>
        </>
      )}
      <Modal
        isOpen={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCredential("");
        }}
        title="Nouvelle connexion fournisseur"
        description={t("admin.crmProviderSettingsPage.laConnexionResteEnBrouillonTantQuUnAdapterEt")}
      >
        <form onSubmit={createConnection} className="space-y-3.5 text-xs">
          <FormField label="Fournisseur" required>
            <Select
              aria-label="Fournisseur"
              value={providerId}
              onChange={(event) => {
                const id = event.target.value;
                setProviderId(id);
                setDisplayName(
                  providers.find((entry) => entry.definition.id === id)
                    ?.definition.displayName ?? "",
                );
              }}
              options={providers.map(({ definition }) => ({
                value: definition.id,
                label: definition.displayName,
              }))}
              required
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t("admin.crmProviderSettingsPage.nomDeLaConnexion")} required>
              <Input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </FormField>
            <FormField label={t("admin.crmCompaniesPage.proprietaire")}>
              <Select
                aria-label={t("admin.crmCompaniesPage.proprietaire")}
                value={ownerType}
                onChange={(event) =>
                  setOwnerType(event.target.value as typeof ownerType)
                }
                options={[
                  { value: "TENANT", label: "Tenant" },
                  { value: "USER", label: "Personnel" },
                ]}
              />
            </FormField>
          </div>
          <FormField
            label="Credential initial"
            hint="Optionnel. Chiffré côté backend ; jamais relu dans cette interface."
          >
            <Input
              type="password"
              autoComplete="new-password"
              value={credential}
              onChange={(event) => setCredential(event.target.value)}
              minLength={PROVIDER_CREDENTIAL_CONSTRAINTS.minLength}
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCreateOpen(false);
                setCredential("");
              }}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !providerId}
            >
              {submitting ? "Création…" : "Créer en brouillon"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={Boolean(rotating)}
        onClose={() => {
          setRotating(undefined);
          setCredential("");
        }}
        title={`Rotation · ${rotating?.displayName ?? "connexion"}`}
        description={t("admin.crmProviderSettingsPage.lAncienCredentialEstRevoqueAtomiquementLaConnexionRepasseEn")}
      >
        <form onSubmit={rotateCredential} className="space-y-3.5 text-xs">
          <FormField label="Nouveau credential" required>
            <Input
              type="password"
              autoComplete="new-password"
              value={credential}
              onChange={(event) => setCredential(event.target.value)}
              minLength={PROVIDER_CREDENTIAL_CONSTRAINTS.minLength}
              required
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRotating(undefined);
                setCredential("");
              }}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Rotation…" : "Chiffrer et remplacer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
