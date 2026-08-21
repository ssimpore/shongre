import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { User, PlusCircle, Search } from "lucide-react";
import { Button } from "../../../design-system/primitives/Button";
import { Badge } from "../../../design-system/primitives/Badge";
import { Modal } from "../../../design-system/primitives/Modal";
import {
  FormField,
  Input,
  Select,
} from "../../../design-system/primitives/FormField";
import { crmRepository } from "../../../repositories/crm.repository";
import { CrmContact } from "../../../domains/crm/crm.types";
import { crmService } from "../../../domains/crm/crm.service";
import { useToast } from "../../../app/providers/ToastProvider";
import { Skeleton, EmptyState } from "../../../design-system";
import { useTranslation } from "../../../i18n/I18nProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";

export const CrmContactsPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.crmContacts.title"),
    description: t("meta.crmContacts.description"),
    canonicalPath: "/admin/crm/contacts",
    noIndex: true,
  });

  const toast = useToast();
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Contact Form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const list = await crmRepository.listContacts();
      setContacts(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) {
      toast.error("Le prénom et l'adresse email sont obligatoires.");
      return;
    }

    setIsSubmitting(true);
    try {
      await crmRepository.createContact({
        identity: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          jobTitle: jobTitle.trim() || undefined,
        },
        companyName: companyName.trim() || undefined,
        lifecycle: "prospect",
        qualification: "medium",
        marketCode: "FR",
        source: "manual",
      });

      setIsCreateModalOpen(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setJobTitle("");
      setCompanyName("");
      fetchContacts();
      toast.success("Contact créé avec succès.", "Contact enregistré");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création du contact.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (lifecycleFilter !== "all" && c.lifecycle !== lifecycleFilter)
      return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const nameMatch = `${c.identity.firstName} ${c.identity.lastName}`
        .toLowerCase()
        .includes(q);
      const emailMatch = c.identity.email.toLowerCase().includes(q);
      const compMatch = c.companyName?.toLowerCase().includes(q);
      return nameMatch || emailMatch || compMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900">
            Contacts & Interlocuteurs
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            {t("admin.crmContactsPage.baseUnifieeDesAcheteursVendeurs")}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="font-bold flex items-center gap-1.5 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nouveau contact</span>
        </Button>
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="bg-white border border-border-base rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              "admin.crmContactsPage.rechercherParNomEmailEntreprise",
            )}
            aria-label={t(
              "admin.crmContactsPage.rechercherParNomEmailEntreprise",
            )}
            className="w-full h-control-md pl-9 pr-3 text-xs bg-stone-50 border border-stone-200 rounded-control focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            aria-label={t("admin.crmContactsPage.filtrerLesContactsParCycle")}
            value={lifecycleFilter}
            onChange={(e) => setLifecycleFilter(e.target.value)}
            options={[
              { value: "all", label: "Tous les statuts" },
              { value: "prospect", label: "Prospects" },
              { value: "qualified", label: "Qualifiés" },
              { value: "customer", label: "Clients / Pro" },
              { value: "partner", label: "Partenaires" },
              { value: "do_not_contact", label: "Ne pas contacter" },
            ]}
          />
        </div>
      </div>

      {/* 3. Contacts Table */}
      <div className="bg-white border border-border-base rounded-3xl p-6 shadow-xs overflow-hidden">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <EmptyState
            icon={<User className="w-8 h-8 text-stone-500" />}
            title={t("admin.crmContactsPage.aucunContactNeCorrespondAux")}
            description={t(
              "admin.crmContactsPage.elargissezLaRechercheOuReinitialisez",
            )}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setLifecycleFilter("all");
                }}
              >
                {t("admin.crmContactsPage.reinitialiserLesFiltres")}
              </Button>
            }
            className="border-0 shadow-none"
          />
        ) : (
          <div className="divide-y divide-border-subtle">
            {filteredContacts.map((c) => {
              const lifecycleInfo = crmService.getLifecycleInfo(c.lifecycle);
              const qualInfo = crmService.getQualificationInfo(c.qualification);

              return (
                <Link
                  key={c.id}
                  to={`/admin/crm/contacts/${c.id}`}
                  className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50 -mx-4 px-4 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-stone-700 text-xs shrink-0">
                      {c.identity.firstName[0]}
                      {c.identity.lastName[0] || ""}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900">
                          {c.identity.firstName} {c.identity.lastName}
                        </span>
                        {c.linkedUserId && (
                          <Badge variant="verified" size="sm">
                            {t("admin.crmContactsPage.compteShongreLie")}
                          </Badge>
                        )}
                        {c.doNotContact && (
                          <Badge variant="urgent" size="sm">
                            Ne pas contacter
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-micro text-stone-500 truncate">
                        <span>{c.identity.email}</span>
                        {c.companyName && (
                          <>
                            <span>•</span>
                            <span className="text-stone-700 font-medium">
                              {c.companyName}
                            </span>
                          </>
                        )}
                        {c.identity.jobTitle && (
                          <>
                            <span>•</span>
                            <span>{c.identity.jobTitle}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <span
                      className={`px-2 py-0.5 rounded-md text-micro font-bold ${qualInfo.badgeClass}`}
                    >
                      {qualInfo.label}
                    </span>
                    <Badge variant={lifecycleInfo.variant} size="sm">
                      {lifecycleInfo.label}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t("admin.crmContactsPage.creerUnContactCrm")}
        description={t(
          "admin.crmContactsPage.ajoutezUnInterlocuteurOuProspect",
        )}
      >
        <form onSubmit={handleCreateContact} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("admin.crmContactsPage.prenom")} required>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("admin.crmContactsPage.prenom")}
              />
            </FormField>
            <FormField label="Nom">
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nom"
              />
            </FormField>
          </div>

          <FormField label="Adresse email" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@exemple.fr"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("admin.crmContactsPage.telephone")}>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33 6..."
              />
            </FormField>
            <FormField label="Fonction / Poste">
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={t("admin.crmContactsPage.exGerant")}
              />
            </FormField>
          </div>

          <FormField label="Entreprise">
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={t("admin.crmContactsPage.exMaisonDecoParis")}
            />
          </FormField>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="font-bold"
            >
              {isSubmitting ? "Création..." : "Créer le contact"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
