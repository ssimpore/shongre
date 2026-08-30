import React, { useState } from "react";
import { Select } from "../../../../design-system";
import { TaxonomyAttribute } from "../../../../domains/taxonomy/taxonomy.types";
import { taxonomyAdminRepository } from "../../../../repositories/taxonomy.repository";
import { Button } from "../../../../design-system/primitives/Button";
import { Plus, Search, Filter, Layers, Edit2 } from "lucide-react";
import { AttributeEditModal } from "./modals/AttributeEditModal";
import { plural } from "../../../../utilities/formatters";
import { useTranslation } from "../../../../i18n/I18nProvider";

export const TaxonomyAttributeRegistryTab: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [dataTypeFilter, setDataTypeFilter] = useState<string>("all");
  const [editingAttribute, setEditingAttribute] =
    useState<TaxonomyAttribute | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const attributes = taxonomyAdminRepository.getAllAttributes();
  const allNodes = taxonomyAdminRepository.getAllNodes();

  // Compute category consumers for each attribute
  const computeConsumerCount = (attrId: string): number => {
    return allNodes.filter((n) => n.attributeIds?.includes(attrId)).length;
  };

  const filteredAttributes = attributes.filter((attr) => {
    if (dataTypeFilter !== "all" && attr.dataType !== dataTypeFilter)
      return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        attr.label.toLowerCase().includes(q) ||
        attr.id.toLowerCase().includes(q) ||
        attr.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenCreate = () => {
    setEditingAttribute(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (attr: TaxonomyAttribute) => {
    setEditingAttribute(attr);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="bg-bg-surface p-5 rounded-2xl border border-border-base shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-text-main flex items-center gap-2">
            <Layers className="w-icon-lg h-icon-lg text-primary" />
            <span>
              {t(
                "admin.taxonomyAttributeRegistryTab.registreCentralDesAttributsCanoniques",
              )}
            </span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {t("admin.taxonomyAttributeRegistryTab.gerezLeDictionnaireDes")} {attributes.length} {t("admin.taxonomyAttributeRegistryTab.attributsNormalisesPartagesEntreLesDifferentesCategories")}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenCreate}
          leftIcon={<Plus className="w-icon-sm h-icon-sm" />}
        >
          Nouvel attribut
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-bg-surface p-4 rounded-2xl border border-border-base shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-icon-md h-icon-md text-text-disabled absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t(
              "admin.taxonomyAttributeRegistryTab.rechercherParLibelleIdOu",
            )}
            aria-label={t(
              "admin.taxonomyAttributeRegistryTab.rechercherUnAttribut",
            )}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-control-md pl-9 pr-3 bg-bg-base border border-border-base rounded-control text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-icon-sm h-icon-sm text-text-disabled" />
          <Select
            className="w-auto"
            size="compact"
            aria-label={t("admin.taxonomyAttributeRegistryTab.filtrerParTypeDeDonnees")}
            value={dataTypeFilter}
            onChange={(e) => setDataTypeFilter(e.target.value)}
          >
            <option value="all">
              {t("admin.taxonomyAttributeRegistryTab.tousLesTypesDeDonnees")}
            </option>
            <option value="text">Texte libre (String)</option>
            <option value="number">
              {t("admin.taxonomyAttributeRegistryTab.nombreNumerique")}
            </option>
            <option value="select">
              {t("admin.taxonomyAttributeRegistryTab.menuDeroulantSelect")}
            </option>
            <option value="multi_select">Choix multiples (Multi-select)</option>
            <option value="boolean">
              {t("admin.taxonomyAttributeRegistryTab.booleenOuiNon")}
            </option>
            <option value="range">Plage / Intervalle</option>
            <option value="year">
              {t("admin.taxonomyAttributeRegistryTab.anneeMillesime")}
            </option>
          </Select>
        </div>
      </div>

      {/* Attribute Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAttributes.map((attr) => {
          const consumersCount = computeConsumerCount(attr.id);

          return (
            <div
              key={attr.id}
              className="bg-bg-surface rounded-2xl border border-border-base p-4 shadow-xs hover:border-primary transition-all flex flex-col justify-between gap-3 group"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-text-main text-xs">
                    {attr.label}
                  </span>
                  <span className="text-micro bg-primary-light text-primary px-2 py-0.5 rounded-pill font-mono font-bold shrink-0 uppercase">
                    {attr.dataType}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
                  <span>ID : {attr.id}</span>
                  {attr.unit && (
                    <span className="bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded font-bold">
                      {attr.unit}
                    </span>
                  )}
                </div>

                {attr.helpText && (
                  <p className="text-micro text-stone-500 line-clamp-2 italic">
                    « {attr.helpText} »
                  </p>
                )}

                {/* Behavioral tags */}
                <div className="flex flex-wrap gap-1 pt-1 text-micro">
                  {attr.required && (
                    <span className="bg-danger-surface text-danger px-1.5 py-0.5 rounded font-semibold">
                      Requis
                    </span>
                  )}
                  {attr.filterable && (
                    <span className="bg-info-surface text-info px-1.5 py-0.5 rounded font-semibold">
                      Facette filtre
                    </span>
                  )}
                  {attr.searchable && (
                    <span className="bg-success-surface text-success px-1.5 py-0.5 rounded font-semibold">
                      {t("admin.taxonomyAttributeRegistryTab.moteurRecherche")}
                    </span>
                  )}
                  {attr.options && (
                    <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-semibold">
                      {plural(attr.options.length, "option")}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer: Usage & Edit */}
              <div className="flex items-center justify-between pt-3 border-t border-border-subtle text-xs">
                <span className="text-micro text-stone-500 font-medium">
                  {t("admin.taxonomyAttributeRegistryTab.utilisePar")}
                  <strong>{consumersCount}</strong> rubrique
                  {consumersCount > 1 ? "s" : ""}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(attr)}
                  leftIcon={<Edit2 className="w-icon-xs h-icon-xs" />}
                >
                  {t("admin.taxonomyAttributeRegistryTab.editer")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <AttributeEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        attribute={editingAttribute}
        onSuccess={() => {}}
      />
    </div>
  );
};
