import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import type { CrmAccount, CrmContact } from "@shongre/contracts/crm";
import { services } from "../../../api/client/service-registry";
import { Button } from "../../../design-system/primitives/Button";
import { Modal } from "../../../design-system/primitives/Modal";
import {
  FormField,
  Input,
  Select,
} from "../../../design-system/primitives/FormField";
import { Skeleton } from "../../../design-system";
import { useToast } from "../../../app/providers/ToastProvider";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useTranslation } from "../../../i18n/I18nProvider";
import { useCrmSurface } from "../../crm/CrmSurfaceContext";

const lifecycleLabel: Record<CrmContact["lifecycle"], string> = {
  lead: "Lead",
  prospect: "Prospect",
  qualified: "Qualifié",
  customer: "Client",
  partner: "Partenaire",
  do_not_contact: "Ne pas contacter",
  archived: "Archivé",
};

export const CrmContactsPage: React.FC = () => {
  const { t } = useTranslation();
  const { activeMarket } = useMarketLocation();
  const crmPaths = useCrmSurface();
  const toast = useToast();
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [accountId, setAccountId] = useState("");

  usePageMeta({
    title: t("meta.crmContacts.title"),
    description: t("meta.crmContacts.description"),
    canonicalPath: crmPaths.contacts,
    noIndex: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [contactPage, accountPage] = await Promise.all([
        services.crm.listContacts({ limit: 100 }),
        services.crm.listAccounts({ limit: 100 }),
      ]);
      setContacts(contactPage.items);
      setAccounts(accountPage.items);
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Impossible de charger les contacts.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [activeMarket.countryCode]);

  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return contacts.filter((contact) => {
      if (
        crmPaths.kind === "prospects" &&
        contact.country !== activeMarket.countryCode
      ) {
        return false;
      }
      return (
        !query ||
        contact.fullName.toLocaleLowerCase("fr").includes(query) ||
        contact.email?.toLocaleLowerCase("fr").includes(query) ||
        contact.jobTitle?.toLocaleLowerCase("fr").includes(query) ||
        contact.accountIds.some((id) =>
          accountById.get(id)?.name.toLocaleLowerCase("fr").includes(query),
        )
      );
    });
  }, [accountById, activeMarket.countryCode, contacts, crmPaths.kind, search]);

  const createContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setSubmitting(true);
    try {
      const created = await services.crm.createContact({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        accountIds: accountId ? [accountId] : [],
        country: activeMarket.code,
        language: "fr",
        timezone: "Europe/Paris",
        preferredContactMethod: email ? "email" : phone ? "phone" : undefined,
        lifecycle: "prospect",
        source: "manual",
        doNotContact: false,
      });
      setContacts((items) => [created, ...items]);
      setCreateOpen(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setJobTitle("");
      setAccountId("");
      toast.success("Contact ajouté au CRM.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Création impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-text-inverse shadow-sm sm:p-6">
        <Link
          to={crmPaths.overview}
          className="inline-flex items-center gap-1 text-micro font-bold uppercase tracking-wider text-text-disabled hover:text-text-inverse"
        >
          <ArrowLeft className="h-icon-sm w-icon-sm" /> Vue d’ensemble
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Contacts
            </h1>
            <p className="mt-1 text-sm text-text-disabled">
              {t("admin.crmContactsPage.personnesRolesEtConsentements")}{" "}
              {contacts.length} fiches
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-icon-md w-icon-md" /> Nouveau contact
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border-base bg-bg-surface p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-icon-md w-icon-md -translate-y-1/2 text-text-disabled" />
          <span className="sr-only">
            {t("admin.crmContactsPage.rechercherUnContact")}
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("admin.crmContactsPage.nomEmailPosteOuEntreprise")}
            className="h-control-md w-full rounded-control border border-stone-200 bg-stone-50 pl-9 pr-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <span className="inline-flex items-center gap-1.5 text-micro text-stone-500">
          <ShieldAlert className="h-icon-sm w-icon-sm text-text-disabled" />{" "}
          {t(
            "admin.crmContactsPage.lesPreferencesDeContactSontAppliqueesAvantToutEnvoi",
          )}
        </span>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border-base bg-bg-surface shadow-xs">
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-16 rounded-control" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <UserRound className="mx-auto h-8 w-8 text-text-disabled" />
            <h2 className="mt-3 text-sm font-black text-stone-800">
              {t("admin.crmContactsPage.aucunContactTrouve")}
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              {t(
                "admin.crmContactsPage.essayezUneAutreRechercheOuCreezUneFiche",
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-4xl text-left text-xs">
              <thead className="bg-stone-50 text-micro font-bold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-4 py-3">Entreprise</th>
                  <th className="px-4 py-3">
                    {t("admin.crmContactsPage.coordonnees")}
                  </th>
                  <th className="px-4 py-3">
                    {t("admin.adminFeatureFlagsPage.cycleDeVie")}
                  </th>
                  <th className="px-4 py-3">Prochaine action</th>
                  <th className="px-5 py-3 text-right">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.map((contact) => {
                  const account = contact.accountIds
                    .map((id) => accountById.get(id))
                    .find(Boolean);
                  return (
                    <tr
                      key={contact.id}
                      className="transition hover:bg-stone-50/80"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-stone-950 text-micro font-black text-text-inverse">
                            {contact.firstName[0]}
                            {contact.lastName[0]}
                          </span>
                          <div className="min-w-0">
                            <Link
                              to={crmPaths.contact(contact.id)}
                              className="block truncate font-black text-stone-950 hover:text-primary"
                            >
                              {contact.fullName}
                            </Link>
                            <span className="mt-0.5 block truncate text-micro text-stone-500">
                              {contact.jobTitle ?? "Fonction non renseignée"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {account ? (
                          <Link
                            to={crmPaths.company(account.id)}
                            className="inline-flex items-center gap-1.5 font-bold text-stone-700 hover:text-primary"
                          >
                            <Building2 className="h-icon-sm w-icon-sm" />{" "}
                            {account.name}
                          </Link>
                        ) : (
                          <span className="text-text-disabled">
                            {t("admin.crmContactsPage.sansEntreprise")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-1 text-micro text-text-secondary">
                          {contact.email && (
                            <span className="flex items-center gap-1.5">
                              <Mail className="h-icon-xs w-icon-xs text-text-disabled" />{" "}
                              {contact.email}
                            </span>
                          )}
                          {contact.phone && (
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-icon-xs w-icon-xs text-text-disabled" />{" "}
                              {contact.phone}
                            </span>
                          )}
                          {!contact.email &&
                            !contact.phone &&
                            "Non renseignées"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-pill px-2 py-1 text-micro font-bold ${contact.doNotContact ? "bg-danger-surface text-danger" : contact.lifecycle === "customer" ? "bg-success-surface text-success" : contact.lifecycle === "qualified" ? "bg-primary-light text-primary" : "bg-warning-surface text-warning"}`}
                        >
                          {contact.doNotContact
                            ? "Ne pas contacter"
                            : lifecycleLabel[contact.lifecycle]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-micro text-text-secondary">
                        {contact.nextContactAt
                          ? new Intl.DateTimeFormat("fr-FR", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(contact.nextContactAt))
                          : "À planifier"}
                      </td>
                      <td className="px-5 py-3.5 text-right text-text-secondary">
                        {contact.ownerId ? "Léa Bertin" : "Non assigné"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border-subtle bg-stone-50/60 px-5 py-3 text-micro text-stone-500">
          <span>
            {filtered.length} {t("admin.crmCompaniesPage.resultat")}
            {filtered.length > 1 ? "s" : ""}
          </span>
          <span>
            {contacts.filter((contact) => contact.doNotContact).length}{" "}
            exclusion
            {contacts.filter((contact) => contact.doNotContact).length > 1
              ? "s"
              : ""}{" "}
            {t("admin.crmContactsPage.deContact")}
          </span>
        </div>
      </section>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("admin.crmContactsPage.creerUnContact")}
        description={t(
          "admin.crmContactsPage.laFicheResteDistincteDUnCompteUtilisateurShongre",
        )}
      >
        <form onSubmit={createContact} className="space-y-4 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t("admin.crmContactsPage.prenom")} required>
              <Input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
              />
            </FormField>
            <FormField label="Nom" required>
              <Input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
              />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Email">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </FormField>
            <FormField label={t("admin.crmContactsPage.telephone")}>
              <Input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Poste">
            <Input
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
            />
          </FormField>
          <FormField label="Entreprise">
            <Select
              aria-label={t("admin.crmContactsPage.entrepriseAssociee")}
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              options={[
                { value: "", label: t("admin.crmContactsPage.sansEntreprise") },
                ...accounts.map((account) => ({
                  value: account.id,
                  label: account.name,
                })),
              ]}
            />
          </FormField>
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
              {submitting ? "Création…" : "Créer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
