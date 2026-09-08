import {
  CheckCircle2,
  FileCheck2,
  MoreHorizontal,
  ReceiptText,
} from "lucide-react";
import { Link } from "react-router-dom";
import { BrandLogo } from "../../../design-system";

interface InvoicingLandingPreviewProps {
  workspaceDestination: string;
  variant?: "workspace" | "document";
  labels: {
    ariaLabel: string;
    title: string;
    organization: string;
    invoiceNumber: string;
    customer: string;
    amount: string;
    status: string;
    configuration: string;
    totalLabel: string;
    taxLabel: string;
    marketLabel: string;
    marketValue: string;
    documentLabel: string;
    documentNotice: string;
  };
}

export function InvoicingLandingPreview({
  workspaceDestination,
  variant = "workspace",
  labels,
}: InvoicingLandingPreviewProps) {
  if (variant === "document") {
    return (
      <Link
        to={workspaceDestination}
        aria-label={labels.ariaLabel}
        className="group block rounded-card border border-border-base bg-bg-surface p-3 shadow-lg transition-transform duration-normal hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-5"
      >
        <div className="rounded-card border border-border-base bg-bg-base p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-border-base pb-5">
            <div>
              <BrandLogo size="compact" />
              <p className="mt-1 text-micro font-bold uppercase tracking-wider text-text-muted">
                {labels.documentLabel}
              </p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary">
              <FileCheck2 className="h-icon-md w-icon-md" aria-hidden="true" />
            </span>
          </div>

          <div className="grid gap-5 py-5 sm:grid-cols-2">
            <div>
              <p className="text-micro font-bold uppercase tracking-wide text-text-muted">
                {labels.customer}
              </p>
              <span
                aria-hidden="true"
                className="mt-2 block h-3 w-28 rounded-full bg-border-base"
              />
            </div>
            <div className="sm:text-right">
              <p className="text-micro font-bold uppercase tracking-wide text-text-muted">
                {labels.invoiceNumber}
              </p>
              <span
                aria-hidden="true"
                className="mt-2 block h-3 w-32 rounded-full bg-border-base sm:ml-auto"
              />
            </div>
          </div>

          <div className="space-y-3 border-y border-border-base py-5 text-xs">
            <div className="flex items-center justify-between gap-4 text-text-secondary">
              <span>{labels.totalLabel}</span>
              <span className="h-2.5 w-16 rounded-full bg-border-base" />
            </div>
            <div className="flex items-center justify-between gap-4 text-text-secondary">
              <span>{labels.taxLabel}</span>
              <span className="h-2.5 w-12 rounded-full bg-border-base" />
            </div>
            <div className="flex items-center justify-between gap-4 text-base font-bold text-text-main">
              <span>Total</span>
              <span className="h-3 w-20 rounded-full bg-border-base" />
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-control border border-border-base bg-bg-subtle p-3">
            <CheckCircle2
              className="mt-0.5 h-icon-sm w-icon-sm shrink-0 text-success"
              aria-hidden="true"
            />
            <p className="text-micro leading-relaxed text-text-secondary">
              {labels.documentNotice}
            </p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={workspaceDestination}
      aria-label={labels.ariaLabel}
      className="group block overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-lg transition-transform duration-normal hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="flex min-h-control-lg items-center justify-between gap-3 border-b border-border-base bg-bg-subtle px-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-control bg-primary text-xs font-bold text-text-inverse">
            S
          </span>
          <span className="text-xs font-bold text-text-main">
            {labels.title}
          </span>
        </div>
        <MoreHorizontal
          className="h-icon-sm w-icon-sm text-text-muted"
          aria-hidden="true"
        />
      </div>

      <div className="grid min-h-80 grid-cols-6">
        <aside className="col-span-1 border-r border-border-base bg-bg-base p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-primary-light text-primary">
            <ReceiptText className="h-icon-sm w-icon-sm" aria-hidden="true" />
          </span>
          <div className="mt-4 space-y-2" aria-hidden="true">
            <span className="block h-2 w-10 rounded-full bg-primary" />
            <span className="block h-2 w-7 rounded-full bg-border-base" />
            <span className="block h-2 w-9 rounded-full bg-border-base" />
          </div>
        </aside>

        <div className="col-span-5 min-w-0 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-micro font-bold uppercase tracking-wider text-text-muted">
                {labels.organization}
              </p>
              <span
                aria-hidden="true"
                className="mt-2 block h-4 w-32 rounded-full bg-border-base"
              />
            </div>
            <span className="rounded-control border border-border-base bg-bg-surface px-2 py-1 text-micro font-bold text-text-secondary">
              {labels.marketValue}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-control border border-border-base p-3">
              <p className="text-micro text-text-muted">{labels.amount}</p>
              <span
                aria-hidden="true"
                className="mt-2 block h-3 w-16 rounded-full bg-border-base"
              />
            </div>
            <div className="rounded-control border border-border-base p-3">
              <p className="text-micro text-text-muted">{labels.marketLabel}</p>
              <span
                aria-hidden="true"
                className="mt-2 block h-3 w-8 rounded-full bg-border-base"
              />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-control border border-border-base">
            <div className="grid grid-cols-3 gap-2 bg-bg-subtle px-3 py-2 text-micro font-bold uppercase tracking-wide text-text-secondary">
              <span>{labels.invoiceNumber}</span>
              <span>{labels.customer}</span>
              <span className="text-right">{labels.amount}</span>
            </div>
            <div className="grid grid-cols-3 items-center gap-2 px-3 py-3 text-micro text-text-secondary">
              <span className="h-2.5 rounded-full bg-border-base" />
              <span className="h-2.5 rounded-full bg-bg-muted" />
              <span className="ml-auto h-2.5 w-12 rounded-full bg-border-base" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-control bg-primary-light px-2 py-1 text-micro font-bold text-primary">
              {labels.status}
            </span>
            <span className="rounded-control bg-bg-muted px-2 py-1 text-micro font-bold text-text-secondary">
              {labels.configuration}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
