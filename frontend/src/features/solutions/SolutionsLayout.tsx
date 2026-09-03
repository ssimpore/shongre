import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Store, X } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { AnalyticsRuntime } from "../../analytics/AnalyticsRuntime";
import { services } from "../../api/client/service-registry";
import { Container, SkipLink } from "../../design-system";
import { solutionLifecycleLabel } from "../../domains/solutions/solutions.presentation";
import type { SolutionDefinition } from "../../domains/solutions/solutions.types";
import { useTranslation } from "../../i18n/I18nProvider";
import { applicationHref } from "../../platform/applications/use-application-href";
import { AppScrollRestoration } from "../../app/router/AppScrollRestoration";
import { CookieConsent } from "../../app/layouts/CookieConsent";
import { DemoRoleSwitcher } from "../../app/layouts/DemoRoleSwitcher";
import { LazyPreferencesModal } from "../../app/layouts/LazyPreferencesModal";
import { useConsent } from "../../app/providers/ConsentProvider";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { SolutionIcon } from "./SolutionIcon";
import "./solutions.css";

const navClass =
  "inline-flex min-h-control-touch items-center text-xs font-bold text-text-secondary transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function SolutionsHeader() {
  const location = useLocation();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { activeMarket, currentLocale } = useMarketLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionMenuOpen, setSolutionMenuOpen] = useState(false);
  const [solutions, setSolutions] = useState<SolutionDefinition[]>([]);
  const solutionMenuRef = useRef<HTMLDivElement>(null);
  const solutionTriggerRef = useRef<HTMLButtonElement>(null);
  const rootHref = applicationHref("solutions");
  const marketplaceHref = applicationHref("marketplace");
  const accountHref = applicationHref(
    "marketplace",
    isAuthenticated ? "/compte" : "/connexion",
  );

  useEffect(() => {
    setMobileMenuOpen(false);
    setSolutionMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    void services.solutions
      .listPublicSolutions({
        marketCode: activeMarket.code,
        language: currentLocale,
      })
      .then((values) => {
        if (!cancelled) setSolutions(values);
      })
      .catch(() => {
        if (!cancelled) setSolutions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeMarket.code, currentLocale]);

  useEffect(() => {
    if (!mobileMenuOpen && !solutionMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileMenuOpen(false);
      setSolutionMenuOpen(false);
      if (solutionMenuOpen) {
        requestAnimationFrame(() => solutionTriggerRef.current?.focus());
      }
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        solutionMenuRef.current &&
        !solutionMenuRef.current.contains(event.target as Node)
      ) {
        setSolutionMenuOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [mobileMenuOpen, solutionMenuOpen]);

  const focusFirstSolution = () => {
    requestAnimationFrame(() => {
      solutionMenuRef.current
        ?.querySelector<HTMLElement>("#solutions-product-menu a")
        ?.focus();
    });
  };

  return (
    <header className="sticky top-0 z-header border-b border-border-base bg-white">
      <Container className="flex h-16 items-center justify-between gap-4">
        <a
          href={rootHref}
          className="flex items-center gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={t("solutions.header.homeLabel")}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-primary text-lg font-bold text-white">
            S
          </span>
          <span className="leading-none">
            <span className="block text-base font-bold tracking-tight text-text-main">
              shongre
            </span>
            <span className="mt-1 block text-micro font-semibold text-text-muted sm:hidden">
              {t("solutions.header.solutions")}
            </span>
          </span>
        </a>
        <nav
          className="hidden items-center gap-7 md:flex"
          aria-label={t("solutions.header.navigationLabel")}
        >
          <div
            ref={solutionMenuRef}
            className="relative"
            onMouseEnter={() => setSolutionMenuOpen(true)}
            onMouseLeave={() => {
              if (!solutionMenuRef.current?.contains(document.activeElement)) {
                setSolutionMenuOpen(false);
              }
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setSolutionMenuOpen(false);
              }
            }}
          >
            <button
              ref={solutionTriggerRef}
              type="button"
              className={`${navClass} gap-1`}
              aria-expanded={solutionMenuOpen}
              aria-controls="solutions-product-menu"
              onClick={() => setSolutionMenuOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSolutionMenuOpen(true);
                  focusFirstSolution();
                }
              }}
            >
              {t("solutions.header.solutions")}
              <ChevronDown
                className={`h-icon-xs w-icon-xs transition-transform duration-fast ${solutionMenuOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {solutionMenuOpen ? (
              <div className="absolute left-1/2 top-full w-80 -translate-x-1/2 pt-2">
                <div
                  id="solutions-product-menu"
                  aria-label={t("solutions.header.chooseSolution")}
                  className="rounded-card border border-border-base bg-bg-surface p-2 shadow-dropdown"
                >
                  <div className="space-y-1">
                    {solutions.map((solution) => {
                      return (
                        <a
                          key={solution.id}
                          href={applicationHref(
                            "solutions",
                            `/${solution.slug}`,
                          )}
                          className="flex min-h-control-touch items-center gap-3 rounded-control px-3 py-2 text-left hover:bg-bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-light text-primary">
                            <SolutionIcon
                              icon={solution.icon}
                              className="h-icon-md w-icon-md"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-3">
                              <span className="truncate text-sm font-bold text-text-main">
                                {solution.name.replace(/^Shongre\s+/, "")}
                              </span>
                              <span className="shrink-0 text-micro font-semibold text-text-muted">
                                {solutionLifecycleLabel(t, solution.lifecycle)}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-text-secondary">
                              {solution.shortDescription}
                            </span>
                          </span>
                        </a>
                      );
                    })}
                  </div>
                  <a
                    href={`${rootHref}#catalogue`}
                    className="mt-2 flex min-h-control-touch items-center justify-center rounded-control border-t border-border-subtle px-3 pt-3 text-xs font-bold text-primary hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {t("solutions.header.seeAll")}
                  </a>
                </div>
              </div>
            ) : null}
          </div>
          <a href={`${rootHref}#ecosysteme`} className={navClass}>
            {t("solutions.header.ecosystem")}
          </a>
        </nav>
        <div className="hidden items-center gap-5 md:flex">
          <a href={marketplaceHref} className={`${navClass} gap-2`}>
            <Store className="h-icon-sm w-icon-sm" aria-hidden="true" />
            {t("solutions.header.platform")}
          </a>
          <a href={accountHref} className={navClass}>
            {t(
              isAuthenticated
                ? "solutions.header.account"
                : "solutions.header.signIn",
            )}
          </a>
          <a
            href={`${rootHref}#catalogue`}
            className="inline-flex min-h-control-touch items-center rounded-control bg-primary px-4 text-xs font-bold text-white shadow-sm hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {t("solutions.header.discover")}
          </a>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <a href={accountHref} className="text-xs font-bold text-primary">
            {t(
              isAuthenticated
                ? "solutions.header.accountShort"
                : "solutions.header.signIn",
            )}
          </a>
          <button
            type="button"
            className="inline-flex h-control-touch w-control-touch items-center justify-center rounded-control border border-border-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={t(
              mobileMenuOpen
                ? "solutions.header.closeMenu"
                : "solutions.header.openMenu",
            )}
            aria-expanded={mobileMenuOpen}
            aria-controls="solutions-mobile-menu"
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            {mobileMenuOpen ? (
              <X aria-hidden="true" />
            ) : (
              <Menu aria-hidden="true" />
            )}
          </button>
        </div>
      </Container>
      <div
        id="solutions-mobile-menu"
        className={`${mobileMenuOpen ? "block" : "hidden"} border-t border-border-base bg-white md:hidden`}
      >
        <Container className="flex flex-col divide-y divide-border-subtle py-2">
          <div className="py-2">
            <a
              href={`${rootHref}#catalogue`}
              className="touch-row text-sm font-bold"
            >
              {t("solutions.header.solutions")}
            </a>
            <div className="mt-1 grid gap-1 pl-3">
              {solutions.map((solution) => (
                <a
                  key={solution.id}
                  href={applicationHref("solutions", `/${solution.slug}`)}
                  className="touch-row flex items-center gap-2 rounded-control text-xs font-semibold text-text-secondary hover:bg-bg-subtle hover:text-primary"
                >
                  <SolutionIcon
                    icon={solution.icon}
                    className="h-icon-sm w-icon-sm text-primary"
                  />
                  {solution.name.replace(/^Shongre\s+/, "")}
                </a>
              ))}
            </div>
          </div>
          <a
            href={`${rootHref}#ecosysteme`}
            className="touch-row py-2 text-sm font-bold"
          >
            {t("solutions.header.ecosystem")}
          </a>
          <a
            href={marketplaceHref}
            className="touch-row py-2 text-sm font-bold"
          >
            {t("solutions.header.platform")}
          </a>
        </Container>
      </div>
    </header>
  );
}

