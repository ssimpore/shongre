import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, User, Sparkles, TrendingUp, X } from 'lucide-react';
import { crmRepository, UniversalSearchResult } from '../../../../repositories/crm.repository';
import { Badge } from '../../../../design-system/primitives/Badge';

interface CrmUniversalSearchProps {
  placeholder?: string;
  className?: string;
}

export const CrmUniversalSearch: React.FC<CrmUniversalSearchProps> = ({
  placeholder = 'Rechercher un contact, entreprise, opportunité ou utilisateur Shongre...',
  className = '',
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UniversalSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const hits = await crmRepository.searchUniversal(query);
        setResults(hits);
        setIsOpen(hits.length > 0);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: UniversalSearchResult) => {
    setIsOpen(false);
    setQuery('');
    navigate(item.linkTo);
  };

  const getItemIcon = (type: UniversalSearchResult['type']) => {
    switch (type) {
      case 'company':
        return <Building2 className="w-4 h-4 text-primary" />;
      case 'contact':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'opportunity':
        return <TrendingUp className="w-4 h-4 text-amber-600" />;
      case 'shongre_user':
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full max-w-2xl ${className}`}>
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full h-10 pl-10 pr-9 text-xs bg-stone-50 border border-stone-200 rounded-xl placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-stone-200 rounded-2xl shadow-lg overflow-hidden z-50 divide-y divide-stone-100 max-h-96 overflow-y-auto animate-fadeIn">
          <div className="p-2 bg-stone-50 text-micro font-bold text-stone-500 uppercase tracking-wider">
            Résultats CRM ({results.length})
          </div>

          {results.map((hit) => (
            <div
              key={`${hit.type}-${hit.id}`}
              onClick={() => handleSelect(hit)}
              className="p-3 hover:bg-stone-50 transition-colors flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-stone-100 shrink-0">
                  {getItemIcon(hit.type)}
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-stone-900 block truncate">
                    {hit.title}
                  </span>
                  <span className="text-micro text-stone-500 block truncate">
                    {hit.subtitle}
                  </span>
                </div>
              </div>

              <Badge variant={hit.badgeVariant || 'neutral'} size="sm">
                {hit.badgeText}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
