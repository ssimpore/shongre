import React from "react";
import { Link, Outlet } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { routes } from "../../configuration/routes";
import { AppScrollRestoration } from "../router/AppScrollRestoration";
import { DemoRoleSwitcher } from "./DemoRoleSwitcher";
import { useTranslation } from "../../i18n/I18nProvider";
import { Container, SkipLink } from "../../design-system";
import { useSafeBack } from "../router/useSafeBack";

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
  const goBack = useSafeBack(routes.home());

  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-stone-900">
      <SkipLink />
      <AppScrollRestoration />
      <DemoRoleSwitcher />

      <header className="bg-bg-surface border-b border-border-base sticky top-0 z-header">
        <Container
          width="task"
          className="h-14 flex items-center justify-between gap-3"
        >
          {/* `hidden sm:inline` on the only label left this button with no
              accessible name at all below `sm` — the icon is aria-hidden, so a
              screen-reader user on a phone heard "button" on every auth route
              and on the publish wizard. `sr-only` keeps the word in the
              accessibility tree at every width and only hides it visually. */}
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center justify-center gap-1.5 h-control-touch min-w-control-touch -ml-2 px-2 rounded-control text-sm font-semibold text-stone-700 hover:text-stone-950 hover:bg-bg-subtle motion-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-w-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="sr-only sm:not-sr-only">Retour</span>
          </button>

          <Link
            to={routes.home()}
            className="flex items-center gap-2 select-none min-w-0"
            aria-label="Shongre, accueil"
          >
            <span className="w-7 h-7 rounded-control bg-primary text-white flex items-center justify-center font-black text-base shrink-0">
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
            aria-label={t("shell.focusedLayout.quitterEtRevenirAL")}
            className="inline-flex items-center justify-center w-control-touch h-control-touch -mr-2 rounded-control text-stone-600 hover:text-stone-950 hover:bg-bg-subtle motion-interactive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X className="w-5 h-5" />
          </Link>
        </Container>
      </header>

      {/* No marketplace footer and no bottom tab bar: the flow's own primary
          action owns the bottom of the screen. */}
      <main id="main-content" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
