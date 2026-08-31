import React from "react";
import { Container } from "../../design-system";
import { routes } from "../../configuration/routes";
import { useConsent } from "../providers/ConsentProvider";
import type { ProductNavigationItem } from "./ProductHeader";
import { isProductOnlyAccount } from "../../domains/user/user.domain";
import { useAuth } from "../providers/AuthProvider";
import type { ShongreProductId } from "../../types";
import { applicationHref } from "../../platform/applications/use-application-href";

interface ProductFooterProps {
  productId: ShongreProductId;
  productName: string;
  productPath: string;
  navigation: readonly ProductNavigationItem[];
  description?: string;
}

const footerLinkClass =
  "inline-flex min-h-8 items-center text-xs font-semibold text-stone-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-on-dark";

export const ProductFooter: React.FC<ProductFooterProps> = ({
  productId,
  productName,
  productPath,
  navigation,
  description = "La prospection B2B explicable, reliée au CRM et aux outils Shongre.",
}) => {
  const { openPreferences } = useConsent();
  const { currentUser } = useAuth();
  const showEcosystem = !isProductOnlyAccount(currentUser, productId);

  return (
    <footer className="border-t border-stone-800 bg-stone-950 py-9 text-stone-300">
      <Container>
        <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <a
              href={applicationHref(productId, productPath)}
              className="inline-flex items-center gap-2 text-base font-black tracking-tight text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-on-dark"
            >
              SHONGRE<span className="text-primary-on-dark">.</span>
              <span className="font-semibold text-stone-400">
                {productName}
              </span>
            </a>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-stone-400">
              {description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3 lg:gap-x-12">
            <nav
              className="flex flex-col"
              aria-label={`Produit ${productName}`}
            >
              {navigation.map((item) => (
                <a
                  key={item.to}
                  href={applicationHref(productId, item.to)}
                  className={footerLinkClass}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <nav className="flex flex-col" aria-label="Assistance Shongre">
              {showEcosystem ? (
                <>
                  <a
                    href={applicationHref("marketplace", routes.home())}
                    className={footerLinkClass}
                  >
                    Marketplace
                  </a>
                  <a
                    href={applicationHref("marketplace", routes.proPlans())}
                    className={footerLinkClass}
                  >
                    Shongre Pro
                  </a>
                </>
              ) : null}
              <a
                href={applicationHref("marketplace", routes.help())}
                className={footerLinkClass}
              >
                Aide
              </a>
            </nav>
            <nav className="flex flex-col" aria-label="Informations légales">
              <a
                href={applicationHref("marketplace", routes.legal.privacy())}
                className={footerLinkClass}
              >
                Confidentialité
              </a>
              <a
                href={applicationHref("marketplace", routes.legal.notices())}
                className={footerLinkClass}
              >
                Mentions légales
              </a>
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
