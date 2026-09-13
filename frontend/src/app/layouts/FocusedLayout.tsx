import React from "react";
import { Link, Outlet } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { routes } from "../../configuration/routes";
import { AppScrollRestoration } from "../router/AppScrollRestoration";
import { EnvironmentHeaderStack } from "./EnvironmentHeaderStack";
import { useTranslation } from "../../i18n/I18nProvider";
import { Container, SkipLink } from "../../design-system";
import { BrandHeaderSignature } from "../../design-system/primitives/BrandLogo";
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
    <div className="min-h-screen flex flex-col bg-bg-base text-text-main">
      <SkipLink />
      <AppScrollRestoration />
      <EnvironmentHeaderStack>
        <header className="border-b border-border-base bg-bg-surface">
          <Container
            width="task"
            className="h-14 grid grid-cols-3 items-center gap-3"
          >
            {/* `hidden sm:inline` on the only label left this button with no
              accessible name at all below `sm` — the icon is aria-hidden, so a
              screen-reader user on a phone heard "button" on every auth route
              and on the publish wizard. `sr-only` keeps the word in the
              accessibility tree at every width and only hides it visually. */}
            <button
              type="button"
              onClick={goBack}
              className="inline-flex justify-self-start items-center justify-center gap-1.5 h-control-touch min-w-control-touch -ml-2 px-2 rounded-control text-sm font-semibold text-text-emphasis hover:text-text-deep hover:bg-bg-subtle motion-interactive cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-w-0"
            >
              <ArrowLeft className="w-icon-md h-icon-md" />
              <span className="sr-only sm:not-sr-only">Retour</span>
            </button>

            <Link
              to={routes.home()}
              className="flex justify-self-center items-center select-none"
              aria-label="SHONGRE., accueil"
            >
              <BrandHeaderSignature priority />
            </Link>

            {/* A deliberate exit, so leaving a long form is a decision rather than
              a hunt for the browser's back button. */}
            <Link
              to={routes.home()}
              aria-label={t("shell.focusedLayout.quitterEtRevenirAL")}
              className="inline-flex justify-self-end items-center justify-center w-control-touch h-control-touch -mr-2 rounded-control text-text-supporting hover:text-text-deep hover:bg-bg-subtle motion-interactive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X className="w-icon-lg h-icon-lg" />
            </Link>
          </Container>
        </header>
      </EnvironmentHeaderStack>

      {/* No marketplace footer and no bottom tab bar: the flow's own primary
          action owns the bottom of the screen. */}
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
};
