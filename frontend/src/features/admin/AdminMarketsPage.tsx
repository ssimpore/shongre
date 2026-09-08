import React, { useEffect, useMemo, useState } from "react";
import type { MarketLaunchStatus } from "@shongre/contracts/market-country";
import type {
  CountryMarketDefinition,
  MarketConfigurationChangeRequest,
} from "../../api/contracts/markets.contract";
import { services } from "../../api/client/service-registry";
import { Select } from "../../design-system";
import { Badge } from "../../design-system/primitives/Badge";
import { Button } from "../../design-system/primitives/Button";
import { Input, Textarea } from "../../design-system/primitives/FormField";
import { StatePanel } from "../../design-system/primitives/StatePanel";
import { usePageMeta } from "../../hooks/usePageMeta";

const LAUNCH_STATUSES: readonly MarketLaunchStatus[] = [
  "disabled",
  "unsupported",
  "coming_soon",
  "private_beta",
  "beta",
  "active",
  "paused",
];

type EditableMarket = Pick<
  CountryMarketDefinition,
  "name" | "nativeName" | "enabled" | "launchStatus" | "gatewayVisible"
>;

const toEditable = (market: CountryMarketDefinition): EditableMarket => ({
  name: market.name,
  nativeName: market.nativeName,
  enabled: market.enabled,
  launchStatus: market.launchStatus,
  gatewayVisible: market.gatewayVisible,
});

