import React, { useEffect, useState } from "react";
import { ArrowRight, Menu, Store, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Container } from "../../design-system";
import { routes } from "../../configuration/routes";
import { isProspectsOnlyAccount } from "../../domains/user/user.domain";
import { useAuth } from "../providers/AuthProvider";

export interface ProductNavigationItem {
  label: string;
  to: string;
}

interface ProductHeaderProps {
  productName: string;
  productPath: string;
  workspacePath: string;
  navigation: readonly ProductNavigationItem[];
}

const navigationLinkClass =
  "inline-flex min-h-control-touch items-center text-xs font-bold text-text-secondary transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export const ProductHeader: React.FC<ProductHeaderProps> = ({
  productName,
  productPath,
  workspacePath,
  navigation,
}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isWorkspaceRoute =
    location.pathname === workspacePath ||
    location.pathname.startsWith(`${workspacePath}/`);
  const isProspectsOnly = isProspectsOnlyAccount(currentUser);
  const showProductNavigation = !isWorkspaceRoute;
  const showPlatformNavigation = true;
  const showAccountNavigation = !isProspectsOnly;
  const showWorkspaceAction = !isWorkspaceRoute;
  const hasMobileNavigation =
    showProductNavigation ||
    showPlatformNavigation ||
    showAccountNavigation ||
    showWorkspaceAction;
  const productDestination = isProspectsOnly ? workspacePath : productPath;

  useEffect(() => {
    setIsMenuOpen(false);
  }, [isProspectsOnly, location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  const workspaceDestination = isAuthenticated
    ? workspacePath
    : routes.auth.registerProfessional(workspacePath);
  const accountDestination = isAuthenticated
    ? routes.workspace.overview()
    : routes.auth.login(workspacePath);
  const accountLabel = isAuthenticated ? "Mon compte" : "Se connecter";

  return (
    <header className="sticky top-0 z-header border-b border-border-base bg-bg-surface">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to={routes.home()}
            className="group flex shrink-0 items-center gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Accéder à la plateforme Shongre"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary text-lg font-black text-white transition-colors group-hover:bg-primary-hover">
              S
            </span>
            <span className="hidden leading-none sm:block">
              <span className="block text-base font-black tracking-tight text-text-main transition-colors group-hover:text-primary">
                SHONGRE<span className="text-primary">.</span>
              </span>
              <span className="mt-1 block text-micro font-bold tracking-wider text-text-muted">
                FRANCE
              </span>
            </span>
          </Link>
          <span className="h-8 w-px bg-border-base" aria-hidden="true" />
          <Link
            to={productDestination}
            className="truncate rounded-control text-sm font-black text-text-main transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-base"
            aria-label={`${productName}, ${
              isProspectsOnly ? "ouvrir l’application" : "accueil du produit"
            }`}
          >
            {productName}
          </Link>
        </div>

        {showProductNavigation ? (
          <nav
            className="hidden items-center gap-7 lg:flex"
            aria-label={`Navigation ${productName}`}
          >
            {navigation.map((item) => (
              <a key={item.to} href={item.to} className={navigationLinkClass}>
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}

        {showPlatformNavigation ||
        showAccountNavigation ||
        showWorkspaceAction ? (
          <div className="hidden shrink-0 items-center gap-4 md:flex">
            <Link
              to={routes.home()}
              className="inline-flex min-h-control-touch items-center gap-2 rounded-control px-2 text-xs font-bold text-text-secondary transition-colors hover:bg-bg-subtle hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Store className="h-icon-sm w-icon-sm" aria-hidden="true" />
              Plateforme Shongre
            </Link>
            {showAccountNavigation ? (
              <>
                <Link to={accountDestination} className={navigationLinkClass}>
                  {accountLabel}
                </Link>
              </>
            ) : null}
            {showWorkspaceAction ? (
              <Link
                to={workspaceDestination}
                className="inline-flex min-h-control-touch items-center justify-center gap-2 rounded-control bg-primary px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {isAuthenticated
                  ? "Ouvrir l’application"
                  : "Essayer gratuitement"}
                <ArrowRight
                  className="h-icon-sm w-icon-sm"
                  aria-hidden="true"
                />
              </Link>
            ) : null}
          </div>
        ) : null}

        {hasMobileNavigation ? (
          <button
            type="button"
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
            className="inline-flex h-control-touch w-control-touch shrink-0 items-center justify-center rounded-control border border-border-base text-text-main transition-colors hover:bg-bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
            aria-expanded={isMenuOpen}
            aria-controls="product-mobile-navigation"
            aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {isMenuOpen ? (
              <X className="h-icon-lg w-icon-lg" aria-hidden="true" />
            ) : (
              <Menu className="h-icon-lg w-icon-lg" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </Container>

      {hasMobileNavigation ? (
        <div
          id="product-mobile-navigation"
          className={`border-t border-border-base bg-bg-surface md:hidden ${
            isMenuOpen ? "block" : "hidden"
          }`}
        >
          <Container className="py-3">
            {showProductNavigation ||
            showPlatformNavigation ||
            showAccountNavigation ? (
              <nav
                className="flex flex-col divide-y divide-border-subtle"
                aria-label={`Navigation mobile ${productName}`}
              >
                {showProductNavigation
                  ? navigation.map((item) => (
                      <a
                        key={item.to}
                        href={item.to}
                        onClick={() => setIsMenuOpen(false)}
                        className="inline-flex min-h-control-touch items-center py-2 text-sm font-bold text-text-main hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        {item.label}
                      </a>
                    ))
                  : null}
                <Link
                  to={routes.home()}
                  className="inline-flex min-h-control-touch items-center gap-2 py-2 text-sm font-bold text-text-main hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <Store className="h-icon-sm w-icon-sm" aria-hidden="true" />
                  Plateforme Shongre
                </Link>
                {showAccountNavigation ? (
                  <>
                    <Link
                      to={accountDestination}
                      className="inline-flex min-h-control-touch items-center py-2 text-sm font-bold text-text-main hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      {accountLabel}
                    </Link>
                  </>
                ) : null}
              </nav>
            ) : null}
            {showWorkspaceAction ? (
              <Link
                to={workspaceDestination}
                className="mt-3 inline-flex min-h-control-touch w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {isAuthenticated
                  ? "Ouvrir l’application"
                  : "Essayer gratuitement"}
                <ArrowRight
                  className="h-icon-sm w-icon-sm"
                  aria-hidden="true"
                />
              </Link>
            ) : null}
          </Container>
        </div>
      ) : null}
    </header>
  );
};
