import React, { useState } from "react";
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Eye,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "../../../design-system/primitives/Button";
import { prospectResearchService } from "../../../services/prospect-research.service";
import { crmRepository } from "../../../repositories/crm.repository";
import { crmService } from "../../../domains/crm/crm.service";
import {
  ProspectResearchCandidate,
  ProspectResearchResult,
  CrmCompany,
} from "../../../domains/crm/crm.types";
import { EvidenceDrawer } from "./components/EvidenceDrawer";
import { DuplicateConflictModal } from "./components/DuplicateConflictModal";
import { useToast } from "../../../app/providers/ToastProvider";
import { plural } from "../../../utilities/formatters";
import { useTranslation } from "../../../i18n/I18nProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";

const EXAMPLE_PROMPTS = [
  "Boutiques de mobilier design vintage en Île-de-France",
  "Installateurs de bornes de recharge et solutions solaires en France",
  "Magasins de vélos et équipements de mobilité à Lyon",
  "Antiquaires et galeries d'art avec catalogue en ligne",
];

export const CrmAiProspectingPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.crmAiProspecting.title"),
    description: t("meta.crmAiProspecting.description"),
    canonicalPath: "/admin/crm/prospection",
    noIndex: true,
  });

  const toast = useToast();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchStep, setSearchStep] = useState<string>("");
  const [results, setResults] = useState<ProspectResearchResult | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(
    [],
  );
  const [importedCandidateIds, setImportedCandidateIds] = useState<string[]>(
    [],
  );

  // Evidence Drawer state
  const [selectedCandidateForEvidence, setSelectedCandidateForEvidence] =
    useState<ProspectResearchCandidate | null>(null);

  // Duplicate Conflict Modal state
  const [conflictCandidate, setConflictCandidate] =
    useState<ProspectResearchCandidate | null>(null);
  const [matchedCompany, setMatchedCompany] = useState<CrmCompany | null>(null);

  const handleRunSearch = async (queryText?: string) => {
    const activeQuery = queryText || query;
    if (!activeQuery.trim()) {
      toast.error(
        "Veuillez décrire le type d'entreprises que vous recherchez.",
      );
      return;
    }

    if (queryText) setQuery(queryText);

    setIsSearching(true);
    setSearchStep(
      "Recherche dans les annuaires et sites professionnels publics...",
    );

    try {
      setTimeout(
        () => setSearchStep("Analyse des catalogues et signaux d'activité..."),
        200,
      );
      setTimeout(
        () => setSearchStep("Calcul du Fit Shongre & déduplication..."),
        450,
      );

      const res = await prospectResearchService.searchProspects({
        naturalLanguageQuery: activeQuery.trim(),
        marketCode: "FR",
      });

      // Check for duplicates against existing CRM companies
      const existingCompanies = await crmRepository.listCompanies();
      const updatedCandidates = res.candidates.map((cand) => {
        const dup = crmService.detectDuplicate(cand.company, existingCompanies);
        return {
          ...cand,
          isDuplicate: dup.isDuplicate,
          possibleExistingEntityId: dup.matchedCompany?.id,
        };
      });

      setResults({ ...res, candidates: updatedCandidates });
      setSelectedCandidateIds(
        updatedCandidates.filter((c) => !c.isDuplicate).map((c) => c.id),
      );
    } catch (err: any) {
      toast.error("Erreur lors de la recherche de prospects.");
    } finally {
      setIsSearching(false);
      setSearchStep("");
    }
  };

  const handleImportSingle = async (candidate: ProspectResearchCandidate) => {
    if (candidate.isDuplicate) {
      const existingCompanies = await crmRepository.listCompanies();
      const dup = crmService.detectDuplicate(
        candidate.company,
        existingCompanies,
      );
      setConflictCandidate(candidate);
      setMatchedCompany(dup.matchedCompany || null);
      return;
    }

    try {
      await crmRepository.importAiCandidate(candidate);
      setImportedCandidateIds((prev) => [...prev, candidate.id]);
      toast.success(
        `${candidate.company.name} a été ajouté au CRM.`,
        "Prospect importé",
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'import.");
    }
  };

  const handleBatchImport = async () => {
    if (!results) return;
    const candidatesToImport = results.candidates.filter(
      (c) =>
        selectedCandidateIds.includes(c.id) &&
        !importedCandidateIds.includes(c.id),
    );

    for (const cand of candidatesToImport) {
      await crmRepository.importAiCandidate(cand);
    }

    setImportedCandidateIds((prev) => [
      ...prev,
      ...candidatesToImport.map((c) => c.id),
    ]);
    toast.success(
      `${candidatesToImport.length} prospect(s) importé(s) dans le CRM.`,
      "Import par lot réussi",
    );
  };

  const toggleSelectCandidate = (id: string) => {
    if (selectedCandidateIds.includes(id)) {
      setSelectedCandidateIds(selectedCandidateIds.filter((cid) => cid !== id));
    } else {
      setSelectedCandidateIds([...selectedCandidateIds, id]);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & AI Intro */}
      <div className="bg-white border border-border-base rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {t("admin.crmAiProspectingPage.prospectionB2bAssisteeParIa")}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            {t("admin.crmAiProspectingPage.decouvrezDeFutursVendeursPro")}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 max-w-2xl leading-relaxed mt-1">
            {t("admin.crmAiProspectingPage.recherchezEnLangageNaturelDes")}
          </p>
        </div>

        {/* Search Prompt Input */}
        <div className="pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunSearch();
            }}
            className="space-y-3"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t(
                    "admin.crmAiProspectingPage.decrivezLesProspectsQueVous",
                  )}
                  aria-label={t(
                    "admin.crmAiProspectingPage.decrivezLesProspectsQueVous",
                  )}
                  disabled={isSearching}
                  className="w-full h-control-lg pl-11 pr-4 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-control placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSearching || !query.trim()}
                className="font-bold shrink-0 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isSearching
                    ? "Recherche en cours..."
                    : "Lancer la prospection"}
                </span>
              </Button>
            </div>

            {/* Example Prompts Chips */}
            <div className="flex items-center gap-2 flex-wrap text-xs text-stone-500 pt-1">
              <span className="font-bold text-stone-500 text-micro">
                Exemples :
              </span>
              {EXAMPLE_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleRunSearch(prompt)}
                  disabled={isSearching}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-micro font-medium transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>

      {/* 2. Loading State Animation */}
      {isSearching && (
        <div className="p-8 bg-purple-50/60 border border-purple-200 rounded-3xl text-center space-y-3 animate-pulse">
          <Sparkles className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-purple-950">{searchStep}</h3>
          <p className="text-xs text-purple-700">
            {t(
              "admin.crmAiProspectingPage.explorationDesRegistresDEntreprises",
            )}
          </p>
        </div>
      )}

      {/* 3. Results Section */}
      {results && !isSearching && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-stone-900">
                Prospects Identifiés ({results.candidates.length})
              </h2>
              <span className="text-xs text-stone-500">
                sur requête « {results.query.naturalLanguageQuery} »
              </span>
            </div>

            {selectedCandidateIds.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleBatchImport}
                className="font-bold flex items-center gap-1.5 self-start sm:self-center"
              >
                <PlusCircle className="w-4 h-4" />
                <span>
                  Ajouter les {selectedCandidateIds.length} sélectionnés au CRM
                </span>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.candidates.map((cand) => {
              const isSelected = selectedCandidateIds.includes(cand.id);
              const isImported = importedCandidateIds.includes(cand.id);

              return (
                <div
                  key={cand.id}
                  className={`bg-white border rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all ${
                    cand.isDuplicate
                      ? "border-warning-border bg-warning-surface/20"
                      : isImported
                        ? "border-success-border bg-success-surface/20"
                        : "border-border-base"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top row: Checkbox, Name, Fit Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {!isImported && !cand.isDuplicate && (
                          <button
                            type="button"
                            onClick={() => toggleSelectCandidate(cand.id)}
                            className="mt-0.5 text-stone-500 hover:text-stone-700 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-stone-900 leading-tight truncate">
                            {cand.company.name}
                          </h3>
                          <span className="text-micro text-stone-500 block truncate">
                            {cand.company.industry} • {cand.company.location}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-micro font-bold bg-purple-100 text-purple-800 shrink-0">
                        Fit {cand.fit.score}%
                      </span>
                    </div>

                    {/* Description */}
                    {cand.company.description && (
                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {cand.company.description}
                      </p>
                    )}

                    {/* Fit Reasons */}
                    <div className="p-3 bg-stone-50 rounded-2xl space-y-1.5 text-xs text-stone-700">
                      <span className="font-bold text-micro text-stone-900 block">
                        {t("admin.crmAiProspectingPage.signauxDetectes")}
                      </span>
                      {cand.fit.reasons.slice(0, 2).map((r, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-1.5 text-micro"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{r}</span>
                        </div>
                      ))}
                    </div>

                    {cand.isDuplicate && (
                      <div className="p-2.5 rounded-xl bg-warning-surface text-warning text-micro font-medium flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
                        <span>
                          {t(
                            "admin.crmAiProspectingPage.compteShongreOuFicheCrm",
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCandidateForEvidence(cand)}
                      className="text-xs text-stone-600 hover:text-stone-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{plural(cand.sources.length, "source")}</span>
                    </button>

                    {isImported ? (
                      <span className="text-xs text-success font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t("admin.crmAiProspectingPage.importe")}</span>
                      </span>
                    ) : (
                      <Button
                        variant={cand.isDuplicate ? "outline" : "primary"}
                        size="sm"
                        onClick={() => handleImportSingle(cand)}
                        className="font-bold text-xs"
                      >
                        {cand.isDuplicate
                          ? "Examiner doublon"
                          : "Ajouter au CRM"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Evidence Drawer */}
      <EvidenceDrawer
        isOpen={!!selectedCandidateForEvidence}
        onClose={() => setSelectedCandidateForEvidence(null)}
        candidate={selectedCandidateForEvidence}
      />

      {/* Duplicate Conflict Modal */}
      {conflictCandidate && (
        <DuplicateConflictModal
          isOpen={!!conflictCandidate}
          onClose={() => setConflictCandidate(null)}
          candidate={conflictCandidate}
          matchedCompany={matchedCompany}
          onAssociate={async () => {
            setConflictCandidate(null);
            toast.success(
              "Recherche associée à la fiche entreprise existante.",
              "Association réussie",
            );
          }}
          onCreateSeparate={async () => {
            await crmRepository.importAiCandidate(conflictCandidate);
            setImportedCandidateIds((prev) => [...prev, conflictCandidate.id]);
            setConflictCandidate(null);
            toast.success(
              "Fiche distincte créée dans le CRM.",
              "Prospect créé",
            );
          }}
        />
      )}
    </div>
  );
};
