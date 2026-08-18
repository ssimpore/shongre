import React from 'react';
import { ShieldCheck, Lock, AlertTriangle, HelpCircle, Check, Sparkles, Tag } from 'lucide-react';
import { Breadcrumbs } from '../../design-system/primitives/UIComponents';
import { storageService } from '../../services/storage.service';
import { ListingCard } from '../../design-system/primitives/ListingCard';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs items={[{ label: 'Accueil', href: '/' }, { label: "Conditions Générales d'Utilisation" }]} />
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-6 text-xs sm:text-sm text-stone-700 leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Conditions Générales d'Utilisation (CGU)</h1>
        <p className="text-stone-500">Dernière mise à jour : Février 2026</p>
        <section className="space-y-2">
          <h2 className="text-base font-bold text-stone-900">1. Objet de la plateforme</h2>
          <p>La plateforme Shongre est un service de mise en relation entre acheteurs et vendeurs (particuliers et professionnels) pour la publication de petites annonces, la négociation et l'exécution sécurisée de transactions en France métropolitaine.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-bold text-stone-900">2. Séquestre & Protection Acheteur</h2>
          <p>Lorsqu'une transaction est effectuée via le système de paiement en ligne, les fonds sont conservés sur un compte séquestre français jusqu'à la confirmation de réception conforme par l'acheteur.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-bold text-stone-900">3. Engagements des Professionnels</h2>
          <p>Les vendeurs professionnels s'engagent à fournir un numéro SIRET valide, à respecter le droit de rétractation légal de 14 jours et à émettre des factures conformes aux exigences fiscales françaises.</p>
        </section>
      </div>
    </div>
  );
};

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs items={[{ label: 'Accueil', href: '/' }, { label: 'Politique de Confidentialité' }]} />
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-6 text-xs sm:text-sm text-stone-700 leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Politique de Confidentialité & RGPD</h1>
        <p>Shongre attache la plus grande importance à la protection de vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD 2016/679) et à la loi Informatique et Libertés.</p>
        <div className="p-4 bg-success-surface text-success rounded-xl border border-success-border text-xs">
          <strong>Principe de minimisation :</strong> Nous ne collectons que les données strictement nécessaires au bon déroulement des transactions et à la sécurité des utilisateurs.
        </div>
      </div>
    </div>
  );
};

export const LegalNoticesPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs items={[{ label: 'Accueil', href: '/' }, { label: 'Mentions Légales' }]} />
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Mentions Légales</h1>
        <p><strong>Éditeur :</strong> Shongre SAS au capital de 50 000 € - RCS Paris 912 345 678</p>
        <p><strong>Siège social :</strong> 14 boulevard Haussmann, 75009 Paris, France</p>
        <p><strong>Directeur de la publication :</strong> Antoine Fabre, Président</p>
        <p><strong>Hébergement :</strong> Serveurs sécurisés situés en France métropolitaine.</p>
      </div>
    </div>
  );
};

export const AccessibilityPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs items={[{ label: 'Accueil', href: '/' }, { label: 'Déclaration d\'Accessibilité' }]} />
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Déclaration d'Accessibilité (WCAG 2.2 AA)</h1>
        <p>Shongre s'engage à rendre sa plateforme accessible à tous les internautes, y compris les personnes en situation de handicap, conformément aux standards internationaux WCAG 2.2 niveau AA.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Navigation intégrale au clavier avec focus visible</li>
          <li>Contrastes typographiques supérieurs aux ratios 4.5:1</li>
          <li>Labels et attributs ARIA sur l'ensemble des contrôles interactifs</li>
        </ul>
      </div>
    </div>
  );
};

export const HelpSafetyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs items={[{ label: 'Accueil', href: '/' }, { label: 'Centre d\'Aide & Sécurité' }]} />
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-6 text-xs sm:text-sm text-stone-700 leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Conseils de Sécurité & Anti-Fraude</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-danger-surface border border-danger-border text-danger space-y-1">
            <h2 className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-danger" /> Ne payez jamais hors plateforme</h2>
            <p className="text-xs">Refusez les virements directs, mandats Western Union ou chèques sans garantie.</p>
          </div>
          <div className="p-4 rounded-xl bg-success-surface border border-success-border text-success space-y-1">
            <h2 className="font-bold flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-success" /> Utilisez le séquestre Shongre</h2>
            <p className="text-xs">Votre argent est protégé jusqu'à ce que vous confirmiez la conformité du colis reçu.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DealsPage: React.FC = () => {
  const deals = storageService.getListings().filter((l) => l.originalPrice && l.originalPrice > l.price);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Accueil', href: '/' }, { label: 'Bons plans & Réductions' }]} />
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-surface border border-warning-border text-warning text-xs font-bold mb-2">
          <Tag className="w-3.5 h-3.5 text-warning" />
          Offres vérifiées à prix réduits
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
          Les meilleures réductions du moment ({deals.length})
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Articles dont le prix a été baissé récemment par leur vendeur
        </p>
      </div>

      {/* The card titles are h3, so the results grid needs its own section
          heading rather than jumping straight from the page h1. */}
      <section aria-labelledby="deals-results-heading">
        <h2 id="deals-results-heading" className="sr-only">
          Annonces en promotion
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {deals.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </div>
  );
};
