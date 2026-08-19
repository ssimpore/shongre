import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  IdCard,
  Lock,
  Truck,
  Headphones,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  MapPin,
  Briefcase,
  Smartphone,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Twitter,
} from 'lucide-react';
import { TAXONOMY } from '../../domains/taxonomy/taxonomy.data';
import { getTaxonomyLabel } from '../../domains/taxonomy/taxonomy.service';
import { MARKET_CONFIG } from '../../configuration/market.config';
import { LanguageSelector } from '../../design-system/primitives/LanguageSelector';
import { NewsletterSignup } from '../../features/newsletter/components/NewsletterSignup';

/* -----------------------------------------------------------------------------
   Shared surface recipes.

   The footer is built from three nested surfaces on the near-black page:
     PANEL       — the outer shells (trust band, sitemap) at the card radius
     INNER_PANEL — surfaces nested inside a panel, one radius step down
     ICON_TILE   — the brand-tinted square that carries a lucide glyph

   They live here rather than being retyped per block so the whole footer keeps
   one border weight and one fill; the previous version drifted across
   `bg-stone-900`, `bg-stone-800/50` and `bg-stone-800` for the same role.
   -------------------------------------------------------------------------- */
const PANEL = 'rounded-card border border-stone-800/80 bg-stone-900/40';
const INNER_PANEL = 'rounded-2xl border border-stone-800/70 bg-stone-950/40';
const ICON_TILE =
  'rounded-2xl bg-primary/10 border border-primary/25 text-primary-on-dark flex items-center justify-center shrink-0';

const TRUST_HIGHLIGHTS = [
  {
    id: 'escrow',
    Icon: ShieldCheck,
    title: 'Paiement 100% sécurisé',
    description:
      'Vos paiements sont protégés jusqu’à la bonne réception de votre commande.',
  },
  {
    id: 'delivery',
    Icon: Truck,
    title: 'Livraison intégrée',
    description:
      'Envoi en point relais Mondial Relay, Colissimo ou remise en main propre sécurisée.',
  },
  {
    id: 'verified',
    Icon: IdCard,
    title: 'Vendeurs & SIRET vérifiés',
    description:
      'Identités contrôlées et entreprises enregistrées au registre du commerce français.',
  },
  {
    id: 'support',
    Icon: Headphones,
    title: 'Support client 7j/7',
    description:
      'Une équipe dédiée basée en France pour vous assister et modérer les annonces.',
  },
] as const;

/**
 * Store marks, hand-drawn because lucide ships no brand glyph for either: its
 * `Apple` is a piece of fruit, and filling it gives a blob rather than the
 * logo. See the trademark note on APP_DOWNLOADS below.
 */
const AppleMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 384 512" className={className} fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

const GooglePlayMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 512 512" className={className} aria-hidden="true" focusable="false">
    <path fill="#00A0FF" d="M47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0z" />
    <path fill="#00E676" d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z" />
    <path fill="#FFCE00" d="M472.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60-34.1c18-14.3 18-46.5-1.1-60.8z" />
    <path fill="#FF3A44" d="M104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
  </svg>
);

/**
 * Mobile app listings.
 *
 * `url: null` renders a static badge rather than a link to nowhere. It carries
 * "bientot disponible" in its accessible name and tooltip instead of a visible
 * chip, so the row reads the way the real store badges do. Fill these in once
 * the listings exist.
 *
 * Both marks are stand-ins. Apple and Google ship official badge artwork whose
 * trademark rules cover the glyph, the wording and the clear space around it --
 * swap these for the real assets before launch rather than shipping a lookalike.
 */
const APP_DOWNLOADS = [
  {
    id: 'ios',
    Mark: () => <AppleMark className="w-6 h-7 shrink-0 text-white" />,
    eyebrow: 'Télécharger sur',
    store: 'l\u2019App Store',
    url: null as string | null,
  },
  {
    id: 'android',
    Mark: () => <GooglePlayMark className="w-6 h-6 shrink-0" />,
    eyebrow: 'DISPONIBLE SUR',
    store: 'Google Play',
    url: null as string | null,
  },
] as const;

/**
 * Social profiles.
 *
 * Entries without a `url` still render — the row is part of the brand block's
 * composition — but as inert tiles carrying a "bientôt disponible" name, exactly
 * like the store badges above. That keeps the promise honest: nothing here points
 * at `#`, and nothing links to someone else's account on a handle we do not own.
 * Filling in a `url` upgrades the tile to a real link with no other change.
 */
