import React, { useState } from 'react';
import { TaxonomyNode } from '../../../../../domains/taxonomy/taxonomy.types';
import { taxonomyAdminRepository } from '../../../../../repositories/taxonomy.repository';
import { Modal } from '../../../../../design-system/primitives/Modal';
import { Button } from '../../../../../design-system/primitives/Button';
import { FormField } from '../../../../../design-system/primitives/FormField';
import { useToast } from '../../../../../app/providers/ToastProvider';
import { useAuth } from '../../../../../app/providers/AuthProvider';
import { Archive, ArrowRight, ShieldCheck } from 'lucide-react';

export interface DeprecateNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: TaxonomyNode;
  allNodes: TaxonomyNode[];
  onSuccess: () => void;
}

export const DeprecateNodeModal: React.FC<DeprecateNodeModalProps> = ({
  isOpen,
  onClose,
  node,
  allNodes,
  onSuccess,
}) => {
  const toast = useToast();
  const { currentUser } = useAuth();
  const [replacementId, setReplacementId] = useState<string>(node.replacedById || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableReplacements = allNodes.filter(
    (n) => n.id !== node.id && n.status === 'active' && !n.ancestorIds?.includes(node.id)
  );

  const handleDeprecate = async () => {
    try {
      setIsSubmitting(true);
      const actor = currentUser
        ? { id: currentUser.id, name: currentUser.name || 'Admin', role: currentUser.role }
        : undefined;

      await taxonomyAdminRepository.deprecateNode(node.id, replacementId || undefined, actor);
      toast.success(`Catégorie "${node.name}" dépréciée avec succès.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la dépréciation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Déprécier la catégorie "${node.name}"`}
      description="La dépréciation retire cette rubrique des nouvelles publications tout en préservant l'intégrité des annonces existantes."
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Safety Guarantees Notice */}
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2 text-xs text-blue-900">
          <div className="flex items-center gap-2 font-bold text-blue-950">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span>Garanties de rétrocompatibilité :</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>Les annonces existantes publiées sous cette catégorie restent 100% consultables.</li>
            <li>Le wizard de publication ne proposera plus cette rubrique aux vendeurs.</li>
            <li>Si un successeur est défini, les redirections de recherche s'appliqueront harmonieusement.</li>
          </ul>
        </div>

        <FormField
          label="Catégorie de remplacement / Successeur logique (optionnel)"
          hint="Recommandé : redirige les recherches et suggestions vers une nouvelle catégorie active."
        >
          <select
            value={replacementId}
            onChange={(e) => setReplacementId(e.target.value)}
            className="w-full h-10 px-3 bg-bg-base border border-border-base rounded-xl text-xs font-semibold"
          >
            <option value="">-- Aucun successeur direct (dépréciation simple) --</option>
            {availableReplacements.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} [{r.level} - /{r.slug}]
              </option>
            ))}
          </select>
        </FormField>

        {replacementId && (
          <div className="p-3 bg-bg-subtle rounded-xl border border-border-subtle flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-600">{node.name}</span>
            <ArrowRight className="w-4 h-4 text-primary" />
            <span className="font-bold text-primary">
              {allNodes.find((n) => n.id === replacementId)?.name}
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-subtle">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeprecate}
            disabled={isSubmitting}
            leftIcon={<Archive className="w-4 h-4" />}
          >
            {isSubmitting ? 'Dépréciation en cours...' : 'Confirmer la dépréciation'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
