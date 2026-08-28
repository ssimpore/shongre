import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Eye,
  FilePlus2,
  Files,
  LayoutDashboard,
  ReceiptText,
  Settings2,
  UsersRound,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  INVOICING_LINE_DESCRIPTION_MAX_LENGTH,
  type InvoicingDocument,
  type InvoicingInvoice,
  type InvoicingParty,
  type InvoicingWorkspace,
} from "@shongre/contracts/invoicing";
import { Badge, Button, Notice } from "../../design-system";
import { services } from "../../api/client/service-registry";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";
import { useTranslation } from "../../i18n/I18nProvider";
import { routes } from "../../configuration/routes";

type LoadState = "loading" | "ready" | "error";

function majorMoneyToMinorDecimal(value: string): string | null {
  const match = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const whole = Number(match[1]);
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  return String(whole * 100 + cents);
}

function minorDecimalToMajorMoney(value: string): string {
  const minor = Number(value);
  return Number.isFinite(minor) ? (minor / 100).toFixed(2) : "0.00";
}

export function InvoicingWorkspacePage() {
  const { t, locale } = useTranslation();
  const { activeMarket, currentCurrency } = useMarketLocation();
  const { formatDate, formatMoneyMinor, formatPercentFromBps } =
    useRegionalFormatters();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [workspace, setWorkspace] = useState<InvoicingWorkspace | null>(null);
  const [parties, setParties] = useState<InvoicingParty[]>([]);
  const [selectedInvoice, setSelectedInvoice] =
    useState<InvoicingInvoice | null>(null);
  const [selectedDocument, setSelectedDocument] =
    useState<InvoicingDocument | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [description, setDescription] = useState("Conception graphique");
  const [quantity, setQuantity] = useState("1.5");
  const [unitPrice, setUnitPrice] = useState("10.00");
  const [taxRateBps, setTaxRateBps] = useState(2000);
  const [customerPartyId, setCustomerPartyId] = useState("");
  const [issueDate, setIssueDate] = useState("2026-08-28");
  const [dueDate, setDueDate] = useState("2026-09-27");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  usePageMeta({
    title: "Shongre Facturation — Espace de facturation",
    description: t("invoicing.workspace.description"),
    canonicalPath: routes.facturation.workspace(),
    noIndex: true,
  });

  const loadWorkspace = useCallback(async () => {
    setLoadState("loading");
    try {
      const next = await services.invoicing.getWorkspace(activeMarket.code);
      const tenantId = next.tenants[0]?.id;
      const nextParties = tenantId
        ? await services.invoicing.listParties(tenantId)
        : [];
      setWorkspace(next);
      setParties(nextParties);
      setSelectedInvoice((current) => {
        if (current) {
          return (
            next.recentInvoices.find((invoice) => invoice.id === current.id) ??
            current
          );
        }
        return (
          [...next.recentInvoices]
            .reverse()
            .find((invoice) => invoice.commercialState === "DRAFT") ?? null
        );
      });
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, [activeMarket.code]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!selectedInvoice) return;
    const line = selectedInvoice.lines[0];
    setCustomerPartyId(selectedInvoice.customerPartyId);
    setIssueDate(selectedInvoice.issueDate);
    setDueDate(selectedInvoice.dueDate);
    if (line) {
      setDescription(line.description);
      setQuantity(line.quantity);
      setUnitPrice(minorDecimalToMajorMoney(line.unitPriceMinorDecimal));
      setTaxRateBps(line.taxRateBps);
    }
  }, [selectedInvoice?.id, selectedInvoice?.version]);

  useEffect(() => {
    if (!customerPartyId && parties[0]) setCustomerPartyId(parties[0].id);
  }, [customerPartyId, parties]);

  const summaries = useMemo(() => {
    const invoices = workspace?.recentInvoices ?? [];
    return {
      drafts: invoices.filter((invoice) => invoice.commercialState === "DRAFT")
        .length,
      finalized: invoices.filter(
        (invoice) =>
          invoice.commercialState === "FINALIZED" ||
          invoice.commercialState === "CREDITED",
      ).length,
      outstanding: invoices
        .filter(
          (invoice) =>
            invoice.commercialState === "FINALIZED" &&
            invoice.paymentState !== "PAID",
        )
        .reduce((sum, invoice) => sum + invoice.outstanding.amountMinor, 0),
    };
  }, [workspace]);

  const partyName = useCallback(
    (invoice: InvoicingInvoice) =>
      parties.find((party) => party.id === invoice.customerPartyId)
        ?.legalName ??
      invoice.notes ??
      "—",
    [parties],
  );

  const submitDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !workspace?.tenants[0] ||
      !workspace.legalEntities[0] ||
      !customerPartyId
    )
      return;
    const unitPriceMinorDecimal = majorMoneyToMinorDecimal(unitPrice);
    if (!unitPriceMinorDecimal) {
      setFeedback({
        kind: "error",
        message: t("invoicing.workspace.saveError"),
      });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const editable =
        selectedInvoice &&
        ["DRAFT", "READY_TO_FINALIZE"].includes(
          selectedInvoice.commercialState,
        );
      const commonDraft = {
        customerPartyId,
        issueDate,
        dueDate,
        lines: [
          {
            description,
            quantity,
            unit: "hour",
            unitPriceMinorDecimal,
            taxRateBps,
            taxCategory:
              taxRateBps === 0 ? ("ZERO" as const) : ("STANDARD" as const),
          },
        ],
      };
      const draft = editable
        ? await services.invoicing.updateInvoiceDraft(selectedInvoice.id, {
            expectedVersion: selectedInvoice.version,
            ...commonDraft,
          })
        : await services.invoicing.createInvoice(
            {
              tenantId: workspace.tenants[0].id,
              legalEntityId: workspace.legalEntities[0].id,
              documentType: "standard_invoice",
              marketCode: activeMarket.code,
              countryCode: activeMarket.code,
              locale,
              timezone: workspace.legalEntities[0].timezone,
              currency: workspace.legalEntities[0].defaultCurrency,
              origin: "MANUAL",
              ...commonDraft,
            },
            `ui-draft-${workspace.tenants[0].id}-${description}-${quantity}-${unitPrice}`,
          );
      setSelectedInvoice(draft);
      await loadWorkspace();
      setSelectedInvoice(draft);
      setFeedback({ kind: "success", message: t("invoicing.workspace.saved") });
    } catch {
      setFeedback({
        kind: "error",
        message: t("invoicing.workspace.saveError"),
      });
    } finally {
      setSaving(false);
    }
  };

  const createCustomer = async () => {
    const tenant = workspace?.tenants[0];
    const issuer = workspace?.legalEntities[0];
    if (!tenant || !issuer || !newCustomerName.trim()) return;
    setSavingCustomer(true);
    setFeedback(null);
    try {
      const created = await services.invoicing.createParty({
        tenantId: tenant.id,
        kind: "company",
        roles: ["customer"],
        legalName: newCustomerName.trim(),
        billingAddress: issuer.registeredAddress,
        email: newCustomerEmail.trim() || undefined,
        locale: issuer.defaultLocale,
        preferredCurrency: issuer.defaultCurrency,
        paymentTermsDays: 30,
        identifiers: [],
      });
      setParties((current) => [...current, created]);
      setCustomerPartyId(created.id);
      setNewCustomerName("");
      setNewCustomerEmail("");
      setFeedback({
        kind: "success",
        message: "Client ajouté à l’organisation.",
      });
    } catch {
      setFeedback({
        kind: "error",
        message: "Le client n’a pas pu être ajouté.",
      });
    } finally {
      setSavingCustomer(false);
    }
  };

  const finalizeSelected = async () => {
    if (
      !selectedInvoice ||
      !["DRAFT", "READY_TO_FINALIZE"].includes(selectedInvoice.commercialState)
    )
      return;
    setFinalizing(true);
    setFeedback(null);
    try {
      const finalized = await services.invoicing.finalizeInvoice(
        selectedInvoice.id,
        selectedInvoice.version,
        `ui-finalize-${selectedInvoice.id}`,
      );
      await loadWorkspace();
      setSelectedInvoice(finalized);
      setSelectedDocument(null);
      setFeedback({
        kind: "success",
        message: t("invoicing.workspace.finalizedMessage"),
      });
    } catch {
      setFeedback({
        kind: "error",
        message: t("invoicing.workspace.finalizeError"),
      });
    } finally {
      setFinalizing(false);
    }
  };

  const loadSelectedDocument = async () => {
    if (!selectedInvoice) return null;
    setDocumentLoading(true);
    setFeedback(null);
    try {
      const document = await services.invoicing.getDocument(selectedInvoice.id);
      setSelectedDocument(document);
      return document;
    } catch {
      setFeedback({
        kind: "error",
        message: t("invoicing.workspace.documentError"),
      });
      return null;
    } finally {
      setDocumentLoading(false);
    }
  };

  const downloadSelectedDocument = async () => {
    const document =
      selectedDocument?.invoiceId === selectedInvoice?.id
        ? selectedDocument
        : await loadSelectedDocument();
    if (!document) return;
    const url = URL.createObjectURL(
      new Blob([document.content], { type: document.mediaType }),
    );
    const link = window.document.createElement("a");
    link.href = url;
    link.download = document.fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loadState === "loading" && !workspace) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6" role="status">
        <div className="h-7 w-56 animate-pulse rounded bg-bg-muted" />
        <div className="mt-6 h-32 animate-pulse rounded-card bg-bg-muted" />
        <span className="sr-only">{t("invoicing.workspace.loading")}</span>
      </div>
    );
  }

  if (loadState === "error" || !workspace) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Notice variant="error" title={t("invoicing.workspace.loadError")}>
          <Button
            className="mt-3"
            size="sm"
            onClick={() => void loadWorkspace()}
          >
            {t("common.retry")}
          </Button>
        </Notice>
      </div>
    );
  }

  const selectedLine = selectedInvoice?.lines[0];
  const navigation = [
    [LayoutDashboard, t("invoicing.workspace.overview"), "#overview"],
    [ReceiptText, t("invoicing.workspace.invoices"), "#invoices"],
    [UsersRound, t("invoicing.workspace.customers"), "#customers"],
    [UsersRound, "Équipe", "#team"],
    [CircleDollarSign, "Abonnement", "#subscription"],
    [Building2, t("invoicing.workspace.legalEntities"), "#entities"],
    [Settings2, t("invoicing.workspace.settings"), "#settings"],
  ] as const;

  return (
    <div className="bg-bg-base">
      <div className="mx-auto grid w-full min-w-0 max-w-page overflow-hidden lg:grid-cols-6">
        <aside className="min-w-0 max-w-full overflow-hidden border-b border-border-base bg-bg-surface lg:col-span-1 lg:min-h-screen lg:border-b-0 lg:border-r">
          <nav
            aria-label={t("invoicing.workspace.navigation")}
            className="flex max-w-full gap-1 overflow-x-auto p-3 lg:sticky lg:top-0 lg:block lg:space-y-1 lg:p-4"
          >
            {navigation.map(([Icon, label, href], index) => (
              <a
                key={href}
                href={href}
                className={`inline-flex min-h-control-sm shrink-0 items-center gap-2 rounded-control px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:flex ${
                  index === 1
                    ? "bg-primary-light text-primary"
                    : "text-text-secondary hover:bg-bg-subtle hover:text-text-main"
                }`}
              >
                <Icon className="h-icon-sm w-icon-sm" aria-hidden="true" />
                {label}
              </a>
            ))}
            <div className="hidden pt-8 lg:block">
              <Badge variant="primary">{t("invoicing.workspace.demo")}</Badge>
            </div>
          </nav>
        </aside>

        <div
          id="overview"
          className="min-w-0 px-4 py-5 sm:px-6 lg:col-span-5 lg:px-8"
        >
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-text-main sm:text-3xl">
                  {t("invoicing.workspace.title")}
                </h1>
                <Badge variant="primary" className="lg:hidden">
                  {t("invoicing.workspace.demo")}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                {t("invoicing.workspace.description")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-micro font-bold text-text-muted">
                <span className="rounded-control border border-border-base bg-bg-surface px-2 py-1">
                  {t("invoicing.workspace.market")}: {activeMarket.name} ·{" "}
                  {currentCurrency}
                </span>
                <span className="rounded-control border border-border-base bg-bg-surface px-2 py-1">
                  {t("invoicing.workspace.organization")}:{" "}
                  {workspace.tenants[0]?.legalName ?? "—"}
                </span>
              </div>
            </div>
            <Button
              size="compact"
              leftIcon={<FilePlus2 className="h-icon-sm w-icon-sm" />}
              onClick={() => {
                setSelectedInvoice(null);
                setSelectedDocument(null);
                setDescription("Nouvelle prestation");
                formRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {t("invoicing.workspace.newInvoice")}
            </Button>
          </header>

          <Notice
            variant="warning"
            className="mt-5"
            title={t("invoicing.workspace.configurationTitle")}
          >
            {t("invoicing.workspace.configurationBody")}
          </Notice>

          <section
            className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            aria-label={t("invoicing.workspace.overview")}
          >
            {[
              {
                icon: Files,
                value: String(summaries.drafts),
                label: t("invoicing.workspace.drafts"),
              },
              {
                icon: CheckCircle2,
                value: String(summaries.finalized),
                label: t("invoicing.workspace.finalized"),
              },
              {
                icon: CircleDollarSign,
                value: formatMoneyMinor(summaries.outstanding, currentCurrency),
                label: t("invoicing.workspace.outstanding"),
              },
              {
                icon: Settings2,
                value: t("invoicing.workspace.transport"),
                label: t("invoicing.workspace.configurationRequired"),
              },
            ].map(({ icon: Icon, value, label }) => (
              <article
                key={label}
                className="flex items-center gap-3 rounded-card border border-border-base bg-bg-surface p-4 shadow-xs"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                  <Icon className="h-icon-md w-icon-md" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-text-main">
                    {value}
                  </p>
                  <p className="text-micro text-text-muted">{label}</p>
                </div>
              </article>
            ))}
          </section>

          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            <section
              id="invoices"
              className="min-w-0 overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs xl:col-span-2"
            >
              <div className="border-b border-border-base px-4 py-3">
                <h2 className="text-sm font-black text-text-main">
                  {t("invoicing.workspace.recent")}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-screen-sm text-left text-xs">
                  <thead className="bg-bg-subtle text-micro uppercase tracking-wide text-text-muted">
                    <tr>
                      {[
                        "number",
                        "customer",
                        "issueDate",
                        "dueDate",
                        "total",
                        "payment",
                        "status",
                      ].map((key) => (
                        <th
                          key={key}
                          scope="col"
                          className="px-4 py-2.5 font-bold"
                        >
                          {key === "payment"
                            ? "Paiement"
                            : t(
                                `invoicing.workspace.${key}` as Parameters<
                                  typeof t
                                >[0],
                              )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {workspace.recentInvoices.map((invoice) => {
                      const isFinal =
                        invoice.commercialState === "FINALIZED" ||
                        invoice.commercialState === "CREDITED";
                      return (
                        <tr
                          key={invoice.id}
                          className={`hover:bg-bg-subtle ${selectedInvoice?.id === invoice.id ? "bg-primary-light/40" : ""}`}
                        >
                          <td className="px-4 py-3 font-bold text-text-main">
                            <button
                              type="button"
                              aria-pressed={selectedInvoice?.id === invoice.id}
                              className="rounded-control text-left font-bold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setSelectedDocument(null);
                              }}
                            >
                              {invoice.number ??
                                `BROUILLON-${invoice.id.slice(-4).toUpperCase()}`}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {partyName(invoice)}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {formatDate(`${invoice.issueDate}T12:00:00Z`)}
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {formatDate(`${invoice.dueDate}T12:00:00Z`)}
                          </td>
                          <td className="px-4 py-3 font-bold text-text-main">
                            {formatMoneyMinor(
                              invoice.total.amountMinor,
                              invoice.currency,
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                invoice.paymentState === "PAID"
                                  ? "success"
                                  : "neutral"
                              }
                            >
                              {invoice.paymentState === "PAID"
                                ? "Payée"
                                : "À suivre"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              <Badge variant={isFinal ? "success" : "neutral"}>
                                {invoice.commercialState === "CREDITED"
                                  ? t("invoicing.workspace.creditedStatus")
                                  : invoice.commercialState === "FINALIZED"
                                    ? t("invoicing.workspace.finalizedStatus")
                                    : t("invoicing.workspace.draft")}
                              </Badge>
                              {isFinal && (
                                <Badge variant="warning">
                                  {t(
                                    "invoicing.workspace.configurationRequired",
                                  )}
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {workspace.recentInvoices.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-10 text-center text-text-muted"
                        >
                          {t("invoicing.workspace.noInvoices")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section
              id="settings"
              className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs"
            >
              <h2 className="text-sm font-black text-text-main">
                {t("invoicing.workspace.readiness")}
              </h2>
              <ul className="mt-3 space-y-2.5">
                {workspace.readiness.map((item) => {
                  const ready = item.status !== "missing";
                  const Icon = ready ? CheckCircle2 : XCircle;
                  return (
                    <li
                      key={item.key}
                      className="flex items-start gap-2 text-xs text-text-secondary"
                    >
                      <Icon
                        className={`mt-0.5 h-icon-sm w-icon-sm shrink-0 ${ready ? "text-success" : item.blocking ? "text-warning" : "text-text-muted"}`}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <section className="mt-5 grid gap-5 xl:grid-cols-3">
            <form
              ref={formRef}
              onSubmit={submitDraft}
              className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs xl:col-span-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-black text-text-main">
                  {t("invoicing.workspace.draftPanel")}
                </h2>
                {selectedInvoice && (
                  <span className="text-micro font-bold text-text-muted">
                    {selectedInvoice.number ?? selectedInvoice.id}
                  </span>
                )}
              </div>
              <div className="mt-4">
                <label
                  htmlFor="invoice-recipient"
                  className="mb-1.5 block text-micro font-bold text-text-secondary"
                >
                  {t("invoicing.workspace.recipient")}
                </label>
                <select
                  id="invoice-recipient"
                  value={customerPartyId}
                  onChange={(event) => setCustomerPartyId(event.target.value)}
                  className="h-control-md w-full rounded-control border border-border-base bg-bg-surface px-3 text-xs text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                >
                  {parties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.legalName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-micro font-bold text-text-secondary">
                  Date d’émission
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                    className="mt-1.5 h-control-md w-full rounded-control border border-border-base px-3 text-xs font-normal"
                  />
                </label>
                <label className="text-micro font-bold text-text-secondary">
                  Échéance
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="mt-1.5 h-control-md w-full rounded-control border border-border-base px-3 text-xs font-normal"
                  />
                </label>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-micro font-bold text-text-secondary sm:col-span-2">
                  {t("invoicing.workspace.descriptionField")}
                  <input
                    required
                    maxLength={INVOICING_LINE_DESCRIPTION_MAX_LENGTH}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="mt-1.5 h-control-md w-full rounded-control border border-border-base px-3 text-xs font-normal text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  />
                </label>
                <label className="text-micro font-bold text-text-secondary">
                  {t("invoicing.workspace.quantity")}
                  <input
                    required
                    inputMode="decimal"
                    pattern="[0-9]+([.,][0-9]{1,6})?"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="mt-1.5 h-control-md w-full rounded-control border border-border-base px-3 text-xs font-normal text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  />
                </label>
                <label className="text-micro font-bold text-text-secondary">
                  {t("invoicing.workspace.unitPrice")}
                  <input
                    required
                    inputMode="decimal"
                    pattern="[0-9]+([.,][0-9]{1,2})?"
                    value={unitPrice}
                    onChange={(event) => setUnitPrice(event.target.value)}
                    className="mt-1.5 h-control-md w-full rounded-control border border-border-base px-3 text-xs font-normal text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  />
                </label>
                <label className="text-micro font-bold text-text-secondary">
                  {t("invoicing.workspace.taxRate")}
                  <select
                    value={taxRateBps}
                    onChange={(event) =>
                      setTaxRateBps(Number(event.target.value))
                    }
                    className="mt-1.5 h-control-md w-full rounded-control border border-border-base bg-bg-surface px-3 text-xs font-normal text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  >
                    <option value={2000}>20 %</option>
                    <option value={1000}>10 %</option>
                    <option value={550}>5,5 %</option>
                    <option value={0}>0 %</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="submit"
                  size="compact"
                  isLoading={saving}
                  disabled={!workspace.legalEntities[0] || !parties[0]}
                >
                  {selectedInvoice &&
                  ["DRAFT", "READY_TO_FINALIZE"].includes(
                    selectedInvoice.commercialState,
                  )
                    ? "Enregistrer les modifications"
                    : t("invoicing.workspace.saveDraft")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="compact"
                  isLoading={finalizing}
                  disabled={
                    !selectedInvoice ||
                    !["DRAFT", "READY_TO_FINALIZE"].includes(
                      selectedInvoice.commercialState,
                    )
                  }
                  onClick={() => void finalizeSelected()}
                >
                  {t("invoicing.workspace.finalize")}
                </Button>
              </div>
              <p className="mt-2 text-micro text-text-muted">
                {t("invoicing.workspace.finalizeWarning")}
              </p>
              {feedback && (
                <p
                  role={feedback.kind === "error" ? "alert" : "status"}
                  className={`mt-3 text-xs font-bold ${feedback.kind === "error" ? "text-danger" : "text-success"}`}
                >
                  {feedback.message}
                </p>
              )}
            </form>

            <aside
              id="entities"
              className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs"
            >
              <h2 className="text-sm font-black text-text-main">
                {t("invoicing.workspace.total")}
              </h2>
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-4 text-text-secondary">
                  <dt>{t("invoicing.workspace.subtotal")}</dt>
                  <dd className="font-bold text-text-main">
                    {selectedInvoice
                      ? formatMoneyMinor(
                          selectedInvoice.subtotal.amountMinor,
                          selectedInvoice.currency,
                        )
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 text-text-secondary">
                  <dt>
                    {t("invoicing.workspace.tax")}
                    {selectedLine
                      ? ` (${formatPercentFromBps(selectedLine.taxRateBps)})`
                      : ""}
                  </dt>
                  <dd className="font-bold text-text-main">
                    {selectedInvoice
                      ? formatMoneyMinor(
                          selectedInvoice.taxTotal.amountMinor,
                          selectedInvoice.currency,
                        )
                      : "—"}
                  </dd>
                </div>
                <div className="mt-3 flex justify-between gap-4 border-t border-border-base pt-3 text-sm font-black text-text-main">
                  <dt>{t("invoicing.workspace.totalIncludingTax")}</dt>
                  <dd>
                    {selectedInvoice
                      ? formatMoneyMinor(
                          selectedInvoice.total.amountMinor,
                          selectedInvoice.currency,
                        )
                      : "—"}
                  </dd>
                </div>
              </dl>
              {selectedInvoice &&
                ["FINALIZED", "CREDITED"].includes(
                  selectedInvoice.commercialState,
                ) && (
                  <>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="compact"
                        isLoading={documentLoading}
                        leftIcon={<Eye className="h-icon-sm w-icon-sm" />}
                        onClick={() => void loadSelectedDocument()}
                      >
                        {t("invoicing.workspace.viewDocument")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="compact"
                        disabled={documentLoading}
                        leftIcon={<Download className="h-icon-sm w-icon-sm" />}
                        onClick={() => void downloadSelectedDocument()}
                      >
                        {t("invoicing.workspace.downloadDocument")}
                      </Button>
                    </div>
                    {selectedDocument?.invoiceId === selectedInvoice.id && (
                      <div className="mt-3 min-w-0" aria-live="polite">
                        <p className="text-micro font-bold text-text-secondary">
                          {t("invoicing.workspace.humanDerivative")}
                        </p>
                        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-control border border-border-base bg-bg-subtle p-3 text-micro text-text-secondary">
                          {selectedDocument.content}
                        </pre>
                      </div>
                    )}
                    <Notice
                      variant="warning"
                      className="mt-4"
                      title={t("invoicing.workspace.configurationRequired")}
                    >
                      {t("invoicing.workspace.configurationBody")}
                    </Notice>
                  </>
                )}
            </aside>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-3">
            <article
              id="customers"
              className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs"
            >
              <h2 className="text-sm font-black text-text-main">
                Ajouter un client
              </h2>
              <p className="mt-1 text-xs text-text-secondary">
                Les clients appartiennent à cette organisation Facturation.
              </p>
              <div className="mt-4 space-y-3">
                <label className="block text-micro font-bold text-text-secondary">
                  Raison sociale
                  <input
                    value={newCustomerName}
                    onChange={(event) => setNewCustomerName(event.target.value)}
                    className="mt-1.5 h-control-md w-full rounded-control border border-border-base px-3 text-xs font-normal"
                  />
                </label>
                <label className="block text-micro font-bold text-text-secondary">
                  Email de facturation
                  <input
                    type="email"
                    value={newCustomerEmail}
                    onChange={(event) =>
                      setNewCustomerEmail(event.target.value)
                    }
                    className="mt-1.5 h-control-md w-full rounded-control border border-border-base px-3 text-xs font-normal"
                  />
                </label>
                <Button
                  type="button"
                  size="compact"
                  isLoading={savingCustomer}
                  disabled={!newCustomerName.trim()}
                  onClick={() => void createCustomer()}
                >
                  Ajouter le client
                </Button>
              </div>
            </article>

            <article
              id="team"
              className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs"
            >
              <h2 className="text-sm font-black text-text-main">
                Équipe et permissions
              </h2>
              <p className="mt-1 text-xs text-text-secondary">
                Les membres utilisent l’équipe Shongre partagée, avec des droits
                Facturation dédiés.
              </p>
              <dl className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-text-secondary">Votre rôle</dt>
                  <dd className="font-bold text-text-main">
                    {workspace.tenants[0]?.membershipRole}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-secondary">Sièges inclus</dt>
                  <dd className="font-bold text-text-main">
                    {workspace.tenants[0]?.productAccess.seats}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-secondary">Droits actifs</dt>
                  <dd className="mt-2 flex flex-wrap gap-1">
                    {workspace.tenants[0]?.capabilities.map((capability) => (
                      <Badge key={capability} variant="neutral">
                        {capability}
                      </Badge>
                    ))}
                  </dd>
                </div>
              </dl>
            </article>

            <article
              id="subscription"
              className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs"
            >
              <h2 className="text-sm font-black text-text-main">
                Abonnement Facturation
              </h2>
              <p className="mt-1 text-xs text-text-secondary">
                Indépendant des autres produits, rattaché à la même
                organisation.
              </p>
              <dl className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-text-secondary">Statut</dt>
                  <dd>
                    <Badge variant="success">
                      {workspace.tenants[0]?.productAccess.status}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-secondary">Mode d’accès</dt>
                  <dd className="font-bold text-text-main">
                    {workspace.tenants[0]?.productAccess.accessMode}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-text-secondary">Offre</dt>
                  <dd className="text-right font-bold text-text-main">
                    {workspace.tenants[0]?.productAccess.planName}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-micro leading-relaxed text-text-muted">
                Les prix de production seront affichés uniquement après
                publication d’une configuration commerciale approuvée.
              </p>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
}
