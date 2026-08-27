import React from "react";
import { Link } from "react-router-dom";
import { Container } from "../../design-system";
import { routes } from "../../configuration/routes";
import { useConsent } from "../providers/ConsentProvider";
import type { ProductNavigationItem } from "./ProductHeader";

interface ProductFooterProps {
  productName: string;
  productPath: string;
  navigation: readonly ProductNavigationItem[];
}

const footerLinkClass =
  "inline-flex min-h-8 items-center text-xs font-semibold text-stone-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-on-dark";

export const ProductFooter: React.FC<ProductFooterProps> = ({
  productName,
  productPath,
  navigation,
}) => {
  const { openPreferences } = useConsent();

  return (
    <footer className="border-t border-stone-800 bg-stone-950 py-9 text-stone-300">
      <Container>
        <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              to={productPath}
              className="inline-flex items-center gap-2 text-base font-black tracking-tight text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-on-dark"
            >
              SHONGRE<span className="text-primary-on-dark">.</span>
              <span className="font-semibold text-stone-400">
                {productName}
              </span>
            </Link>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-stone-400">
              La prospection B2B explicable, reliée au CRM et aux outils
              Shongre.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3 lg:gap-x-12">
            <nav
              className="flex flex-col"
              aria-label={`Produit ${productName}`}
            >
              {navigation.map((item) => (
                <a key={item.to} href={item.to} className={footerLinkClass}>
                  {item.label}
                </a>
              ))}
            </nav>
            <nav className="flex flex-col" aria-label="Écosystème Shongre">
              <Link to={routes.home()} className={footerLinkClass}>
                Marketplace
              </Link>
              <Link to={routes.proPlans()} className={footerLinkClass}>
                Shongre Pro
              </Link>
              <Link to={routes.help()} className={footerLinkClass}>
                Aide
              </Link>
            </nav>
            <nav className="flex flex-col" aria-label="Informations légales">
              <Link to={routes.legal.privacy()} className={footerLinkClass}>
                Confidentialité
              </Link>
              <Link to={routes.legal.notices()} className={footerLinkClass}>
                Mentions légales
              </Link>
              <button
                type="button"
                onClick={openPreferences}
                className={`${footerLinkClass} text-left`}
              >
                Gestion des cookies
              </button>
            </nav>
          </div>
        </div>
        <p className="mt-8 border-t border-stone-800 pt-5 text-micro text-stone-400">
          © 2026 Shongre SAS. Tous droits réservés.
        </p>
      </Container>
    </footer>
  );
};
