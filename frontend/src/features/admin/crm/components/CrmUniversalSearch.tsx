import React, { useState, useEffect, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, User, TrendingUp, X } from "lucide-react";
import { services } from "../../../../api/client/service-registry";
import { Badge } from "../../../../design-system/primitives/Badge";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useCrmSurface } from "../../../crm/CrmSurfaceContext";

interface CrmUniversalSearchProps {
  placeholder?: string;
  className?: string;
}

interface UniversalSearchResult {
  type: "contact" | "company" | "opportunity";
  id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  badgeVariant: "primary" | "deal" | "warning" | "success";
  linkTo: string;
}

export const CrmUniversalSearch: React.FC<CrmUniversalSearchProps> = ({
  placeholder = "Rechercher un contact, entreprise, opportunité ou utilisateur Shongre...",
  className = "",
}) => {
  const { t } = useTranslation();
  const crmPaths = useCrmSurface();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UniversalSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsId = useId();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      setHasSearched(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setHasSearched(false);
      try {
        const [accountPage, contactPage, opportunityPage] = await Promise.all([
          services.crm.listAccounts({ query, limit: 4 }),
          services.crm.listContacts({ query, limit: 4 }),
          services.crm.listOpportunities({ query, limit: 4 }),
        ]);
        const hits: UniversalSearchResult[] = [
          ...accountPage.items.map((account) => ({
            type: "company" as const,
            id: account.id,
            title: account.name,
            subtitle: `${account.industry ?? "Entreprise"} • ${account.city ?? account.marketCode}`,
            badgeText: account.lifecycle,
            badgeVariant:
              account.lifecycle === "customer"
                ? ("success" as const)
                : ("primary" as const),
            linkTo: crmPaths.company(account.id),
          })),
          ...contactPage.items.map((contact) => ({
            type: "contact" as const,
            id: contact.id,
            title: contact.fullName,
            subtitle: `${contact.email ?? "Sans email"} • ${contact.jobTitle ?? "Contact"}`,
            badgeText: contact.lifecycle,
            badgeVariant:
              contact.lifecycle === "customer"
                ? ("success" as const)
                : ("deal" as const),
            linkTo: crmPaths.contact(contact.id),
          })),
          ...opportunityPage.items.map((opportunity) => ({
            type: "opportunity" as const,
            id: opportunity.id,
            title: opportunity.name,
            subtitle: `${opportunity.accountName ?? "Sans compte"} • ${opportunity.stageName}`,
            badgeText: opportunity.status,
            badgeVariant:
              opportunity.status === "won"
                ? ("success" as const)
                : ("warning" as const),
            linkTo: crmPaths.opportunity(opportunity.id),
          })),
        ];
        if (cancelled) return;
        setResults(hits);
        setIsOpen(true);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setHasSearched(true);
        }
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [crmPaths, query]);

  const handleSelect = (item: UniversalSearchResult) => {
    setIsOpen(false);
    setQuery("");
    setHasSearched(false);
    navigate(item.linkTo);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setHasSearched(false);
  };

  const getItemIcon = (type: UniversalSearchResult["type"]) => {
    switch (type) {
      case "company":
        return <Building2 className="w-icon-md h-icon-md text-primary" />;
      case "contact":
        return <User className="w-icon-md h-icon-md text-info" />;
      case "opportunity":
        return <TrendingUp className="w-icon-md h-icon-md text-warning" />;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-2xl ${className}`}
    >
      <div className="relative">
        <Search className="w-icon-md h-icon-md text-text-disabled absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(Boolean(e.target.value.trim()));
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
          placeholder={placeholder}
          aria-label={t("admin.crmUniversalSearch.label")}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? resultsId : undefined}
          aria-busy={isLoading || undefined}
          className="w-full h-control-md pl-10 pr-9 text-xs bg-stone-50 border border-stone-200 rounded-control placeholder:text-text-muted focus:bg-bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label={t("admin.crmUniversalSearch.clear")}
            className="absolute right-2 top-1/2 inline-flex min-h-6 min-w-6 -translate-y-1/2 items-center justify-center rounded-md text-stone-500 transition-colors duration-fast hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="w-icon-sm h-icon-sm" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div
          id={resultsId}
          className="absolute left-0 right-0 top-full z-popover mt-1.5 max-h-96 overflow-y-auto overflow-x-hidden rounded-2xl border border-stone-200 bg-bg-surface shadow-dropdown animate-in fade-in"
          aria-live="polite"
        >
          <div className="p-2 bg-stone-50 text-micro font-bold text-stone-500 uppercase tracking-wider">
            {isLoading
              ? t("admin.crmUniversalSearch.loading")
              : t("admin.crmUniversalSearch.results", {
                  count: results.length,
                })}
          </div>

          {!isLoading && hasSearched && results.length === 0 ? (
            <p className="px-4 py-5 text-center text-xs text-stone-500">
              {t("admin.crmUniversalSearch.noResults")}
            </p>
          ) : (
            <ul
              className="divide-y divide-stone-100"
              aria-label={t("admin.crmUniversalSearch.resultsList")}
            >
              {results.map((hit) => (
                <li key={`${hit.type}-${hit.id}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(hit)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors duration-fast hover:bg-stone-50 focus-visible:bg-stone-50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="shrink-0 rounded-control bg-stone-100 p-2">
                        {getItemIcon(hit.type)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-text-main">
                          {hit.title}
                        </span>
                        <span className="block truncate text-micro text-stone-500">
                          {hit.subtitle}
                        </span>
                      </span>
                    </span>

                    <Badge variant={hit.badgeVariant || "neutral"} size="sm">
                      {hit.badgeText}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
