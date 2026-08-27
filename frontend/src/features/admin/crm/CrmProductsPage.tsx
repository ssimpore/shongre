import React, { useEffect, useState } from "react";
import { Box, CheckCircle2, Plus, Search, Tag, XCircle } from "lucide-react";
import type { CrmProduct } from "@shongre/contracts/crm";
import { services } from "../../../api/client/service-registry";
import { Button } from "../../../design-system/primitives/Button";
import { Modal } from "../../../design-system/primitives/Modal";
import {
  FormField,
  Input,
  Select,
  Textarea,
} from "../../../design-system/primitives/FormField";
import { EmptyState, Skeleton } from "../../../design-system";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { useToast } from "../../../app/providers/ToastProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";

const typeLabels: Record<CrmProduct["productType"], string> = {
  subscription: "Abonnement",
  advertising: "Publicité",
  service: "Service",
  license: "Licence",
  credits: "Crédits",
  pack: "Pack",
  one_time: "Achat unique",
};
const intervalLabels = {
  one_time: "Achat unique",
  month: "/ mois",
  quarter: "/ trimestre",
  year: "/ an",
} as const;

export const CrmProductsPage: React.FC = () => {
  usePageMeta({
    title: "Produits CRM | Shongre",
    description: "Catalogue commercial et tarifs CRM.",
    canonicalPath: "/admin/crm/produits",
    noIndex: true,
  });
  const { activeMarket, currentLocale } = useMarketLocation();
  const toast = useToast();
  const [products, setProducts] = useState<CrmProduct[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] =
    useState<CrmProduct["productType"]>("subscription");
  const [amount, setAmount] = useState("");
  const [billingInterval, setBillingInterval] = useState<
    "one_time" | "month" | "quarter" | "year"
  >("month");

  const load = async (search = query) => {
    setLoading(true);
    try {
      setProducts(
        (
          await services.crm.listProducts({
            query: search || undefined,
            limit: 100,
          })
        ).items,
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Catalogue indisponible.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load("");
  }, []);

  const createProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    const priceMinor = Math.round(Number(amount.replace(",", ".")) * 100);
    if (
      !name.trim() ||
      !sku.trim() ||
      !Number.isSafeInteger(priceMinor) ||
      priceMinor < 0
    )
      return;
    setSubmitting(true);
    try {
      const product = await services.crm.createProduct({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        description: description.trim() || undefined,
        productType,
        isActive: true,
        metadata: {},
        price: {
          marketCode: activeMarket.code,
          amount: { amountMinor: priceMinor, currency: activeMarket.currency },
          billingInterval,
        },
      });
      setProducts((items) => [product, ...items]);
      setModalOpen(false);
      setName("");
      setSku("");
      setDescription("");
      setAmount("");
      toast.success("Produit ajouté au catalogue.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Produit non créé.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (product: CrmProduct) => {
    try {
      const updated = await services.crm.updateProduct(
        product.id,
        product.version,
        { isActive: !product.isActive },
      );
      setProducts((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success(
        updated.isActive ? "Produit activé." : "Produit désactivé.",
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Mise à jour impossible.",
      );
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-white sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-micro font-bold uppercase tracking-wider text-violet-300">
              CRM · Catalogue
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              Produits & tarifs
            </h1>
            <p className="mt-1 text-xs text-stone-400">
              Une source commerciale indépendante de la facturation Shongre.
            </p>
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-icon-md w-icon-md" /> Nouveau produit
          </Button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-stone-900 p-3">
            <span className="text-micro text-stone-400">Produits</span>
            <strong className="block text-xl font-black">
              {products.length}
            </strong>
          </div>
          <div className="rounded-xl bg-stone-900 p-3">
            <span className="text-micro text-stone-400">Actifs</span>
            <strong className="block text-xl font-black text-emerald-300">
              {products.filter((item) => item.isActive).length}
            </strong>
          </div>
          <div className="rounded-xl bg-stone-900 p-3">
            <span className="text-micro text-stone-400">Marché</span>
            <strong className="block text-xl font-black">
              {activeMarket.code}
            </strong>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-border-base bg-white shadow-xs">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void load();
          }}
          className="flex items-center gap-2 border-b border-border-subtle p-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-icon-md w-icon-md -translate-y-1/2 text-stone-400" />
            <Input
              aria-label="Rechercher un produit"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
              placeholder="Nom ou SKU…"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Rechercher
          </Button>
        </form>
        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Box className="h-8 w-8" />}
            title="Aucun produit"
            description="Créez le premier produit du catalogue commercial."
            className="border-0 shadow-none"
            action={
              <Button size="sm" onClick={() => setModalOpen(true)}>
                Créer un produit
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border-subtle">
            {products.map((product) => {
              const price =
                product.prices.find(
                  (item) => item.marketCode === activeMarket.code,
                ) ?? product.prices[0];
              return (
                <article
                  key={product.id}
                  className="grid gap-3 px-4 py-4 sm:grid-cols-4 sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                      <Tag className="h-icon-md w-icon-md" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="truncate text-xs font-black">
                          {product.name}
                        </strong>
                        <span
                          className={`rounded-full px-2 py-0.5 text-micro font-bold ${product.isActive ? "bg-success-surface text-success" : "bg-stone-100 text-stone-500"}`}
                        >
                          {product.isActive ? "Actif" : "Inactif"}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-micro text-stone-500">
                        {product.sku} · {typeLabels[product.productType]}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="block text-micro text-stone-500">
                      Tarif {price?.marketCode ?? "général"}
                    </span>
                    <strong className="text-sm font-black">
                      {price
                        ? new Intl.NumberFormat(currentLocale, {
                            style: "currency",
                            currency: price.amount.currency,
                          }).format(price.amount.amountMinor / 100)
                        : "Sur devis"}
                    </strong>
                    <span className="ml-1 text-micro text-stone-500">
                      {price?.billingInterval
                        ? intervalLabels[price.billingInterval]
                        : ""}
                    </span>
                  </div>
                  <div className="text-micro text-stone-500">
                    {product.description ?? "Sans description"}
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleActive(product)}
                    className="inline-flex min-h-control-md items-center justify-center gap-1 rounded-control border border-stone-200 px-3 text-micro font-bold hover:bg-stone-50"
                  >
                    {product.isActive ? (
                      <XCircle className="h-icon-sm w-icon-sm" />
                    ) : (
                      <CheckCircle2 className="h-icon-sm w-icon-sm" />
                    )}
                    {product.isActive ? "Désactiver" : "Activer"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouveau produit"
        description="Le prix est stocké en unité monétaire mineure et associé au marché actif."
      >
        <form onSubmit={createProduct} className="space-y-3.5 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nom" required>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </FormField>
            <FormField label="SKU" required>
              <Input
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                placeholder="PRO-BUSINESS-M"
                required
              />
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Type">
              <Select
                aria-label="Type de produit"
                value={productType}
                onChange={(event) =>
                  setProductType(
                    event.target.value as CrmProduct["productType"],
                  )
                }
                options={Object.entries(typeLabels).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </FormField>
            <FormField label={`Prix (${activeMarket.currency})`} required>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="99,00"
                required
              />
            </FormField>
            <FormField label="Facturation">
              <Select
                aria-label="Intervalle de facturation"
                value={billingInterval}
                onChange={(event) =>
                  setBillingInterval(
                    event.target.value as typeof billingInterval,
                  )
                }
                options={Object.entries(intervalLabels).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
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
