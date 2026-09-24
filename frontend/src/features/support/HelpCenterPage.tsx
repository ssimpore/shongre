import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  HelpCircle,
  ShieldCheck,
  Tag,
  Truck,
  CreditCard,
  User,
  Briefcase,
  ChevronDown,
  ArrowRight,
  Headphones,
} from "lucide-react";
import { Button } from "../../design-system/primitives/Button";
import { useStaticPageSeo } from "../../hooks/useStaticPageSeo";
import { useTranslation } from "../../i18n/I18nProvider";
import type { SupportHelpArticle } from "@shongre/contracts/support";
import { services } from "../../api/client/service-registry";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";

export const HelpCenterPage: React.FC = () => {
  const { t } = useTranslation();
  const { activeMarket, currentLocale } = useMarketLocation();
  useStaticPageSeo("/aide");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [articles, setArticles] = useState<SupportHelpArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(false);
    void services.support
      .listHelpArticles(activeMarket.code, currentLocale)
      .then((items) => {
        if (active) setArticles(items);
      })
      .catch(() => {
        if (active) {
          setArticles([]);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeMarket.code, currentLocale, retry]);

  const categories = [
    {
      id: "all",
      label: t("support.helpCenterPage.categoryAll"),
      icon: <HelpCircle className="w-icon-md h-icon-md" />,
    },
    {
      id: "transactions",
      label: t("support.helpCenterPage.categoryTransactions"),
      icon: <CreditCard className="w-icon-md h-icon-md" />,
    },
    {
      id: "listings",
      label: t("support.helpCenterPage.categoryListings"),
      icon: <Tag className="w-icon-md h-icon-md" />,
    },
    {
      id: "delivery",
      label: t("support.helpCenterPage.categoryDelivery"),
      icon: <Truck className="w-icon-md h-icon-md" />,
    },
    {
      id: "account",
      label: t("support.helpCenterPage.categoryAccount"),
      icon: <User className="w-icon-md h-icon-md" />,
    },
    {
      id: "pro",
      label: t("support.helpCenterPage.categoryPro"),
      icon: <Briefcase className="w-icon-md h-icon-md" />,
    },
    {
      id: "safety",
      label: t("support.helpCenterPage.categorySafety"),
      icon: <ShieldCheck className="w-icon-md h-icon-md" />,
    },
  ];

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchCat =
        selectedCategory === "all" || article.category === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        article.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [articles, selectedCategory, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      {/* 1. Hero Search Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-light text-text-main text-xs font-bold">
          <Headphones className="w-icon-sm h-icon-sm" />
          <span>Centre d'aide Shongre</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-text-main tracking-tight">
          {t("support.helpCenterPage.commentPouvonsNousVousAider")}
        </h1>
        <p className="text-xs sm:text-sm text-text-tertiary">
          {t("support.helpCenterPage.retrouvezLesReponsesAuxQuestions")}
        </p>

        {/* Search Box */}
        <div className="relative max-w-lg mx-auto pt-2">
          <Search className="w-icon-lg h-icon-lg text-text-inverse-subtle absolute left-4 top-1/2 -translate-y-1/2 mt-1" />
          <input
            type="text"
            placeholder={t(
              "support.helpCenterPage.rechercherUneQuestionExSequestre",
            )}
            aria-label={t("support.helpCenterPage.rechercherUneQuestionDansL")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-control-lg pl-12 pr-4 text-xs sm:text-sm font-semibold bg-bg-surface border border-border-base rounded-control shadow-xs focus:border-primary focus:ring-2 focus:ring-focus focus:outline-none transition-all placeholder:text-text-muted"
          />
        </div>
      </div>

      {/* 2. Topic Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 justify-start sm:justify-center no-scrollbar">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              aria-pressed={isActive}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-surface-inverse text-text-inverse shadow-xs"
                  : "bg-bg-surface border border-border-base text-text-emphasis hover:bg-surface-soft hover:text-text-deep"
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. FAQ Accordion Section */}
      <div className="bg-bg-surface rounded-3xl border border-border-base p-6 sm:p-8 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-text-main mb-2">
          {t("support.helpCenterPage.questionsFrequentes")}
        </h2>

        {isLoading ? (
          <div
            className="space-y-3 py-3"
            aria-busy="true"
            aria-label={t("common.loading")}
          >
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-12 animate-pulse rounded-control bg-bg-muted"
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="space-y-3 py-8 text-center" role="alert">
            <p className="text-xs text-text-tertiary">
              {t("support.helpCenterPage.articlesUnavailable")}
            </p>
            <Button
              variant="outline"
              onClick={() => setRetry((value) => value + 1)}
            >
              {t("common.retry")}
            </Button>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary text-xs">
            {t("support.helpCenterPage.aucunArticleNeCorrespondA")}
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filteredArticles.map((art) => {
              const isOpen = openFaqId === art.id;

              return (
                <div key={art.id} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? null : art.id)}
                    aria-expanded={isOpen}
                    aria-controls={`help-faq-${art.id}`}
                    className="w-full flex items-center justify-between gap-4 min-h-control-target text-left font-semibold text-xs sm:text-sm text-text-main hover:text-primary transition-colors cursor-pointer"
                  >
                    <span>{art.question}</span>
                    <ChevronDown
                      className={`w-icon-md h-icon-md text-text-inverse-subtle shrink-0 transition-transform ${
                        isOpen ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>

                  <div
                    id={`help-faq-${art.id}`}
                    role="region"
                    aria-label={art.question}
                    hidden={!isOpen}
                    className="mt-3 space-y-3 text-xs text-text-supporting leading-relaxed pl-1 animate-fadeIn"
                  >
                    <p>{art.answer}</p>
                    {art.linkText && art.linkHref && (
                      <Link
                        to={art.linkHref}
                        className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                      >
                        <span>{art.linkText}</span>
                        <ArrowRight className="w-icon-xs h-icon-xs" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Bottom Contact Support Callout */}
      <div className="bg-surface-inverse text-text-inverse rounded-3xl p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-lg sm:text-xl font-bold">
            {t("support.helpCenterPage.vousNAvezPasTrouve")}
          </h3>
          {/* Dark panel: secondary text needs the lighter stone step to stay readable. */}
          <p className="text-xs sm:text-sm text-text-inverse-subtle max-w-md">
            {t("support.helpCenterPage.notreEquipeDeSupportClient")}
          </p>
        </div>

        <Button
          to="/contact"
          variant="primary"
          className="shrink-0 font-semibold"
        >
          Contacter l'assistance Shongre
        </Button>
      </div>
    </div>
  );
};
