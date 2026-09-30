import React, { useState, useEffect } from "react";
import { VerificationBadge } from "@shongre/ui/web";
import {
  Eye,
  DollarSign,
  ArrowUpRight,
  FileText,
  CircleAlert,
} from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { Badge } from "../../design-system/primitives/Badge";
import { Button } from "../../design-system/primitives/Button";
import { Link } from "react-router-dom";
import { BillingHistoryModal } from "./components/BillingHistoryModal";
import { Image } from "../../design-system/primitives/Image";
import { useTranslation } from "../../i18n/I18nProvider";
import { routes } from "../../configuration/routes";
import { usePageMeta } from "../../hooks/usePageMeta";
import { services } from "../../api/client/service-registry";
import type { ProAnalyticsSnapshot } from "../../api/contracts/workspace.contract";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { StatePanel } from "../../design-system/primitives/StatePanel";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";
import { resolveListingPhotoUrl } from "../../domains/listing/listing-media";
import { formatListingPricePresentation } from "../../domains/listing/listing-price.presentation";

type AnalyticsLoadState = "loading" | "success" | "error";

export const ProDashboardPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const { formatPrice, convertMoney } = useMarketLocation();
  const { formatMoney } = useRegionalFormatters();
  usePageMeta({
    title: t("meta.proDashboard.title"),
    description: t("meta.proDashboard.description"),
    canonicalPath: "/compte/pro/tableau-de-bord",
    noIndex: true,
  });

  const { currentUser } = useAuth();
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState<ProAnalyticsSnapshot | null>(null);
  const [unreadContactCount, setUnreadContactCount] = useState<number | null>(
    null,
  );
  const [loadState, setLoadState] = useState<AnalyticsLoadState>("loading");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!currentUser?.id) {
      setLoadState("error");
      return;
    }
    let cancelled = false;
    setLoadState("loading");
    setAnalytics(null);
    setUnreadContactCount(null);
    services.workspace
      .getProAnalytics(currentUser.id)
      .then((snapshot) => {
        if (cancelled) return;
        setAnalytics(snapshot);
        setLoadState("success");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    void services.messaging
      .getUserConversations()
      .then((conversations) => {
        if (!cancelled)
          setUnreadContactCount(
            conversations.reduce(
              (total, conversation) => total + conversation.unreadCount,
              0,
            ),
          );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, reloadToken]);

  const hasCatalogue = Boolean(analytics?.topListings.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-text-main">
              {t("sellerworkspace.proDashboardPage.tableauDeBordVendeurPro")}
            </h1>
            {currentUser?.professionalVerification?.status === "verified" && (
              <VerificationBadge
                label={t("ui.identityStatus.verification.professional")}
              />
            )}
          </div>
          <p className="text-xs sm:text-sm text-text-tertiary mt-0.5">
            {t("sellerworkspace.proDashboardPage.suiviDesPerformancesDeVotre")}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsBillingModalOpen(true)}
            leftIcon={<FileText className="w-icon-md h-icon-md" />}
          >
            {t("sellerworkspace.proDashboardPage.facturesRecus")}
          </Button>

          {currentUser ? (
            <Button
              variant="pro"
              size="compact"
              rightIcon={<ArrowUpRight className="w-icon-md h-icon-md" />}
              to={routes.seller.publicPage({
                id: currentUser.id,
                slug: currentUser.slug,
                storeSlug: currentUser.storeSlug,
                isProfessional: true,
              })}
            >
              Voir ma vitrine en ligne
            </Button>
          ) : null}
        </div>
      </div>

      {loadState === "loading" && (
        <div
          role="status"
          aria-label="Chargement des performances"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="skeleton-shimmer h-28 rounded-control border border-border-base bg-bg-muted"
            />
          ))}
        </div>
      )}

      {loadState === "error" && (
        <StatePanel
          variant="error"
          title="Performances indisponibles"
          description="Les données de votre activité n’ont pas pu être chargées. Aucun indicateur à zéro n’est affiché tant que leur état réel n’est pas connu."
          action={
            <Button onClick={() => setReloadToken((value) => value + 1)}>
              Réessayer
            </Button>
          }
        />
      )}

      {loadState === "success" && analytics && (
        <>
          <section
            aria-labelledby="pro-action-queue"
            className="rounded-2xl border border-primary-border bg-primary-light p-5 shadow-xs"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2
                  id="pro-action-queue"
                  className="flex items-center gap-2 text-base font-bold text-text-main"
                >
                  <CircleAlert className="h-icon-md w-icon-md text-primary" />
                  {t("sellerworkspace.proDashboardPage.actionQueueTitle")}
                </h2>
                <p className="mt-1 text-xs text-text-supporting">
                  {t("sellerworkspace.proDashboardPage.actionQueueDescription")}
                </p>
              </div>
              {unreadContactCount !== null && (
                <Badge variant="neutral" size="sm">
                  {unreadContactCount}
                </Badge>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {unreadContactCount !== null && unreadContactCount > 0 && (
                <Link
                  to={routes.workspace.messages()}
                  className="surface-interactive rounded-control border border-border-base bg-bg-surface p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-text-main">
                      {t("sellerworkspace.proDashboardPage.answerContacts")}
                    </span>
                    <ArrowUpRight className="h-icon-sm w-icon-sm text-primary" />
                  </div>
                  <p className="mt-1 text-xs text-text-tertiary">
                    {unreadContactCount.toLocaleString(locale)}{" "}
                    {t("sellerworkspace.proDashboardPage.contactsAwaiting")}
                  </p>
                </Link>
              )}
              <Link
                to={routes.workspace.listings()}
                className="surface-interactive rounded-control border border-border-base bg-bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-text-main">
                    {t("sellerworkspace.proDashboardPage.manageListings")}
                  </span>
                  <ArrowUpRight className="h-icon-sm w-icon-sm text-primary" />
                </div>
                <p className="mt-1 text-xs text-text-tertiary">
                  {t(
                    "sellerworkspace.proDashboardPage.manageListingsDescription",
                  )}
                </p>
              </Link>
              {unreadContactCount === 0 && (
                <p className="rounded-control border border-success-border bg-bg-surface p-4 text-sm font-semibold text-success sm:col-span-2">
                  {t("sellerworkspace.proDashboardPage.actionQueueEmpty")}
                </p>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
              <div className="flex items-center justify-between text-text-tertiary text-xs font-semibold mb-1">
                <span>
                  {t("sellerworkspace.proDashboardPage.catalogueSampleViews")}
                </span>
                <Eye className="w-icon-md h-icon-md text-primary" />
              </div>
              <div className="text-2xl font-bold text-text-main">
                {analytics?.catalogueSampleViews.toLocaleString(locale)}
              </div>
              <p className="text-xs text-text-tertiary mt-1">
                {t(
                  "sellerworkspace.proDashboardPage.catalogueSampleDescription",
                )}
              </p>
            </div>
            {analytics?.revenueByCurrency.map((revenue) => (
              <div
                key={revenue.currency}
                className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs"
              >
                <div className="flex items-center justify-between text-text-tertiary text-xs font-semibold mb-1">
                  <span>
                    {t(
                      "sellerworkspace.proDashboardPage.completedSalesThisMonth",
                    )}
                  </span>
                  <DollarSign className="w-icon-md h-icon-md text-success" />
                </div>
                <div className="text-2xl font-bold text-text-main">
                  {formatMoney(revenue)}
                </div>
                <p className="mt-1 text-xs text-text-tertiary">
                  {t("sellerworkspace.proDashboardPage.completedSalesScope")}
                </p>
              </div>
            ))}
          </div>

          {/* Top performing articles */}
          {hasCatalogue && (
            <div className="space-y-4 rounded-card border border-border-base bg-bg-surface p-6 shadow-sm">
              <h2 className="text-sm sm:text-base font-bold text-text-main">
                {t(
                  "sellerworkspace.proDashboardPage.articlesPharesDeVotreBoutique",
                )}
              </h2>

              <div className="divide-y divide-border-subtle">
                {(analytics?.topListings || []).map((listing) => (
                  <div
                    key={listing.id}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Image
                        src={resolveListingPhotoUrl(
                          listing.coverImageUrl || listing.photos?.[0],
                        )}
                        alt=""
                        sizes="48px"
                        className="w-12 h-12 rounded-lg object-cover border border-border-base shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-text-main truncate">
                          {listing.title}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {formatListingPricePresentation(
                            listing.pricePresentation,
                            locale,
                            convertMoney,
                          ) ??
                            formatPrice(listing.price, {
                              sourceCurrency: listing.currency,
                              isFreeDonation: listing.isFreeDonation,
                            })}
                        </div>
                      </div>
                    </div>

                    {(listing.viewsCount ?? listing.viewCount) !==
                      undefined && (
                      <div className="flex items-center gap-6 text-xs text-text-supporting shrink-0">
                        <div className="text-right">
                          <div className="font-bold text-text-main">
                            {listing.viewsCount ?? listing.viewCount}
                          </div>
                          <div className="text-micro text-text-tertiary">
                            Vues
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <BillingHistoryModal
            isOpen={isBillingModalOpen}
            onClose={() => setIsBillingModalOpen(false)}
            userType="professional"
          />
        </>
      )}
    </div>
  );
};