export const AdminMarketsPage: React.FC = () => {
  usePageMeta({
    title: "Administration des marchés",
    description: "Configuration et gouvernance des marchés Shongre.",
    canonicalPath: "/admin/marches",
    noIndex: true,
  });
  const [markets, setMarkets] = useState<CountryMarketDefinition[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [form, setForm] = useState<EditableMarket | null>(null);
  const [changes, setChanges] = useState<
    readonly MarketConfigurationChangeRequest[]
  >([]);
  const [reason, setReason] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMarket = useMemo(
    () => markets.find((market) => market.code === selectedCode) ?? null,
    [markets, selectedCode],
  );

  const loadMarkets = async () => {
    setState("loading");
    setError(null);
    try {
      const loaded = await services.markets.getAllMarkets();
      setMarkets(loaded);
      setSelectedCode((current) => current || loaded[0]?.code || "");
      setState("ready");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Les marchés sont indisponibles.",
      );
      setState("error");
    }
  };

  useEffect(() => {
    void loadMarkets();
  }, []);

  useEffect(() => {
    if (!selectedMarket) return;
    setForm(toEditable(selectedMarket));
    let active = true;
    services.markets
      .listCountryConfigurationChanges(selectedMarket.code)
      .then((items) => {
        if (active) setChanges(items);
      })
      .catch(() => {
        if (active) setChanges([]);
      });
    return () => {
      active = false;
    };
  }, [selectedMarket]);

  const submitChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedMarket || !form || reason.trim().length < 8) return;
    setSaving(true);
    setError(null);
    try {
      const request = await services.markets.updateCountryConfiguration(
        selectedMarket.code,
        {
          expectedVersion: selectedMarket.version ?? 1,
          reason: reason.trim(),
          patch: form,
        },
      );
      setChanges((current) => [request, ...current]);
      setReason("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "La modification a échoué.",
      );
    } finally {
      setSaving(false);
    }
  };

  const review = async (
    request: MarketConfigurationChangeRequest,
    decision: "approve" | "reject",
  ) => {
    if (reviewReason.trim().length < 8) return;
    setSaving(true);
    setError(null);
    try {
      if (decision === "approve") {
        await services.markets.approveCountryConfigurationChange(
          request.marketCode,
          request.id,
          reviewReason.trim(),
        );
        await loadMarkets();
      } else {
        await services.markets.rejectCountryConfigurationChange(
          request.marketCode,
          request.id,
          reviewReason.trim(),
        );
      }
      setChanges((current) =>
        current.map((item) =>
          item.id === request.id
            ? {
                ...item,
                status: decision === "approve" ? "approved" : "rejected",
              }
            : item,
        ),
      );
      setReviewReason("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La revue a échoué.");
    } finally {
      setSaving(false);
    }
  };

  if (state === "loading") {
    return (
      <p className="p-6 text-sm text-text-supporting">
        Chargement des marchés…
      </p>
    );
  }
  if (state === "error") {
    return (
      <StatePanel
        variant="error"
        title="Marchés indisponibles"
        description={error ?? "Les marchés sont indisponibles."}
        action={<Button onClick={() => void loadMarkets()}>Réessayer</Button>}
      />
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-text-main">Marchés</h1>
        <p className="mt-1 text-sm text-text-supporting">
          Configuration versionnée fournie par l’API Shongre.
        </p>
      </header>
      {error && (
        <StatePanel
          variant="error"
          title="Action impossible"
          description={error}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-aside-content-lg">
        <nav
          aria-label="Marchés"
          className="space-y-1 rounded-card border border-border-base bg-bg-surface p-3"
        >
          {markets.map((market) => (
            <button
              key={market.code}
              type="button"
              onClick={() => setSelectedCode(market.code)}
              className={`flex w-full items-center justify-between rounded-control px-3 py-2 text-left text-sm ${market.code === selectedCode ? "bg-primary-light text-primary" : "text-text-main hover:bg-bg-subtle"}`}
            >
              <span>
                {market.flag} {market.name}
              </span>
              <Badge variant={market.enabled ? "success" : "neutral"}>
                {market.launchStatus}
              </Badge>
            </button>
          ))}
        </nav>

        {selectedMarket && form && (
          <div className="space-y-5">
            <form
              onSubmit={submitChange}
              className="space-y-4 rounded-card border border-border-base bg-bg-surface p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-text-main">
                    {selectedMarket.flag} {selectedMarket.name}
                  </h2>
                  <p className="text-xs text-text-tertiary">
                    {selectedMarket.code} · version{" "}
                    {selectedMarket.version ?? "—"}
                  </p>
                </div>
                <Badge variant={selectedMarket.enabled ? "success" : "neutral"}>
                  {selectedMarket.enabled ? "Activé" : "Désactivé"}
                </Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-text-main">
                  Nom
                  <Input
                    className="mt-1"
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                  />
                </label>
                <label className="text-sm font-semibold text-text-main">
                  Nom local
                  <Input
                    className="mt-1"
                    value={form.nativeName}
                    onChange={(event) =>
                      setForm({ ...form, nativeName: event.target.value })
                    }
                  />
                </label>
                <label className="text-sm font-semibold text-text-main">
                  État de lancement
                  <Select
                    labelledByAncestor
                    className="mt-1 w-full"
                    value={form.launchStatus}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        launchStatus: event.target.value as MarketLaunchStatus,
                      })
                    }
                  >
                    {LAUNCH_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </label>
                <div className="flex flex-col justify-end gap-2 pb-1 text-sm text-text-main">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(event) =>
                        setForm({ ...form, enabled: event.target.checked })
                      }
                    />
                    Marché activé
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.gatewayVisible}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          gatewayVisible: event.target.checked,
                        })
                      }
                    />
                    Visible dans le sélecteur
                  </label>
                </div>
              </div>
              <label className="block text-sm font-semibold text-text-main">
                Justification
                <Textarea
                  className="mt-1"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                <span className="mt-1 block text-xs font-normal text-text-tertiary">
                  8 caractères minimum. La modification reste en attente de
                  revue.
                </span>
              </label>
              <Button
                type="submit"
                disabled={saving || reason.trim().length < 8}
              >
                Créer la demande
              </Button>
            </form>

            <section className="space-y-3 rounded-card border border-border-base bg-bg-surface p-5">
              <h2 className="text-lg font-bold text-text-main">
                Demandes de configuration
              </h2>
              {changes.length === 0 ? (
                <p className="text-sm text-text-supporting">Aucune demande.</p>
              ) : (
                <>
                  <label className="block text-sm font-semibold text-text-main">
                    Motif de revue
                    <Textarea
                      className="mt-1"
                      value={reviewReason}
                      onChange={(event) => setReviewReason(event.target.value)}
                    />
                  </label>
                  {changes.map((request) => (
                    <article
                      key={request.id}
                      className="rounded-control border border-border-base p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-text-main">
                            {request.changedFields.join(" · ")}
                          </p>
                          <p className="mt-1 text-xs text-text-supporting">
                            {request.reason}
                          </p>
                        </div>
                        <Badge
                          variant={
                            request.status === "approved"
                              ? "success"
                              : "neutral"
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>
                      {request.status === "pending" && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            disabled={saving || reviewReason.trim().length < 8}
                            onClick={() => void review(request, "approve")}
                          >
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving || reviewReason.trim().length < 8}
                            onClick={() => void review(request, "reject")}
                          >
                            Rejeter
                          </Button>
                        </div>
                      )}
                    </article>
                  ))}
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
