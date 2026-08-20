import React, { useState, useEffect, useId, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, User, Sparkles, TrendingUp, X } from 'lucide-react';
import { crmRepository, UniversalSearchResult } from '../../../../repositories/crm.repository';
import { Badge } from '../../../../design-system/primitives/Badge';
import { useTranslation } from '../../../../i18n/I18nProvider';

interface CrmUniversalSearchProps {
  placeholder?: string;
  className?: string;
}

export const CrmUniversalSearch: React.FC<CrmUniversalSearchProps> = ({
  placeholder = 'Rechercher un contact, entreprise, opportunité ou utilisateur Shongre...',
  className = '',
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UniversalSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsId = useId();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        const hits = await crmRepository.searchUniversal(query);
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
  }, [query]);

  const handleSelect = (item: UniversalSearchResult) => {
    setIsOpen(false);
    setQuery('');
    setHasSearched(false);
    navigate(item.linkTo);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHasSearched(false);
  };

  const getItemIcon = (type: UniversalSearchResult['type']) => {
    switch (type) {
      case 'company':
        return <Building2 className="w-4 h-4 text-primary" />;
      case 'contact':
        return <User className="w-4 h-4 text-info" />;
      case 'opportunity':
        return <TrendingUp className="w-4 h-4 text-warning" />;
      case 'shongre_user':
        return <Sparkles className="w-4 h-4 text-success" />;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full max-w-2xl ${className}`}>
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
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
            if (event.key === 'Escape') setIsOpen(false);
          }}
          placeholder={placeholder}
          aria-label={t('admin.crmUniversalSearch.label')}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? resultsId : undefined}
          aria-busy={isLoading || undefined}
          className="w-full h-10 pl-10 pr-9 text-xs bg-stone-50 border border-stone-200 rounded-xl placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label={t('admin.crmUniversalSearch.clear')}
            className="absolute right-2 top-1/2 inline-flex min-h-6 min-w-6 -translate-y-1/2 items-center justify-center rounded-md text-stone-500 transition-colors duration-fast hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div
          id={resultsId}
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-96 overflow-y-auto overflow-x-hidden rounded-2xl border border-stone-200 bg-white shadow-lg animate-in fade-in"
          aria-live="polite"
        >
          <div className="p-2 bg-stone-50 text-micro font-bold text-stone-500 uppercase tracking-wider">
            {isLoading
              ? t('admin.crmUniversalSearch.loading')
              : t('admin.crmUniversalSearch.results', { count: results.length })}
          </div>

          {!isLoading && hasSearched && results.length === 0 ? (
            <p className="px-4 py-5 text-center text-xs text-stone-500">
              {t('admin.crmUniversalSearch.noResults')}
            </p>
          ) : (
            <ul
              className="divide-y divide-stone-100"
              aria-label={t('admin.crmUniversalSearch.resultsList')}
            >
              {results.map((hit) => (
                <li key={`${hit.type}-${hit.id}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(hit)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors duration-fast hover:bg-stone-50 focus-visible:bg-stone-50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="shrink-0 rounded-xl bg-stone-100 p-2">
                        {getItemIcon(hit.type)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-stone-900">
                          {hit.title}
                        </span>
                        <span className="block truncate text-micro text-stone-500">
                          {hit.subtitle}
                        </span>
                      </span>
                    </span>

                    <Badge variant={hit.badgeVariant || 'neutral'} size="sm">
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
