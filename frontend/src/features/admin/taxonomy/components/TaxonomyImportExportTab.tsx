import React, { useState } from 'react';
import { taxonomyAdminRepository } from '../../../../repositories/taxonomy.repository';
import { Button } from '../../../../design-system/primitives/Button';
import { Textarea, FormField } from '../../../../design-system/primitives/FormField';
import { useToast } from '../../../../app/providers/ToastProvider';
import { useAuth } from '../../../../app/providers/AuthProvider';
import { Download, Upload, FileCode, CheckCircle2, AlertOctagon, RotateCcw } from 'lucide-react';
import { ConfirmModal } from '../../../../design-system/primitives/ConfirmModal';
import { useTranslation } from '../../../../i18n/I18nProvider';

export interface TaxonomyImportExportTabProps {
  onImportSuccess: () => void;
}

export const TaxonomyImportExportTab: React.FC<TaxonomyImportExportTabProps> = ({
  onImportSuccess,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { currentUser } = useAuth();

  const [importJson, setImportJson] = useState('');
  const [importResult, setImportResult] = useState<{
    success: boolean;
    newCount: number;
    updatedCount: number;
    errors: string[];
  } | null>(null);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleExport = () => {
    const jsonStr = taxonomyAdminRepository.exportTaxonomyJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shongre-taxonomy-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Fichier JSON de taxonomie exporté avec succès.');
  };

  const handleImport = () => {
    if (!importJson.trim()) {
      toast.error('Veuillez coller le contenu JSON de taxonomie.');
      return;
    }

    const actor = currentUser
      ? { id: currentUser.id, name: currentUser.name || 'Admin', role: currentUser.role }
      : undefined;
    const result = taxonomyAdminRepository.importTaxonomyJSON(importJson, actor);
    setImportResult(result);

    if (result.success) {
      toast.success(`Import réussi : ${result.newCount} rubriques chargées.`);
      onImportSuccess();
    } else {
      toast.error(`Erreur d'import : ${result.errors.length} anomalie(s) détectée(s).`);
    }
  };

  const handleResetToBaseline = async () => {
    await taxonomyAdminRepository.resetToCanonical();
    toast.success('Taxonomie réinitialisée sur le baseline canonique d\'origine.');
    setIsResetModalOpen(false);
    onImportSuccess();
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Export Section */}
      <div className="bg-white p-6 rounded-2xl border border-border-base shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              <span>{t('admin.taxonomyImportExportTab.exporterLaTaxonomieCanoniqueJson')}</span>
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Générez un export complet et structuré comprenant l'arborescence, les attributs, les surcharges de marchés et les capacités.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Télécharger l'export JSON
          </Button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white p-6 rounded-2xl border border-border-base shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            <span>{t('admin.taxonomyImportExportTab.importerUneArborescenceExterne')}</span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Collez le schéma JSON à importer. Le moteur effectue une validation syntaxique et structurelle avant d'appliquer les changements.
          </p>
        </div>

        <FormField label={t('admin.taxonomyImportExportTab.contenuJsonDeTaxonomie')}>
          <Textarea
            rows={8}
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder='{ "nodes": [ ... ], "attributes": { ... } }'
            className="font-mono text-xs"
          />
        </FormField>

        {importResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              importResult.success
                ? 'bg-success-surface border-success-border text-success'
                : 'bg-danger-surface border-danger-border text-danger'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {importResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <AlertOctagon className="w-4 h-4 text-danger" />
              )}
              <span>{importResult.success ? 'Rapport d\'import validé' : 'Échec de validation de l\'import'}</span>
            </div>
            {importResult.errors.length > 0 && (
              <ul className="list-disc list-inside space-y-1">
                {importResult.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsResetModalOpen(true)}
            leftIcon={<RotateCcw className="w-3.5 h-3.5 text-stone-500" />}
          >
            Réinitialiser sur le baseline canonique
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleImport}
            disabled={!importJson.trim()}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Analyser & Appliquer l'import
          </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetToBaseline}
        title={t('admin.taxonomyImportExportTab.reinitialiserLaTaxonomieDOrigine')}
        message="Cette action supprimera toutes les modifications locales et restaurera les 16 univers canoniques initiaux de Shongre."
        confirmText="Réinitialiser"
        variant="danger"
      />
    </div>
  );
};
