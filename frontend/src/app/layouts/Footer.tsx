import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Truck, Headphones, ChevronDown } from 'lucide-react';
import { TAXONOMY } from '../../domains/taxonomy/taxonomy.data';
import { getTaxonomyLabel } from '../../domains/taxonomy/taxonomy.service';
import { MARKET_CONFIG } from '../../configuration/market.config';
import { LanguageSelector } from '../../design-system/primitives/LanguageSelector';
import { NewsletterSignup } from '../../features/newsletter/components/NewsletterSignup';

const TRUST_HIGHLIGHTS = [
  {
    id: 'escrow',
    Icon: ShieldCheck,
    title: 'Paiement 100% Sécurisé',
    description:
      "Votre argent est conservé sous séquestre jusqu'à la bonne réception de votre commande.",
  },
  {
    id: 'delivery',
    Icon: Truck,
    title: 'Livraison Intégrée',
    description:
      'Envoi en point relais Mondial Relay, Colissimo ou remise en main propre sécurisée.',
  },
  {
    id: 'verified',
    Icon: Lock,
    title: 'Vendeurs & SIRET Vérifiés',
    description:
      'Identités contrôlées et entreprises enregistrées au registre du commerce français.',
  },
  {
    id: 'support',
    Icon: Headphones,
    title: 'Support Client 7j/7',
    description:
      'Une équipe dédiée basée en France pour vous assister et modérer les annonces.',
  },
] as const;

const FOOTER_LINK = 'text-stone-400 hover:text-white hover:translate-x-1 transition-all duration-fast block py-1.5 font-medium';

/**
 * Footer navigation column: a real heading wrapping the disclosure button
 * (WAI-ARIA accordion pattern) instead of a heading nested inside a button.
 * Collapses on mobile, always expanded from `md` up.
 */
