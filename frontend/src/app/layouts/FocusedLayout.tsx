import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { routes } from '../../configuration/routes';
import { AppScrollRestoration } from '../router/AppScrollRestoration';
import { DemoRoleSwitcher } from './DemoRoleSwitcher';
import { useTranslation } from '../../i18n/I18nProvider';

/**
 * Shell for task-completion flows: publication, checkout, verification.
 *
 * These screens ask the user to finish one thing, and the marketplace shell
 * works against that — the publication wizard used to end with the full
 * six-column footer (categories, cities, Pro offers, legal links, newsletter)
 * sitting directly under "Publier mon annonce", and the mobile tab bar offered
 * four ways to abandon the form. What is left here is a way back, the brand,
 * and the task.
 */
export const FocusedLayout: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-stone-900">
      <AppScrollRestoration />
      <DemoRoleSwitcher />

      <header className="bg-bg-surface border-b border-border-base sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 h-control-touch -ml-2 px-2 rounded-xl text-sm font-semibold text-stone-700 hover:text-stone-950 hover:bg-bg-subtle transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Retour</span>
          </button>

          <Link
            to={routes.home()}
            className="flex items-center gap-2 select-none min-w-0"
            aria-label="Shongre, accueil"
          >
            <span className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center font-black text-base shrink-0">
              S
            </span>
            <span className="text-base font-extrabold tracking-tight uppercase text-stone-900 leading-none truncate">
              Shongre<span className="text-primary">.</span>
            </span>
          </Link>

          {/* A deliberate exit, so leaving a long form is a decision rather than
              a hunt for the browser's back button. */}
          <Link
            to={routes.home()}
            aria-label={t('shell.focusedLayout.quitterEtRevenirAL')}
            className="inline-flex items-center justify-center w-control-touch h-control-touch -mr-2 rounded-xl text-stone-600 hover:text-stone-950 hover:bg-bg-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* No marketplace footer and no bottom tab bar: the flow's own primary
          action owns the bottom of the screen. */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
