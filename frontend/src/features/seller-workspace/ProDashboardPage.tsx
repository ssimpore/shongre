import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Eye,
  MessageSquare,
  DollarSign,
  ArrowUpRight,
  BarChart2,
  FileText,
} from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { formatMoney, formatPrice } from "../../utilities/formatters";
import { Badge } from "../../design-system/primitives/Badge";
import { Button } from "../../design-system/primitives/Button";
import { Link } from "react-router-dom";
import { BillingHistoryModal } from "./components/BillingHistoryModal";
import { Image } from "../../design-system/primitives/Image";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { services } from "../../api/client/service-registry";
import type { ProAnalyticsSnapshot } from "../../api/contracts/workspace.contract";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { ProgressBar } from "../../design-system/primitives/ProgressBar";

function getPhotoUrl(photo: any): string {
  if (typeof photo === "string") return photo;
  if (photo && typeof photo.url === "string") return photo.url;
  return "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400&auto=format&fit=crop&q=80";
}

export const ProDashboardPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const { currentLocale } = useMarketLocation();
  usePageMeta({
    title: t("meta.proDashboard.title"),
    description: t("meta.proDashboard.description"),
    canonicalPath: "/compte/pro/tableau-de-bord",
    noIndex: true,
  });

  const { currentUser } = useAuth();
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState<ProAnalyticsSnapshot | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    services.workspace
      .getProAnalytics(currentUser.id)
      .then((snapshot) => {
        setAnalytics(snapshot);
      })
      .catch(() => {
        setAnalytics(null);
      });
  }, [currentUser?.id]);

  const hasCatalogue = Boolean(analytics?.topListings.length);
  const weeklyStats = analytics?.weeklyStats || [];
  const maximumWeeklyViews = Math.max(
    ...weeklyStats.map((item) => item.views),
    1,
  );
  const formatDay = (date: string) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" })
      .format(new Date(`${date}T12:00:00Z`))
      .replace(".", "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-stone-900">
              {t("sellerworkspace.proDashboardPage.tableauDeBordVendeurPro")}
            </h1>
            <Badge variant="pro" size="sm">
              {t("sellerworkspace.proDashboardPage.siretVerifie")}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
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

          <Link
            to={`/boutique/${currentUser?.storeSlug || "atelier-nordique-sas"}`}
            className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 shadow-xs"
          >
            <span>Voir ma vitrine en ligne</span>
            <ArrowUpRight className="w-icon-md h-icon-md" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-4 rounded-xl border border-border-base shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>Vues totales catalogue</span>
            <Eye className="w-icon-md h-icon-md text-primary" />
          </div>
          <div className="text-2xl font-black text-stone-900">
            {(analytics?.monthlyViews || 0).toLocaleString(locale)}
          </div>
          {hasCatalogue ? (
            <div className="text-xs text-success font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="w-icon-xs h-icon-xs" aria-hidden="true" />+
              {analytics?.weeklyViewsChangePercent.toLocaleString(locale)}%
              cette semaine
            </div>
          ) : (
            <div className="text-xs text-stone-500 mt-1">
              {t("sellerworkspace.proDashboardPage.pasEncoreDeDonnees")}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-border-base shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>Demandes & Contacts</span>
            <MessageSquare className="w-icon-md h-icon-md text-info" />
          </div>
          <div className="text-2xl font-black text-stone-900">
            {analytics?.contactsCount.toLocaleString(locale) || "0"}
          </div>
          {hasCatalogue ? (
            <div className="text-xs text-success font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="w-icon-xs h-icon-xs" aria-hidden="true" />+
              {analytics?.weeklyContactsChangePercent.toLocaleString(locale)}%
            </div>
          ) : (
            <div className="text-xs text-stone-500 mt-1">
              {t("sellerworkspace.proDashboardPage.pasEncoreDeDonnees")}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-border-base shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>
              {t("sellerworkspace.proDashboardPage.tauxDeConversion")}
            </span>
            <BarChart2 className="w-icon-md h-icon-md text-amber-500" />
          </div>
          <div className="text-2xl font-black text-stone-900">
            {hasCatalogue ? `${analytics?.conversionRate}%` : "—"}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            {hasCatalogue
              ? t("sellerworkspace.proDashboardPage.surLesFichesArticles")
              : t("sellerworkspace.proDashboardPage.pasEncoreDeDonnees")}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border-base shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>
              {t("sellerworkspace.proDashboardPage.volumeDeVentesEstime")}
            </span>
            <DollarSign className="w-icon-md h-icon-md text-success" />
          </div>
          <div className="text-2xl font-black text-stone-900">
            {analytics
              ? formatMoney(analytics.monthlyRevenue, {
                  locale: currentLocale,
                })
              : "—"}
          </div>
          <div className="text-xs text-stone-500 mt-1">
            {hasCatalogue
              ? t("sellerworkspace.proDashboardPage.ceMoisCi")
              : t("sellerworkspace.proDashboardPage.pasEncoreDeDonnees")}
          </div>
        </div>
      </div>

      {/* Analytics Chart Bar Visualizer */}
      <div className="bg-white rounded-2xl border border-border-base p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm sm:text-base font-bold text-stone-900">
            {t("sellerworkspace.proDashboardPage.evolutionDeLAudience7")}
          </h2>
          {/* Summed from the series rendered below rather than written out
              again, so the caption cannot drift from the bars it describes. */}
          <span className="text-xs text-stone-500">
            {t("sellerworkspace.proDashboardPage.totalVuesUniques", {
              count: weeklyStats.reduce((sum, d) => sum + d.views, 0),
            })}
          </span>
        </div>

        <div className="space-y-2 border-b border-border-subtle pb-3 pt-4">
          {weeklyStats.map((item) => {
            return (
              <div key={item.date} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs font-bold text-stone-500 capitalize">
                  {formatDay(item.date)}
                </span>
                <ProgressBar
                  value={item.views}
                  max={maximumWeeklyViews}
                  label={`${item.views} vues ${formatDay(item.date)}`}
                  className="flex-1"
                />
                <span className="w-16 shrink-0 text-right text-micro font-bold text-stone-600">
                  {item.views}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top performing articles */}
      <div className="bg-white rounded-2xl border border-border-base p-6 shadow-xs space-y-4">
        <h2 className="text-sm sm:text-base font-bold text-stone-900">
          {t("sellerworkspace.proDashboardPage.articlesPharesDeVotreBoutique")}
        </h2>

        <div className="divide-y divide-border-subtle">
          {(analytics?.topListings || []).map(({ listing, conversionRate }) => (
            <div
              key={listing.id}
              className="py-3 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Image
                  src={getPhotoUrl(
                    listing.coverImageUrl || listing.photos?.[0],
                  )}
                  alt=""
                  sizes="48px"
                  className="w-12 h-12 rounded-lg object-cover border border-border-base shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className="font-bold text-xs sm:text-sm text-stone-900 truncate">
                    {listing.title}
                  </div>
                  <div className="text-xs text-stone-500">
                    {formatPrice(listing.price)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs text-stone-600 shrink-0">
                <div className="text-right">
                  <div className="font-bold text-stone-900">
                    {listing.viewsCount ?? listing.viewCount ?? 0}
                  </div>
                  <div className="text-micro text-stone-500">Vues</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-success">
                    {conversionRate}%
                  </div>
                  <div className="text-micro text-stone-500">Conversion</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BillingHistoryModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        userType="professional"
      />
    </div>
  );
};
