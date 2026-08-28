import { useEffect, useState } from "react";
import { Menu, Store, X } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { AnalyticsRuntime } from "../../analytics/AnalyticsRuntime";
import { Container, SkipLink } from "../../design-system";
import { applicationHref } from "../../platform/applications/use-application-href";
import { AppScrollRestoration } from "../../app/router/AppScrollRestoration";
import { CookieConsent } from "../../app/layouts/CookieConsent";
import { DemoRoleSwitcher } from "../../app/layouts/DemoRoleSwitcher";
import { PreferencesModal } from "../../app/layouts/PreferencesModal";
import { useConsent } from "../../app/providers/ConsentProvider";
import { useAuth } from "../../app/providers/AuthProvider";
import "./solutions.css";

const navClass =
  "inline-flex min-h-control-touch items-center text-xs font-bold text-text-secondary transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function SolutionsHeader() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const rootHref = applicationHref("solutions");
  const marketplaceHref = applicationHref("marketplace");
  const accountHref = applicationHref(
    "marketplace",
    isAuthenticated ? "/compte" : "/connexion",
  );

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return (
    <header className="sticky top-0 z-header border-b border-border-base bg-white">
      <Container className="flex h-16 items-center justify-between gap-4">
        <a
          href={rootHref}
          className="flex items-center gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="Accueil Shongre Solutions"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-primary text-lg font-black text-white">S</span>
          <span className="leading-none">
            <span className="block text-base font-black tracking-tight text-text-main">shongre</span>
            <span className="mt-1 block text-micro font-semibold text-text-muted sm:hidden">Solutions</span>
          </span>
        </a>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Navigation Solutions">
          <a href={`${rootHref}#catalogue`} className={navClass}>Solutions</a>
          <a href={`${rootHref}#ecosysteme`} className={navClass}>Écosystème</a>
        </nav>
        <div className="hidden items-center gap-5 md:flex">
          <a href={marketplaceHref} className={`${navClass} gap-2`}>
            <Store className="h-icon-sm w-icon-sm" aria-hidden="true" />
            Plateforme Shongre
          </a>
          <a href={accountHref} className={navClass}>
            {isAuthenticated ? "Mon compte" : "Se connecter"}
          </a>
          <a
            href={`${rootHref}#catalogue`}
            className="inline-flex min-h-control-touch items-center rounded-control bg-primary px-4 text-xs font-bold text-white shadow-sm hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Découvrir les solutions
          </a>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <a href={accountHref} className="text-xs font-bold text-primary">
            {isAuthenticated ? "Compte" : "Se connecter"}
          </a>
          <button
            type="button"
            className="inline-flex h-control-touch w-control-touch items-center justify-center rounded-control border border-border-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="solutions-mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </Container>
      <div id="solutions-mobile-menu" className={`${open ? "block" : "hidden"} border-t border-border-base bg-white md:hidden`}>
        <Container className="flex flex-col divide-y divide-border-subtle py-2">
          <a href={`${rootHref}#catalogue`} className="touch-row py-2 text-sm font-bold">Solutions</a>
          <a href={`${rootHref}#ecosysteme`} className="touch-row py-2 text-sm font-bold">Écosystème</a>
          <a href={marketplaceHref} className="touch-row py-2 text-sm font-bold">Plateforme Shongre</a>
        </Container>
      </div>
    </header>
  );
}

function SolutionsFooter() {
  const { openPreferences } = useConsent();
  const rootHref = applicationHref("solutions");
  const footerClass = "inline-flex min-h-8 items-center text-xs font-semibold text-stone-500 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary";
  return (
    <footer className="border-t border-border-base bg-white py-7">
      <Container className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <a href={rootHref} className="text-sm font-black text-text-main">SHONGRE<span className="text-primary">.</span> <span className="font-semibold text-text-muted">Solutions</span></a>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-1" aria-label="Informations Solutions">
          <a href={applicationHref("marketplace", "/aide")} className={footerClass}>À propos</a>
          <a href={applicationHref("marketplace", "/aide")} className={footerClass}>Documentation</a>
          <a href={applicationHref("marketplace", "/securite")} className={footerClass}>Sécurité</a>
          <button type="button" onClick={openPreferences} className={footerClass}>Gestion des cookies</button>
        </nav>
      </Container>
    </footer>
  );
}

export function SolutionsLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-text-main">
      <SkipLink />
      <AppScrollRestoration />
      <DemoRoleSwitcher utility={<AnalyticsRuntime />} />
      <SolutionsHeader />
      <main id="main-content" tabIndex={-1} className="flex-1"><Outlet /></main>
      <SolutionsFooter />
      <PreferencesModal />
      <CookieConsent />
    </div>
  );
}
