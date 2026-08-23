import React, { useState } from "react";
import { taxonomyAdminRepository } from "../../../../repositories/taxonomy.repository";
import { Button } from "../../../../design-system/primitives/Button";
import { useToast } from "../../../../app/providers/ToastProvider";
import { useAuth } from "../../../../app/providers/AuthProvider";
import { formatLogTimestamp } from "../../../../utilities/formatters";
import {
  Send,
  RotateCcw,
  AlertCircle,
  GitCommit,
  History,
  FileDiff,
} from "lucide-react";
import { ConfirmModal } from "../../../../design-system/primitives/ConfirmModal";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { labelIdentifier } from "../../../../utilities/identifier-label";

export interface TaxonomyDraftPublishTabProps {
  onPublishSuccess: () => void;
}

export const TaxonomyDraftPublishTab: React.FC<
  TaxonomyDraftPublishTabProps
> = ({ onPublishSuccess }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { currentUser } = useAuth();

  const [publishDescription, setPublishDescription] = useState("");
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const draftChanges = taxonomyAdminRepository.getDraftChanges();
  const versions = taxonomyAdminRepository.getVersions();
  const validationIssues = taxonomyAdminRepository.validateTaxonomy();
  const hasBlockingErrors = validationIssues.some(
    (i) => i.severity === "error",
  );

  const handlePublish = async () => {
    try {
      setIsSubmitting(true);
      const actor = currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name || "Admin",
            role: currentUser.role,
          }
        : undefined;

      const version = await taxonomyAdminRepository.publishDraft(
        publishDescription.trim() || undefined,
        actor,
      );

      toast.success(
        `Taxonomie Version ${version.versionNumber} publiée avec succès !`,
      );
      setPublishDescription("");
      setIsPublishModalOpen(false);
      onPublishSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la publication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = async () => {
    try {
      setIsSubmitting(true);
      await taxonomyAdminRepository.discardDraft();
      toast.success("Brouillon réinitialisé sur la version publiée.");
      setIsDiscardModalOpen(false);
      onPublishSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'annulation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Draft Staging Banner */}
      <div className="bg-white p-6 rounded-2xl border border-border-base shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-base font-black text-stone-900">
                Brouillons en Attente de Publication ({draftChanges.length})
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {draftChanges.length > 0
                ? `${draftChanges.length} modification(s) enregistrée(s) localement. Publiez pour appliquer les changements sur toute la plateforme.`
                : "Aucune modification en attente. La taxonomie est synchronisée avec la version active."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {draftChanges.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDiscardModalOpen(true)}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                {t("admin.taxonomyDraftPublishTab.annulerLesModifications")}
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPublishModalOpen(true)}
              disabled={draftChanges.length === 0 || hasBlockingErrors}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              {t("admin.taxonomyDraftPublishTab.publierLesModifications")}
            </Button>
          </div>
        </div>

        {/* Blocking Error Notice if any */}
        {hasBlockingErrors && draftChanges.length > 0 && (
          <div className="p-3.5 bg-danger-surface border border-danger-border rounded-xl text-xs text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-danger shrink-0" />
            <span>
              {t(
                "admin.taxonomyDraftPublishTab.publicationBloqueeDesAnomaliesCritiques",
              )}
              <strong>Validation</strong>.
            </span>
          </div>
        )}

        {/* Draft Diff List */}
        {draftChanges.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-border-subtle">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileDiff className="w-3.5 h-3.5 text-stone-500" />
              <span>
                {t("admin.taxonomyDraftPublishTab.detailDesChangementsEtages")}
              </span>
            </h4>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {draftChanges.map((change) => (
                <div
                  key={change.id}
                  className="p-3 bg-bg-subtle rounded-xl border border-border-subtle flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-micro px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
                        change.changeType === "created"
                          ? "bg-success-surface text-success"
                          : change.changeType === "deprecated"
                            ? "bg-danger-surface text-danger"
                            : change.changeType === "moved"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-info-surface text-info"
                      }`}
                    >
                      {change.changeType}
                    </span>
                    <span className="font-bold text-stone-900">
                      {change.nodeLabel}
                    </span>
                    <span className="text-stone-500">{change.description}</span>
                  </div>

                  <span className="text-micro text-stone-500 shrink-0 tabular-nums">
                    {formatLogTimestamp(change.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Version History Table */}
      <div className="bg-white p-6 rounded-2xl border border-border-base shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <span>
              {t("admin.taxonomyDraftPublishTab.historiqueDesVersionsPubliees")}
            </span>
          </h3>
          <span className="text-xs text-stone-500 font-mono">
            {versions.length} version{versions.length > 1 ? "s" : ""} archivée
            {versions.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-subtle text-stone-500 uppercase tracking-wider text-micro">
                <th scope="col" className="py-2.5 px-3">
                  Version
                </th>
                <th scope="col" className="py-2.5 px-3">
                  Statut
                </th>
                <th scope="col" className="py-2.5 px-3">
                  Changements
                </th>
                <th scope="col" className="py-2.5 px-3">
                  Description
                </th>
                <th scope="col" className="py-2.5 px-3">
                  {t("admin.taxonomyDraftPublishTab.publiePar")}
                </th>
                <th scope="col" className="py-2.5 px-3">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {versions.map((ver, idx) => (
                <tr
                  key={ver.id}
                  className="hover:bg-bg-subtle/50 transition-colors"
                >
                  <td className="py-3 px-3 font-mono font-bold text-stone-900 flex items-center gap-2">
                    <GitCommit className="w-3.5 h-3.5 text-primary" />
                    <span>v{ver.versionNumber}.0</span>
                    {idx === 0 && (
                      <span className="text-micro bg-success-surface text-success border border-success-border px-1.5 py-0.2 rounded font-bold">
                        Actuelle
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-micro font-bold uppercase bg-success-surface text-success">
                      {labelIdentifier(ver.status)}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {ver.changeCount} modif.
                  </td>
                  <td className="py-3 px-3 text-stone-700 max-w-xs truncate">
                    {ver.description || "Mise à jour standard"}
                  </td>
                  <td className="py-3 px-3 text-stone-600">
                    {ver.publishedBy || "Admin"}
                  </td>
                  <td className="py-3 px-3 text-stone-500 font-mono">
                    {ver.publishedAt
                      ? new Date(ver.publishedAt).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Publish Confirmation Modal */}
      <ConfirmModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onConfirm={handlePublish}
        title={t(
          "admin.taxonomyDraftPublishTab.publierLesModificationsDeTaxonomie",
        )}
        message={`Vous êtes sur le point de publier ${draftChanges.length} modification(s) vers la version ${versions.length + 1}.0. Les changements s'appliqueront immédiatement aux moteurs de recherche et formulaires de publication.`}
        confirmText={isSubmitting ? "Publication..." : "Confirmer & Publier"}
        variant="primary"
      />

      {/* Discard Confirmation Modal */}
      <ConfirmModal
        isOpen={isDiscardModalOpen}
        onClose={() => setIsDiscardModalOpen(false)}
        onConfirm={handleDiscard}
        title={t(
          "admin.taxonomyDraftPublishTab.annulerToutesLesModificationsEn",
        )}
        message="Cette action effacera l'ensemble des changements étagés et restaurera la dernière version publiée."
        confirmText="Annuler le brouillon"
        variant="danger"
      />
    </div>
  );
};
