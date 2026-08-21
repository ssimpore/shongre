import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, Search, Sparkles } from "lucide-react";
import { Button } from "../../../design-system/primitives/Button";
import { Badge } from "../../../design-system/primitives/Badge";
import { Modal } from "../../../design-system/primitives/Modal";
import {
  FormField,
  Input,
  Select,
} from "../../../design-system/primitives/FormField";
import { crmRepository } from "../../../repositories/crm.repository";
import { CrmCompany } from "../../../domains/crm/crm.types";
import { crmService } from "../../../domains/crm/crm.service";
import { useToast } from "../../../app/providers/ToastProvider";
import { Skeleton } from "../../../design-system";
import { useTranslation } from "../../../i18n/I18nProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";

export const CrmCompaniesPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.crmCompanies.title"),
    description: t("meta.crmCompanies.description"),
    canonicalPath: "/admin/crm/entreprises",
    noIndex: true,
  });

  const toast = useToast();
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Company Form
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const list = await crmRepository.listCompanies();
      setCompanies(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Le nom de l'entreprise est obligatoire.");
      return;
    }

    setIsSubmitting(true);
    try {
      await crmRepository.createCompany({
        name: name.trim(),
        website: website.trim() || undefined,
        domain: website ? crmService.normalizeDomain(website) : undefined,
        industry: industry.trim() || "Commerce & Distribution",
        location: { country: "FR", city: city.trim() || "France" },
        lifecycle: "prospect",
        marketCode: "FR",
        source: "manual",
      });

      setIsCreateModalOpen(false);
      setName("");
      setWebsite("");
      setIndustry("");
      setCity("");
      fetchCompanies();
      toast.success("Entreprise ajoutée avec succès.", "Entreprise créée");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCompanies = companies.filter((c) => {
    if (lifecycleFilter !== "all" && c.lifecycle !== lifecycleFilter)
      return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const nameMatch = c.name.toLowerCase().includes(q);
      const industryMatch = c.industry?.toLowerCase().includes(q);
      const domainMatch = c.domain?.toLowerCase().includes(q);
      return nameMatch || industryMatch || domainMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900">
            Entreprises & Vendeurs B2B
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            {t("admin.crmCompaniesPage.repertoireDesBoutiquesProMarques")}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="font-bold flex items-center gap-1.5 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nouvelle entreprise</span>
        </Button>
      </div>

      {/* 2. Filter & Search */}
      <div className="bg-white border border-border-base rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              "admin.crmCompaniesPage.rechercherUneEntrepriseDomaineSecteur",
            )}
            aria-label={t(
              "admin.crmCompaniesPage.rechercherUneEntrepriseDomaineSecteur",
            )}
            className="w-full h-control-md pl-9 pr-3 text-xs bg-stone-50 border border-stone-200 rounded-control focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <Select
          aria-label={t("admin.crmCompaniesPage.filtrerLesEntreprisesParCycle")}
          value={lifecycleFilter}
          onChange={(e) => setLifecycleFilter(e.target.value)}
          options={[
            { value: "all", label: "Tous les statuts" },
            { value: "prospect", label: "Prospects" },
            { value: "qualified", label: "Qualifiés" },
            { value: "customer", label: "Clients Shongre Pro" },
            { value: "partner", label: "Partenaires" },
            { value: "do_not_contact", label: "Ne pas contacter" },
          ]}
        />
      </div>

      {/* 3. Companies List */}
      <div className="bg-white border border-border-base rounded-3xl p-6 shadow-xs overflow-hidden">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-12 text-stone-500 text-xs">
            {t("admin.crmCompaniesPage.aucuneEntrepriseTrouvee")}
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filteredCompanies.map((comp) => {
              const lifecycleInfo = crmService.getLifecycleInfo(comp.lifecycle);

              return (
                <Link
                  key={comp.id}
                  to={`/admin/crm/entreprises/${comp.id}`}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50 -mx-4 px-4 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center font-black text-stone-800 text-sm shrink-0">
                      {comp.name[0]}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900">
                          {comp.name}
                        </span>
                        {comp.linkedSellerId && (
                          <Badge variant="pro" size="sm">
                            {t("admin.crmCompaniesPage.vendeurProActif")}
                          </Badge>
                        )}
                        {comp.aiFitScore && (
                          <span className="text-micro px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Fit {comp.aiFitScore}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-micro text-stone-500 truncate">
                        <span>{comp.industry || "Secteur non spécifié"}</span>
                        {comp.location?.city && (
                          <>
                            <span>•</span>
                            <span>{comp.location.city}</span>
                          </>
                        )}
                        {comp.website && (
                          <>
                            <span>•</span>
                            <span className="text-stone-600 font-mono truncate">
                              {comp.domain || comp.website}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    {comp.catalogSizeEstimate && (
                      <span className="text-micro text-stone-600 font-medium">
                        ~{comp.catalogSizeEstimate} réf.
                      </span>
                    )}
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
        title={t("admin.crmCompaniesPage.ajouterUneEntreprise")}
        description={t(
          "admin.crmCompaniesPage.enregistrezUneNouvelleEntrepriseOu",
        )}
      >
        <form onSubmit={handleCreateCompany} className="space-y-3.5 text-xs">
          <FormField
            label={t("admin.crmCompaniesPage.nomCommercialDeLEntreprise")}
            required
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Atelier Nordique"
            />
          </FormField>

          <FormField label="Site internet officiel">
            <Input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://exemple.fr"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t("admin.crmCompaniesPage.secteurDActivite")}>
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder={t("admin.crmCompaniesPage.exMobilierDecoration")}
              />
            </FormField>
            <FormField label={t("admin.crmCompaniesPage.villeRegion")}>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="ex: Paris"
              />
            </FormField>
          </div>

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
              {isSubmitting ? "Création..." : "Créer l'entreprise"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