const SOCIAL_LINKS: { id: string; label: string; Icon: typeof Facebook; url: string | null }[] = [
  { id: 'facebook', label: 'Facebook', Icon: Facebook, url: null },
  { id: 'instagram', label: 'Instagram', Icon: Instagram, url: null },
  { id: 'twitter', label: 'X', Icon: Twitter, url: null },
  { id: 'linkedin', label: 'LinkedIn', Icon: Linkedin, url: null },
  { id: 'youtube', label: 'YouTube', Icon: Youtube, url: null },
];

const LEGAL_LINKS = [
  { to: '/conditions-utilisation', label: 'Conditions générales d’utilisation' },
  { to: '/confidentialite', label: 'Politique de confidentialité' },
  { to: '/cookies', label: 'Gestion des cookies' },
  { to: '/mentions-legales', label: 'Mentions légales' },
  { to: '/accessibilite', label: 'Accessibilité (WCAG 2.2 AA)' },
] as const;

/**
 * Sitemap row: label on the left, a chevron pinned right that leans into the
 * travel direction on hover. `justify-between` rather than a trailing margin so
 * the chevrons line up down the column whatever the label length.
 */
const FooterLink: React.FC<{ to: string; title?: string; children: React.ReactNode }> = ({
  to,
  title,
  children,
}) => (
  <li>
    <Link
      to={to}
      title={title}
      className="group flex items-center justify-between gap-2 py-1.5 font-medium text-stone-400 hover:text-white transition-colors"
    >
      <span>{children}</span>
      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-stone-600 group-hover:text-primary-on-dark group-hover:translate-x-0.5 transition-all duration-fast" />
    </Link>
  </li>
);

/**
 * Footer navigation column: a real heading wrapping the disclosure button
 * (WAI-ARIA accordion pattern) instead of a heading nested inside a button.
 * Collapses on mobile, always expanded from `md` up.
 *
 * From `lg` the column carries its own left rule, cancelled on the first child,
 * which is what draws the vertical separators between the four columns. Doing it
 * with `divide-x` on the grid instead would have hung the rule off the gutter
 * edge rather than centring it between columns.
 */