function SolutionsFooter() {
  const { t } = useTranslation();
  const { openPreferences } = useConsent();
  const rootHref = applicationHref("solutions");
  const footerClass =
    "inline-flex min-h-8 items-center text-xs font-semibold text-stone-500 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary";
  return (
    <footer className="border-t border-border-base bg-white py-7">
      <Container className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <a href={rootHref} className="text-sm font-bold text-text-main">
          SHONGRE<span className="text-primary">.</span>{" "}
          <span className="font-semibold text-text-muted">Solutions</span>
        </a>
        <nav
          className="flex flex-wrap items-center gap-x-6 gap-y-1"
          aria-label={t("solutions.footer.informationLabel")}
        >
          <a
            href={applicationHref("marketplace", "/aide")}
            className={footerClass}
          >
            {t("solutions.footer.about")}
          </a>
          <a
            href={applicationHref("marketplace", "/aide")}
            className={footerClass}
          >
            {t("solutions.footer.documentation")}
          </a>
          <a
            href={applicationHref("marketplace", "/securite")}
            className={footerClass}
          >
            {t("solutions.footer.security")}
          </a>
          <button
            type="button"
            onClick={openPreferences}
            className={footerClass}
          >
            {t("solutions.footer.cookies")}
          </button>
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
      <main id="main-content" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      <SolutionsFooter />
      <LazyPreferencesModal />
      <CookieConsent />
    </div>
  );
}
