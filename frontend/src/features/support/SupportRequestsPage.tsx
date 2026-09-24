import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Headphones,
  PlusCircle,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { Button } from "../../design-system/primitives/Button";
import { StatePanel } from "../../design-system/primitives/StatePanel";
import { Badge } from "../../design-system/primitives/Badge";
import type { SupportCase } from "@shongre/contracts/support";
import { supportService } from "../../domains/support/support.service";
import { services } from "../../api/client/service-registry";
import { formatDate } from "../../utilities/formatters";
import { Skeleton } from "../../design-system";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";

export const SupportRequestsPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.supportRequests.title"),
    description: t("meta.supportRequests.description"),
    canonicalPath: "/compte/support",
    noIndex: true,
  });

  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<SupportCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    let active = true;
    const fetchRequests = async () => {
      if (!currentUser) return;
      setLoading(true);
      setLoadError(false);
      try {
        const result = await services.support.listOwnCases();
        if (!active) return;
        setRequests(
          filterStatus === "all"
            ? result
            : result.filter((item) => item.status === filterStatus),
        );
      } catch {
        // A failed load must not read as "no requests".
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchRequests();
    return () => {
      active = false;
    };
  }, [currentUser, filterStatus, attempt]);

  const tabs = [
    { id: "all", label: "Toutes les demandes" },
    { id: "waiting_customer", label: "Action requise" },
    { id: "waiting_internal", label: "En cours" },
    { id: "resolved", label: "Résolues" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-main">
            Aide & Assistance
          </h1>
          <p className="text-xs sm:text-sm text-text-tertiary mt-1">
            {t("support.supportRequestsPage.suivezLEtatDeVos")}
          </p>
        </div>

        <Button
          to="/contact"
          variant="primary"
          size="sm"
          className="font-semibold flex items-center gap-2"
        >
          <PlusCircle className="w-icon-md h-icon-md" />
          <span>Nouvelle demande</span>
        </Button>
      </div>

      {/* 2. Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-border-subtle">
        {tabs.map((tab) => {
          const isActive = filterStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px cursor-pointer ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-text-tertiary hover:text-text-main"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. Requests List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : loadError ? (
        <StatePanel
          variant="error"
          title={t("common.error")}
          description={t("common.loadErrorDescription")}
          action={
            <Button onClick={() => setAttempt((value) => value + 1)}>
              {t("common.retry")}
            </Button>
          }
        />
      ) : requests.length === 0 ? (
        <div className="bg-bg-surface border border-border-base rounded-3xl p-10 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-surface-muted text-text-inverse-subtle flex items-center justify-center mx-auto">
            <Headphones className="w-icon-xl h-icon-xl" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-text-main">
              Aucune demande en cours
            </h2>
            <p className="text-xs text-text-tertiary max-w-sm mx-auto">
              {t("support.supportRequestsPage.siVousRencontrezUneDifficulte")}
            </p>
          </div>
          <Button
            to="/contact"
            variant="outline"
            size="sm"
            className="font-semibold"
          >
            {t("support.supportRequestsPage.contacterLeSupport")}
          </Button>
        </div>
      ) : (
        <section
          aria-labelledby="support-requests-heading"
          className="space-y-3"
        >
          <h2 id="support-requests-heading" className="sr-only">
            Mes demandes d'assistance
          </h2>
          {requests.map((req) => {
            const statusInfo = supportService.getStatusInfo(req.status);

            return (
              // A whole-card navigation target belongs in a <Link>: as a
              // clickable <div> it could not be tabbed to, opened in a new tab,
              // or announced as a link at all.
              <Link
                key={req.id}
                to={`/compte/support/${req.id}`}
                className="bg-bg-surface border border-border-base rounded-2xl p-4 sm:p-5 shadow-xs hover:border-border-strong transition-all duration-fast cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-micro font-bold font-mono text-text-tertiary bg-surface-muted px-2 py-0.5 rounded-md">
                      {req.reference}
                    </span>
                    <Badge variant={statusInfo.variant} size="sm">
                      {statusInfo.label}
                    </Badge>
                    <span className="text-micro text-text-tertiary">
                      Mis à jour le {formatDate(req.updatedAt)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-text-main group-hover:text-primary transition-colors truncate">
                    {req.subject}
                  </h3>

                  <p className="text-xs text-text-supporting line-clamp-1">
                    {req.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="flex items-center gap-1.5 text-xs text-text-tertiary font-bold">
                    <MessageSquare className="w-icon-md h-icon-md" />
                    <span aria-label="Dossier avec historique">1+</span>
                  </div>
                  <ChevronRight className="w-icon-lg h-icon-lg text-text-inverse-subtle group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
};