const FooterColumn: React.FC<{
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}> = ({ id, title, isOpen, onToggle, children }) => {
  const panelId = `footer-panel-${id}`;
  return (
    <div className="py-3.5 md:py-0">
      <h2>
        <button
          type="button"
          onClick={() => onToggle(id)}
          className="w-full flex items-center justify-between py-1 min-h-6 md:min-h-0 md:py-0 text-left md:pointer-events-none group cursor-pointer md:cursor-default text-xs font-bold text-white uppercase tracking-wider md:mb-4 hover:text-primary md:hover:text-white transition-colors"
          aria-expanded={isOpen}
          aria-controls={panelId}
        >
          <span>{title}</span>
          <ChevronDown
            className={`w-4 h-4 text-stone-400 md:hidden transition-transform duration-normal ${
              isOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        </button>
      </h2>
      <ul id={panelId} className={`space-y-2 mt-3 md:mt-0 ${isOpen ? 'block' : 'hidden md:block'}`}>
        {children}
      </ul>
    </div>
  );
};

export const Footer: React.FC = () => {
  // All accordion sections folded by default on mobile
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: false,
    cities: false,
    professionals: false,
    help: false,
    about: false,
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  return (
    // Bottom padding clears the tallest possible mobile chrome: the fixed bottom
    // navigation (57px) plus a page-level sticky action bar such as the one on
    // listing detail (64px). At `pb-24` the last row of legal links sat behind
    // that bar and could not be tapped.
    <footer className="bg-stone-950 text-stone-300 pt-16 pb-36 md:pb-16 border-t border-stone-800 text-xs">
      {/* Value props & Trust Badges.
          These are reassurance statements, not document sections: rendering them
          as headings injected an h1 → h4 jump into every single page of the app. */}
      <section
        aria-label="Garanties Shongre"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 border-b border-stone-800/60"
      >
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {TRUST_HIGHLIGHTS.map(({ id, Icon, title, description }) => (
            <li key={id} className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-stone-900 text-primary flex items-center justify-center shrink-0 border border-stone-800 shadow-inner">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-white text-sm mb-1.5">{title}</p>
                <p className="text-stone-400 text-xs leading-relaxed">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-0 md:gap-8 divide-y divide-stone-800 md:divide-y-0">
          
          <FooterColumn
            id="categories"
            title="Catégories phares"
            isOpen={openSections.categories}
            onToggle={toggleSection}
          >
            {TAXONOMY.slice(0, 7).map((cat) => (
              <li key={cat.id}>
                <Link to={`/categorie/${cat.slug}`} title={cat.name} className={FOOTER_LINK}>
                  {getTaxonomyLabel(cat, 'compact')}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn
            id="cities"
            title="Villes & Régions"
            isOpen={openSections.cities}
            onToggle={toggleSection}
          >
            {MARKET_CONFIG.popularCities.slice(0, 7).map((city) => (
              <li key={city.name}>
                <Link to={`/recherche?city=${encodeURIComponent(city.name)}`} className={FOOTER_LINK}>
                  Annonces à {city.name}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn
            id="professionals"
            title="Espace Professionnels"
            isOpen={openSections.professionals}
            onToggle={toggleSection}
          >
            <li>
              <Link to="/solutions-pro" className={FOOTER_LINK}>Solutions & Tarifs Pro</Link>
            </li>
            <li>
              <Link to="/inscription/professionnel" className={FOOTER_LINK}>Créer un compte Pro</Link>
            </li>
            <li>
              <Link to="/professionnels" className={FOOTER_LINK}>Annuaire des boutiques</Link>
            </li>
            <li>
              <Link to="/tarifs" className={FOOTER_LINK}>Grille des options & boosts</Link>
            </li>
          </FooterColumn>

          <FooterColumn
            id="help"
            title="Aide & Confiance"
            isOpen={openSections.help}
            onToggle={toggleSection}
          >
            <li>
              <Link to="/aide" className={FOOTER_LINK}>Centre d'aide & FAQ</Link>
            </li>
            <li>
              <Link to="/securite" className={FOOTER_LINK}>Conseils de sécurité</Link>
            </li>
            <li>
              <Link to="/contact" className={FOOTER_LINK}>Contacter le support</Link>
            </li>
            <li>
              <Link to="/newsletter" className={FOOTER_LINK}>Newsletter & Bons plans</Link>
            </li>
            <li>
              <Link
                to="/bons-plans"
                className="text-amber-400 hover:text-amber-300 transition-colors font-medium block py-1"
              >
                Bons plans du moment
              </Link>
            </li>
          </FooterColumn>

          {/* Col 5: Newsletter & Brand */}
          <div className="py-4 md:py-0 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-base">
                  S
                </div>
                <span className="text-base font-extrabold text-white">Shongre</span>
              </div>
              <p className="text-stone-400 text-xs leading-relaxed mb-3">
                Recevez notre sélection hebdomadaire d'annonces et réductions vérifiées.
              </p>
              <NewsletterSignup variant="footer" source="footer" />
            </div>

            <div className="flex items-center gap-2 text-micro text-stone-400 pt-1">
              <span>🇫🇷 Hébergé en France</span>
              <span>•</span>
              <span>100% Conforme RGPD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legal Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-stone-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-400">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            © {new Date().getFullYear()} Shongre SAS. Tous droits réservés.
          </div>
          {/* Language Selector in Footer */}
          <LanguageSelector variant="footer" idPrefix="footer-lang" />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link to="/conditions-utilisation" className="hover:text-stone-300 transition-colors">
            Conditions Générales d'Utilisation
          </Link>
          <Link to="/confidentialite" className="hover:text-stone-300 transition-colors">
            Politique de Confidentialité
          </Link>
          <Link to="/cookies" className="hover:text-stone-300 transition-colors">
            Gestion des Cookies
          </Link>
          <Link to="/mentions-legales" className="hover:text-stone-300 transition-colors">
            Mentions Légales
          </Link>
          <Link to="/accessibilite" className="hover:text-stone-300 transition-colors">
            Accessibilité (WCAG 2.2 AA)
          </Link>
        </div>
      </div>
    </footer>
  );
};
