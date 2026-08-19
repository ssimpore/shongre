import { routes } from '../../configuration/routes';
import React from 'react';

import { AlertCircle, Home, Search } from 'lucide-react';
import { Button } from '../../design-system/primitives/Button';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTranslation } from '../../i18n/I18nProvider';

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Page introuvable",
    description:
      "Cette page n'existe pas ou plus. Retrouvez toutes les annonces Shongre depuis l'accueil ou la recherche.",
    noIndex: true,
  });

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-primary-light text-primary flex items-center justify-center mx-auto shadow-xs">
        <AlertCircle className="w-8 h-8" />
      </div>
      <div>
        <h1 className="text-3xl font-black text-stone-900">Page introuvable</h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-2 leading-relaxed">{t('errors.notFoundPage.laPageQueVousRecherchez')}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          to={routes.home()}
          variant="primary"
          leftIcon={<Home className="w-4 h-4" />}
        >{t('errors.notFoundPage.retourALAccueil')}</Button>
        <Button
          to={routes.search()}
          variant="outline"
          leftIcon={<Search className="w-4 h-4" />}
        >{t('errors.notFoundPage.rechercherUneAnnonce')}</Button>
      </div>
    </div>
  );
};
