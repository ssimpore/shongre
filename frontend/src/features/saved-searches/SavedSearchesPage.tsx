import { routes } from '../../configuration/routes';
import React, { useState } from 'react';
import { Search, Bell, Trash2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SavedSearch } from '../../types';
import { storageService } from '../../services/storage.service';
import { Button } from '../../design-system/primitives/Button';
import { EmptyState } from '../../design-system/primitives/UIComponents';
import { formatRelativeDate, plural } from '../../utilities/formatters';
import { useToast } from '../../app/providers/ToastProvider';
import { useTranslation } from '../../i18n/I18nProvider';
import { usePageMeta } from '../../hooks/usePageMeta';

export const SavedSearchesPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t('meta.savedSearches.title'),
    description: t('meta.savedSearches.description'),
    canonicalPath: '/compte/recherches',
    noIndex: true,
  });

  const navigate = useNavigate();
  const toast = useToast();
  const [searches, setSearches] = useState<SavedSearch[]>(() => storageService.getSavedSearches());

  const handleDelete = (id: string) => {
    storageService.removeSavedSearch(id);
    setSearches(storageService.getSavedSearches());
    toast.info('Recherche sauvegardée supprimée.');
  };

  const handleToggleNotif = (id: string) => {
    const next = searches.map((s) => (s.id === id ? { ...s, hasNotifications: !s.hasNotifications } : s));
    setSearches(next);
    localStorage.setItem('shongre_saved_searches', JSON.stringify(next));
    toast.success('Préférences d\'alerte mises à jour.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900">
          Mes recherches sauvegardées ({searches.length})
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">{t('savedsearches.savedSearchesPage.recevezDesAlertesInstantaneesDes')}</p>
      </div>

      {searches.length > 0 ? (
        <div className="space-y-3">
          {searches.map((search) => (
            <div
              key={search.id}
              className="bg-white p-4 rounded-xl border border-border-base flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-xs"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0">
                  <Search className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-sm text-stone-900 truncate">{search.title}</h2>
                  <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                    <span>Créée {formatRelativeDate(search.createdAt)}</span>
                    {search.matchCount !== undefined && (
                      <span>• {plural(search.matchCount, 'annonce trouvée', 'annonces trouvées')}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleNotif(search.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    search.hasNotifications
                      ? 'bg-success-surface text-success border-success-border'
                      : 'bg-stone-50 text-stone-600 border-stone-200'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{search.hasNotifications ? 'Alertes activées' : 'Alertes muettes'}</span>
                </button>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    const q = search.filters.query ? `query=${encodeURIComponent(search.filters.query)}` : '';
                    navigate(`/recherche?${q}`);
                  }}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >{t('savedsearches.savedSearchesPage.voirLesAnnonces')}</Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(search.id)}
                  aria-label={`Supprimer la recherche « ${search.title} »`}
                  className="text-stone-500 hover:text-danger"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Search className="w-10 h-10 text-stone-400" />}
          title={t('savedsearches.savedSearchesPage.aucuneRechercheSauvegardee')}
          description={t('savedsearches.savedSearchesPage.lancezUneRecherchePuisCliquez')}
          action={
            <Button
              to={routes.search()}
              variant="primary"
            >{t('savedsearches.savedSearchesPage.lancerUneRecherche')}</Button>
          }
        />
      )}
    </div>
  );
};
