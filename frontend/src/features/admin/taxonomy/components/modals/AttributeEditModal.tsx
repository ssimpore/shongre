import React, { useState, useEffect } from 'react';
import {
  TaxonomyAttribute,
  AttributeDataType,
  AttributeOption,
} from '../../../../../domains/taxonomy/taxonomy.types';
import { taxonomyAdminRepository } from '../../../../../repositories/taxonomy.repository';
import { Modal } from '../../../../../design-system/primitives/Modal';
import { Button } from '../../../../../design-system/primitives/Button';
import { Input, FormField, Checkbox } from '../../../../../design-system/primitives/FormField';
import { useToast } from '../../../../../app/providers/ToastProvider';
import { useAuth } from '../../../../../app/providers/AuthProvider';
import { Plus, Trash2, Tag } from 'lucide-react';

export interface AttributeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  attribute?: TaxonomyAttribute | null;
  onSuccess: (savedAttr: TaxonomyAttribute) => void;
}

export const AttributeEditModal: React.FC<AttributeEditModalProps> = ({
  isOpen,
  onClose,
  attribute,
  onSuccess,
}) => {
  const toast = useToast();
  const { currentUser } = useAuth();
  const isEditing = Boolean(attribute);

  const [id, setId] = useState('');
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [helpText, setHelpText] = useState('');
  const [dataType, setDataType] = useState<AttributeDataType>('text');
  const [unit, setUnit] = useState('');
  const [publicationGroup, setPublicationGroup] = useState<TaxonomyAttribute['publicationGroup']>('general');
  const [required, setRequired] = useState(false);
  const [filterable, setFilterable] = useState(true);
  const [searchable, setSearchable] = useState(true);
  const [sortable, setSortable] = useState(false);
  const [options, setOptions] = useState<AttributeOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (attribute) {
      setId(attribute.id);
      setCode(attribute.code);
      setLabel(attribute.label);
      setHelpText(attribute.helpText || '');
      setDataType(attribute.dataType);
      setUnit(attribute.unit || '');
      setPublicationGroup(attribute.publicationGroup || 'general');
      setRequired(Boolean(attribute.required));
      setFilterable(Boolean(attribute.filterable));
      setSearchable(Boolean(attribute.searchable));
      setSortable(Boolean(attribute.sortable));
      setOptions(attribute.options ? JSON.parse(JSON.stringify(attribute.options)) : []);
    } else {
      setId('');
      setCode('');
      setLabel('');
      setHelpText('');
      setDataType('text');
      setUnit('');
      setPublicationGroup('general');
      setRequired(false);
      setFilterable(true);
      setSearchable(true);
      setSortable(false);
      setOptions([]);
    }
  }, [attribute, isOpen]);

  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (!isEditing) {
      const generatedCode = val
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setCode(generatedCode);
      setId(`attr_${generatedCode.toLowerCase()}`);
    }
  };

  const handleAddOption = () => {
    setOptions((prev) => [...prev, { value: `opt_${prev.length + 1}`, label: `Option ${prev.length + 1}` }]);
  };

  const handleUpdateOption = (index: number, field: 'value' | 'label', val: string) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveOption = (index: number) => {
    setOptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast.error('Le libellé de l\'attribut est obligatoire.');
      return;
    }
    if (!id.trim()) {
      toast.error('L\'identifiant unique de l\'attribut est obligatoire.');
      return;
    }

    try {
      setIsSubmitting(true);
      const actor = currentUser
        ? { id: currentUser.id, name: currentUser.name || 'Admin', role: currentUser.role }
        : undefined;

      const payload: TaxonomyAttribute = {
        id: id.trim(),
        code: code.trim().toUpperCase() || id.trim().toUpperCase(),
        label: label.trim(),
        helpText: helpText.trim() || undefined,
        dataType,
        unit: unit.trim() || undefined,
        publicationGroup,
        required,
        filterable,
        searchable,
        sortable,
        options: dataType === 'select' || dataType === 'multi_select' ? options : undefined,
      };

      const saved = await taxonomyAdminRepository.saveAttribute(payload, actor);
      toast.success(`Attribut "${saved.label}" enregistré dans le registre central.`);
      onSuccess(saved);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l\'enregistrement de l\'attribut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Éditer l'attribut "${attribute?.label}"` : 'Créer un nouvel attribut dans le Registre'}
      description="Les attributs canoniques sont définis de manière centralisée et réutilisés dans les différentes catégories."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Libellé de l'attribut (Français)" required>
            <Input
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Ex: Capacité de stockage"
              autoFocus
            />
          </FormField>

          <FormField
            label="Identifiant unique (ID stable)"
            required
            hint={isEditing ? 'ID immutable' : 'Ex: tech.storage_capacity'}
          >
            <Input
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={isEditing}
              placeholder="category.attribute_key"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Type de donnée" required>
            <select
              value={dataType}
              onChange={(e) => setDataType(e.target.value as AttributeDataType)}
              className="w-full h-10 px-3 bg-bg-base border border-border-base rounded-xl text-xs font-semibold"
            >
              <option value="text">Texte libre (String)</option>
              <option value="number">Nombre (Numérique)</option>
              <option value="select">Menu déroulant (Select unique)</option>
              <option value="multi_select">Choix multiples (Multi-select)</option>
              <option value="boolean">Booléen (Oui / Non)</option>
              <option value="range">Plage / Intervalle</option>
              <option value="year">Année (Millésime)</option>
            </select>
          </FormField>

          <FormField label="Unité de mesure (optionnelle)" hint="Ex: km, m², kWh, kg, ch, €">
            <Input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Ex: km"
            />
          </FormField>

          <FormField label="Groupe de publication">
            <select
              value={publicationGroup}
              onChange={(e) => setPublicationGroup(e.target.value as any)}
              className="w-full h-10 px-3 bg-bg-base border border-border-base rounded-xl text-xs font-semibold"
            >
              <option value="general">Général</option>
              <option value="specifications">Spécifications techniques</option>
              <option value="dimensions">Dimensions / Surface</option>
              <option value="performance">Performance / Motorisation</option>
              <option value="legal">Mentions légales & Normes</option>
            </select>
          </FormField>
        </div>

        <FormField label="Texte d'aide ou placeholder (vendeur)">
          <Input
            value={helpText}
            onChange={(e) => setHelpText(e.target.value)}
            placeholder="Ex: Indiquez la capacité réelle de la batterie en kWh"
          />
        </FormField>

        {/* Behavioral Flags */}
        <div className="p-3 bg-bg-subtle rounded-xl border border-border-subtle grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
            <Checkbox checked={required} onChange={(e) => setRequired(e.target.checked)} />
            <span>Obligatoire</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
            <Checkbox checked={filterable} onChange={(e) => setFilterable(e.target.checked)} />
            <span>Facette filtre</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
            <Checkbox checked={searchable} onChange={(e) => setSearchable(e.target.checked)} />
            <span>Recherchable</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-800">
            <Checkbox checked={sortable} onChange={(e) => setSortable(e.target.checked)} />
            <span>Triable</span>
          </label>
        </div>

        {/* Options Manager (if Select / Multi-Select) */}
        {(dataType === 'select' || dataType === 'multi_select') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Valeurs prédéfinies ({options.length})
              </h4>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleAddOption}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Ajouter une option
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {options.length === 0 ? (
                <div className="p-3 text-center text-xs text-stone-500 border border-dashed rounded-xl">
                  Aucune option définie. Cliquez sur "Ajouter une option".
                </div>
              ) : (
                options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Valeur / Code"
                      value={opt.value}
                      onChange={(e) => handleUpdateOption(idx, 'value', e.target.value)}
                      className="w-1/3"
                    />
                    <Input
                      placeholder="Libellé affiché (Français)"
                      value={opt.label}
                      onChange={(e) => handleUpdateOption(idx, 'label', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      aria-label="Retirer cette option"
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="text-stone-500 hover:text-danger p-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-subtle">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer dans le Registre'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
