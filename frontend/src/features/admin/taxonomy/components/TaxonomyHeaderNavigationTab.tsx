import {
  TAXONOMY_HEADER_NAVIGATION_CONSTRAINTS,
  type TaxonomyHeaderCategoryItem,
  type TaxonomyHeaderNavigationConfiguration,
} from "@shongre/contracts/taxonomy";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ListOrdered,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { services } from "../../../../api/client/service-registry";
import { useMarketLocation } from "../../../../app/providers/MarketLocationProvider";
import { Button } from "../../../../design-system/primitives/Button";
import {
  FormField,
  Select,
  Switch,
} from "../../../../design-system/primitives/FormField";
import { IconButton } from "../../../../design-system/primitives/IconButton";
import { PromptModal } from "../../../../design-system/primitives/PromptModal";
import { StatePanel } from "../../../../design-system/primitives/StatePanel";
import { useTranslation } from "../../../../i18n/I18nProvider";
import type { Category } from "../../../../types";

function normalizeOrder(
  items: TaxonomyHeaderCategoryItem[],
): TaxonomyHeaderCategoryItem[] {
  return items.map((item, displayOrder) => ({ ...item, displayOrder }));
}

function categoryLabel(category: Category): string {
  return category.shortLabel || category.name;
}

export const TaxonomyHeaderNavigationTab: React.FC = () => {
  const { t, locale } = useTranslation();
  const { activeMarket, marketContext } = useMarketLocation();
  const [configuration, setConfiguration] =
    useState<TaxonomyHeaderNavigationConfiguration | null>(null);
  const [rootCategories, setRootCategories] = useState<Category[]>([]);
  const [categoryToAdd, setCategoryToAdd] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!marketContext) {
      setConfiguration(null);
      setError(t("admin.taxonomyHeader.marketRequired"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextConfiguration, nextRootCategories] = await Promise.all([
        services.taxonomy.getAdminHeaderNavigation(marketContext),
        services.taxonomy.getRootCategories(),
      ]);
      setConfiguration({
        ...nextConfiguration,
        items: normalizeOrder(
          [...nextConfiguration.items].sort(
            (left, right) => left.displayOrder - right.displayOrder,
          ),
        ),
      });
      setRootCategories(
        [...nextRootCategories].sort((left, right) =>
          categoryLabel(left).localeCompare(categoryLabel(right), locale),
        ),
      );
      setNotice(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t("admin.taxonomyHeader.loadError"),
      );
    } finally {
      setLoading(false);
    }
  }, [locale, marketContext, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCategoryIds = useMemo(
    () => new Set(configuration?.items.map((item) => item.categoryId) ?? []),
    [configuration?.items],
  );
  const rootCategoryById = useMemo(
    () => new Map(rootCategories.map((category) => [category.id, category])),
    [rootCategories],
  );
  const addableCategories = useMemo(
    () =>
      rootCategories.filter(
        (category) => !selectedCategoryIds.has(category.id),
      ),
    [rootCategories, selectedCategoryIds],
  );

  const updateItems = (
    update: (
      items: TaxonomyHeaderCategoryItem[],
    ) => TaxonomyHeaderCategoryItem[],
  ) => {
    setConfiguration((current) =>
      current
        ? { ...current, items: normalizeOrder(update(current.items)) }
        : current,
    );
    setNotice(null);
  };

  const addCategory = () => {
    const category = rootCategories.find((item) => item.id === categoryToAdd);
    if (!category) return;
    updateItems((items) => [
      ...items,
      {
        categoryId: category.id,
        slug: category.slug,
        labels: { "fr-FR": category.name },
        shortLabels: {
          "fr-FR": category.shortLabel || category.name,
        },
        iconName: category.iconName || "Package",
        isActive: true,
        displayOrder: items.length,
      },
    ]);
    setCategoryToAdd("");
  };

  const moveCategory = (index: number, offset: -1 | 1) => {
    updateItems((items) => {
      const nextIndex = index + offset;
      if (nextIndex < 0 || nextIndex >= items.length) return items;
      const reordered = [...items];
      [reordered[index], reordered[nextIndex]] = [
        reordered[nextIndex],
        reordered[index],
      ];
      return reordered;
    });
  };

  const save = async (changeReason: string) => {
    if (!configuration) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await services.taxonomy.saveHeaderNavigation({
        marketCode: configuration.marketCode,
        expectedRevision: configuration.revision,
        changeReason,
        items: configuration.items.map((item) => ({
          categoryId: item.categoryId,
          isActive: item.isActive,
          displayOrder: item.displayOrder,
        })),
      });
      setConfiguration({ ...saved, items: normalizeOrder(saved.items) });
      setNotice(t("admin.taxonomyHeader.saved"));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t("admin.taxonomyHeader.saveError"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading && !configuration) {
    return (
      <div className="flex min-h-80 items-center justify-center" role="status">
        <LoaderCircle className="h-icon-lg w-icon-lg animate-spin text-primary" />
        <span className="ml-2 text-xs font-semibold text-text-secondary">
          {t("admin.taxonomyHeader.loading")}
        </span>
      </div>
    );
  }

  if (!configuration) {
    return (
      <StatePanel
        variant="error"
        title={t("admin.taxonomyHeader.unavailableTitle")}
        description={error || t("admin.taxonomyHeader.loadError")}
        action={
          <Button onClick={() => void load()}>{t("common.retry")}</Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border-base bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ListOrdered className="h-icon-lg w-icon-lg text-primary" />
              <h2 className="text-base font-black text-text-main">
                {t("admin.taxonomyHeader.title")}
              </h2>
              <span className="rounded-full bg-bg-subtle px-2 py-1 text-micro font-bold text-text-secondary">
                {activeMarket.code} · v{configuration.revision}
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-xs text-text-secondary">
              {t("admin.taxonomyHeader.description")}
            </p>
            {configuration.updatedAt ? (
              <p className="mt-2 text-micro text-text-muted">
                {t("admin.taxonomyHeader.updatedAt", {
                  date: new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(configuration.updatedAt)),
                })}
              </p>
            ) : null}
          </div>
          <Button
            size="sm"
            disabled={saving}
            onClick={() => setReasonModalOpen(true)}
            leftIcon={
              saving ? (
                <LoaderCircle className="h-icon-sm w-icon-sm animate-spin" />
              ) : (
                <Save className="h-icon-sm w-icon-sm" />
              )
            }
          >
            {t("admin.taxonomyHeader.save")}
          </Button>
        </div>

        {error || notice ? (
          <div
            role="status"
            className={`mt-4 flex items-start gap-2 rounded-control border px-3 py-2 text-xs font-semibold ${
              error
                ? "border-danger-border bg-danger-surface text-danger"
                : "border-success-border bg-success-surface text-success"
            }`}
          >
            {error ? (
              <AlertTriangle className="h-icon-md w-icon-md shrink-0" />
            ) : null}
            <span>{error || notice}</span>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 rounded-control border border-border-base bg-bg-subtle p-4 sm:flex-row sm:items-end">
          <FormField
            className="min-w-0 flex-1"
            label={t("admin.taxonomyHeader.addLabel")}
          >
            <Select
              labelledByAncestor
              value={categoryToAdd}
              onChange={(event) => setCategoryToAdd(event.target.value)}
            >
              <option value="">
                {t("admin.taxonomyHeader.addPlaceholder")}
              </option>
              {addableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {categoryLabel(category)}
                </option>
              ))}
            </Select>
          </FormField>
          <Button
            variant="outline"
            disabled={!categoryToAdd}
            onClick={addCategory}
            leftIcon={<Plus className="h-icon-sm w-icon-sm" />}
          >
            {t("admin.taxonomyHeader.add")}
          </Button>
        </div>
      </section>

      <section
        className="rounded-2xl border border-border-base bg-white p-4 shadow-xs sm:p-5"
        aria-labelledby="taxonomy-header-category-list"
      >
        <h3
          id="taxonomy-header-category-list"
          className="text-sm font-black text-text-main"
        >
          {t("admin.taxonomyHeader.selectedTitle", {
            count: configuration.items.length,
          })}
        </h3>
        {configuration.items.length === 0 ? (
          <p className="mt-4 rounded-control bg-bg-subtle p-5 text-center text-xs text-text-secondary">
            {t("admin.taxonomyHeader.empty")}
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {configuration.items.map((item, index) => {
              const rootCategory = rootCategoryById.get(item.categoryId);
              const label = rootCategory
                ? categoryLabel(rootCategory)
                : item.shortLabels[locale] ||
                  item.shortLabels["fr-FR"] ||
                  item.labels["fr-FR"];
              return (
                <li
                  key={item.categoryId}
                  className="flex flex-col gap-3 rounded-control border border-border-base p-3 sm:flex-row sm:items-center"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-black text-primary">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-text-main">
                      {label}
                    </span>
                    <span className="block truncate text-micro text-text-muted">
                      {item.categoryId}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Switch
                      checked={item.isActive}
                      aria-label={t("admin.taxonomyHeader.toggle", {
                        name: label,
                      })}
                      onChange={(isActive) =>
                        updateItems((items) =>
                          items.map((candidate) =>
                            candidate.categoryId === item.categoryId
                              ? { ...candidate, isActive }
                              : candidate,
                          ),
                        )
                      }
                    />
                    <IconButton
                      size="sm"
                      variant="ghost"
                      ariaLabel={t("admin.taxonomyHeader.moveUp", {
                        name: label,
                      })}
                      disabled={index === 0}
                      onClick={() => moveCategory(index, -1)}
                    >
                      <ArrowUp
                        className="h-icon-sm w-icon-sm"
                        aria-hidden="true"
                      />
                    </IconButton>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      ariaLabel={t("admin.taxonomyHeader.moveDown", {
                        name: label,
                      })}
                      disabled={index === configuration.items.length - 1}
                      onClick={() => moveCategory(index, 1)}
                    >
                      <ArrowDown
                        className="h-icon-sm w-icon-sm"
                        aria-hidden="true"
                      />
                    </IconButton>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      ariaLabel={t("admin.taxonomyHeader.remove", {
                        name: label,
                      })}
                      onClick={() =>
                        updateItems((items) =>
                          items.filter(
                            (candidate) =>
                              candidate.categoryId !== item.categoryId,
                          ),
                        )
                      }
                    >
                      <Trash2
                        className="h-icon-sm w-icon-sm"
                        aria-hidden="true"
                      />
                    </IconButton>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <PromptModal
        isOpen={reasonModalOpen}
        onClose={() => setReasonModalOpen(false)}
        onSubmit={(reason) => void save(reason)}
        title={t("admin.taxonomyHeader.saveTitle")}
        label={t("admin.taxonomyHeader.reasonLabel")}
        placeholder={t("admin.taxonomyHeader.reasonPlaceholder")}
        confirmText={t("admin.taxonomyHeader.save")}
        multiline
        minLength={
          TAXONOMY_HEADER_NAVIGATION_CONSTRAINTS.changeReason.minLength
        }
      />
    </div>
  );
};
