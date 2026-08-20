import React from 'react';
import { useTranslation } from '../../i18n/I18nProvider';

/**
 * The keyboard bypass required by WCAG 2.4.1.
 *
 * Every shell puts the same header ahead of the page: logo, language, category
 * menu, search field, location, search button, publish, favourites, messages,
 * notifications, account menu, drawer toggle. That is twelve stops a keyboard
 * user crossed on every navigation before reaching a single word of content.
 *
 * It is visually hidden until focused rather than absent, because a bypass the
 * user cannot see once they have reached it is a bypass they cannot trust. The
 * `focus:` styles restore it to the top-left corner, above the sticky header's
 * `z-header`.
 *
 * `targetId` defaults to the `main` landmark every layout already renders — the
 * layouts only had to name it.
 */
export const SkipLink: React.FC<{ targetId?: string }> = ({ targetId = 'main-content' }) => {
  const { t } = useTranslation();

  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-tooltip
                 focus:inline-flex focus:items-center focus:h-control-touch focus:px-5
                 focus:rounded-xl focus:bg-stone-900 focus:text-white focus:text-sm
                 focus:font-bold focus:shadow-xl focus:outline-2 focus:outline-offset-2
                 focus:outline-primary"
    >
      {t('a11y.skipToContent')}
    </a>
  );
};