const FooterColumn: React.FC<{
  id: string;
  title: string;
  Icon: typeof LayoutGrid;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}> = ({ id, title, Icon, isOpen, onToggle, children }) => {
  const panelId = `footer-panel-${id}`;
  return (
    <div className="py-3.5 md:py-0 lg:px-5 lg:border-l lg:border-stone-800/60 lg:first:border-l-0 lg:first:pl-0">
      <h2>
        <button
          type="button"
          onClick={() => onToggle(id)}
          className="w-full flex items-center justify-between gap-2 py-1 min-h-6 md:min-h-0 md:py-0 text-left md:pointer-events-none group cursor-pointer md:cursor-default text-xs font-bold text-white uppercase tracking-wider md:mb-5 hover:text-primary-on-dark md:hover:text-white transition-colors"
          aria-expanded={isOpen}
          aria-controls={panelId}
        >
          <span className="flex items-center gap-2">
            <Icon className="w-4 h-4 shrink-0 text-primary-on-dark" />
            <span>{title}</span>
          </span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 md:hidden transition-transform duration-normal ${
              isOpen ? 'rotate-180 text-primary-on-dark' : 'text-stone-400'
            }`}
          />
        </button>
      </h2>
      <ul id={panelId} className={`space-y-1 mt-3 md:mt-0 ${isOpen ? 'block' : 'hidden md:block'}`}>
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
    //
    // The relaxed value waits for `lg`, not `md`. The tab bar does stop at `md`,
    // but the listing page's price/action bar runs all the way to `lg` — so
    // between 768px and 1023px `md:pb-16` left that bar covering the final footer
    // row: the copyright and the CGU / privacy / cookie links, which are exactly
    // the ones that have to stay reachable.
    <footer className="bg-stone-950 text-stone-300 pt-12 pb-36 lg:pb-10 border-t border-stone-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Value props & trust badges.
            These are reassurance statements, not document sections: rendering
            them as headings injected an h1 → h4 jump into every single page of
            the app. */}
        <section aria-label="Garanties Shongre" className={`${PANEL} p-6 sm:p-8`}>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
            {TRUST_HIGHLIGHTS.map(({ id, Icon, title, description }) => (
              <li
                key={id}
                className="flex items-start gap-4 lg:px-5 lg:border-l lg:border-stone-800/60 lg:first:border-l-0 lg:first:pl-0"
              >
                <div className={`${ICON_TILE} w-12 h-12`}>
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

        {/* Sitemap panel. The brand/newsletter block is a grid sibling rather
            than a fifth column: it is an elevated surface that breaks out of the
            panel padding to sit flush with its top-right corner, so it needs its
            own track instead of inheriting the column rules and gutters. */}
        <div className={`${PANEL} p-6 sm:p-8`}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 lg:gap-x-0 divide-y divide-stone-800 md:divide-y-0">
                <FooterColumn
                  id="categories"
                  title="Catégories phares"
                  Icon={LayoutGrid}
                  isOpen={openSections.categories}
                  onToggle={toggleSection}
                >
                  {TAXONOMY.slice(0, 7).map((cat) => (
                    <FooterLink key={cat.id} to={`/categorie/${cat.slug}`} title={cat.name}>
                      {getTaxonomyLabel(cat, 'compact')}
                    </FooterLink>
                  ))}
                </FooterColumn>

                <FooterColumn
                  id="cities"
                  title="Villes & Régions"
                  Icon={MapPin}
                  isOpen={openSections.cities}
                  onToggle={toggleSection}
                >
                  {MARKET_CONFIG.popularCities.slice(0, 7).map((city) => (
                    <FooterLink
                      key={city.name}
                      to={`/recherche?city=${encodeURIComponent(city.name)}`}
                    >
                      Annonces à {city.name}
                    </FooterLink>
                  ))}
                </FooterColumn>

                <FooterColumn
                  id="professionals"
                  title="Espace professionnels"
                  Icon={Briefcase}
                  isOpen={openSections.professionals}
                  onToggle={toggleSection}
                >
                  <FooterLink to="/solutions-pro">Solutions &amp; Tarifs Pro</FooterLink>
                  <FooterLink to="/inscription/professionnel">Créer un compte Pro</FooterLink>
                  <FooterLink to="/professionnels">Annuaire des boutiques</FooterLink>
                  <FooterLink to="/tarifs">Grille des options &amp; boosts</FooterLink>
                </FooterColumn>

                <FooterColumn
                  id="help"
                  title="Aide & Confiance"
                  Icon={ShieldCheck}
                  isOpen={openSections.help}
                  onToggle={toggleSection}
                >
                  <FooterLink to="/aide">Centre d’aide &amp; FAQ</FooterLink>
                  <FooterLink to="/securite">Conseils de sécurité</FooterLink>
                  <FooterLink to="/contact">Contacter le support</FooterLink>
                  <FooterLink to="/newsletter">Newsletter &amp; Bons plans</FooterLink>
                  <li>
                    <Link
                      to="/bons-plans"
                      className="group flex items-center justify-between gap-2 py-1.5 font-medium text-primary-on-dark hover:text-white transition-colors"
                    >
                      {/* Wraps the badge onto its own line rather than letting
                          it squeeze the label: at the column's width "Bons plans
                          du moment" and the pill do not share a line. */}
                      <span className="flex items-center flex-wrap gap-x-2 gap-y-1">
                        <span className="whitespace-nowrap">Bons plans du moment</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-stone-800 border border-stone-700 text-micro font-bold uppercase tracking-wider text-stone-300">
                          Nouveau
                        </span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-stone-600 group-hover:text-primary-on-dark group-hover:translate-x-0.5 transition-all duration-fast" />
                    </Link>
                  </li>
                </FooterColumn>
              </div>

            </div>

            {/* Brand & newsletter.
                `-mt-8 / -mr-8` cancels the panel's own padding from `lg` up so
                this card lands flush on the panel's top-right corner; both share
                `rounded-card`, so the two corners trace the same arc instead of
                nesting one radius inside another. */}
            <aside
              aria-label="Newsletter Shongre"
              className="rounded-card border border-primary/30 bg-stone-900/70 p-5 sm:p-6 shadow-lg shadow-primary/5 lg:self-start lg:-mt-8 lg:-mr-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xl shrink-0">
                  S
                </div>
                <span className="text-xl font-extrabold text-white tracking-tight">Shongre</span>
              </div>

              <p className="text-stone-400 text-xs leading-relaxed mb-4">
                Recevez notre sélection hebdomadaire d’annonces et réductions vérifiées.
              </p>

              <NewsletterSignup variant="footer" source="footer" />

              <h2 className="text-xs font-bold text-white text-center mt-6 mb-3">Suivez-nous</h2>
              <ul className="flex items-center justify-between flex-wrap gap-1.5 sm:gap-2.5">
                {SOCIAL_LINKS.map(({ id, label, Icon, url }) => (
                  <li key={id}>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${label} (nouvelle fenêtre)`}
                        className={`${ICON_TILE} w-control-touch h-control-touch hover:bg-primary/20 hover:border-primary/50 transition-colors`}
                      >
                        <Icon className="w-5 h-5" />
                      </a>
                    ) : (
                      <span
                        title={`${label} — bientôt disponible`}
                        className={`${ICON_TILE} w-control-touch h-control-touch opacity-80 cursor-default select-none`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="sr-only">{label} — bientôt disponible</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <ul className="grid grid-cols-2 mt-6 pt-5 border-t border-stone-800 divide-x divide-stone-800">
                <li className="flex items-center gap-2.5 pr-3">
                  <span aria-hidden="true" className="text-base leading-none shrink-0">
                    🇫🇷
                  </span>
                  <span className="text-micro text-stone-400 leading-tight">
                    Hébergé
                    <br />
                    en France
                  </span>
                </li>
                <li className="flex items-center gap-2.5 pl-3">
                  <Lock className="w-4 h-4 shrink-0 text-stone-400" aria-hidden="true" />
                  <span className="text-micro text-stone-400 leading-tight">
                    100% conforme
                    <br />
                    RGPD
                  </span>
                </li>
              </ul>
            </aside>
          </div>

            {/* App downloads. Sits under the sitemap rather than in it: these
                are brand-level actions, not navigation. */}
            <section aria-label="Applications mobiles Shongre" className={`${INNER_PANEL} mt-6 p-5`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`${ICON_TILE} w-12 h-12`}>
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-white">L’application Shongre</h2>
                    <p className="text-stone-400 text-xs mt-0.5">
                      Emportez Shongre partout avec vous.
                    </p>
                  </div>
                </div>

                <ul className="flex flex-wrap items-center gap-4">
                  {APP_DOWNLOADS.map(({ id, Mark, eyebrow, store, url }) => {
                    const content = (
                      <>
                        <Mark />
                        <span className="text-left leading-tight">
                          <span className="block text-micro tracking-wide text-stone-400">
                            {eyebrow}
                          </span>
                          <span className="block text-sm font-bold text-white">{store}</span>
                        </span>
                      </>
                    );

                    return (
                      <li key={id}>
                        {/* No listing yet: render a static badge rather than a
                            link to nowhere, and say so, so the affordance is
                            not a dead end. */}
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 h-control-lg px-5 rounded-xl border border-stone-800 bg-stone-950 hover:border-stone-700 hover:bg-black transition-colors"
                          >
                            {content}
                          </a>
                        ) : (
                          <span
                            title={`${store} — bientôt disponible`}
                            className="inline-flex items-center gap-3 h-control-lg px-5 rounded-xl border border-stone-800 bg-stone-950 cursor-default select-none"
                          >
                            {content}
                            <span className="sr-only">— bientôt disponible</span>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
        </div>

        {/* Legal bar. Deliberately outside the panels, directly on the page
            ground — it closes the document rather than belonging to any block. */}
        <div className="pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs text-stone-400">
          <div className="flex items-center gap-4 flex-wrap">
            <span>© {new Date().getFullYear()} Shongre SAS. Tous droits réservés.</span>
            <LanguageSelector variant="footer" idPrefix="footer-lang" />
          </div>

          <nav aria-label="Informations légales">
            <ul className="flex flex-wrap items-center gap-y-1">
              {LEGAL_LINKS.map(({ to, label }, index) => (
                <li key={to} className="flex items-center">
                  {index > 0 && (
                    <span aria-hidden="true" className="w-px h-3 bg-stone-800 mx-4" />
                  )}
                  <Link to={to} className="py-1 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
};
