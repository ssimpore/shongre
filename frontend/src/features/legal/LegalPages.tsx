import React from 'react';
import { ShieldCheck,  AlertTriangle,    Tag } from 'lucide-react';
import { Breadcrumbs } from '../../design-system';
import { storageService } from '../../services/storage.service';
import { ListingCard } from '../../design-system/primitives/ListingCard';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTranslation } from '../../i18n/I18nProvider';

export const TermsPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Conditions Générales d'Utilisation",
    description:
      "Les conditions d'utilisation de la place de marché Shongre : rôle de la plateforme, séquestre et protection acheteur, engagements des vendeurs professionnels.",
    canonicalPath: "/conditions-utilisation",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs items={[{ label: 'Accueil', href: '/' }, { label: "Conditions Générales d'Utilisation" }]} />
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-6 text-xs sm:text-sm text-stone-700 leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">{t('legal.legalPages.conditionsGeneralesDUtilisationCgu')}</h1>
        <p className="text-stone-500">{t('legal.legalPages.derniereMiseAJourFevrier')}</p>
        <section className="space-y-2">
          <h2 className="text-base font-bold text-stone-900">{t('legal.legalPages.1ObjetDeLaPlateforme')}</h2>
          <p>{t('legal.legalPages.laPlateformeShongreEstUn')}</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-bold text-stone-900">{t('legal.legalPages.2SequestreProtectionAcheteur')}</h2>
          <p>{t('legal.legalPages.lorsquUneTransactionEstEffectuee')}</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-bold text-stone-900">{t('legal.legalPages.3EngagementsDesProfessionnels')}</h2>
          <p>{t('legal.legalPages.lesVendeursProfessionnelsSEngagent')}</p>
        </section>
      </div>
    </div>
  );
};

export const PrivacyPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Politique de confidentialité & RGPD",
    description:
      "Comment Shongre collecte, utilise et protège vos données personnelles, conformément au RGPD et à la loi Informatique et Libertés.",
    canonicalPath: "/confidentialite",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs items={[{ label: 'Accueil', href: '/' }, { label: 'Politique de Confidentialité' }]} />
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-6 text-xs sm:text-sm text-stone-700 leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">{t('legal.legalPages.politiqueDeConfidentialiteRgpd')}</h1>
        <p>{t('legal.legalPages.shongreAttacheLaPlusGrande')}</p>
        <div className="p-4 bg-success-surface text-success rounded-xl border border-success-border text-xs">
          <strong>{t('legal.legalPages.principeDeMinimisation')}</strong> Nous ne collectons que les données strictement nécessaires au bon déroulement des transactions et à la sécurité des utilisateurs.
        </div>
      </div>
    </div>
  );
};

export const LegalNoticesPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Mentions légales",
    description:
      "Éditeur, hébergeur et informations légales de la place de marché Shongre.",
    canonicalPath: "/mentions-legales",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs items={[{ label: 'Accueil', href: '/' }, { label: 'Mentions Légales' }]} />
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">{t('legal.legalPages.mentionsLegales')}</h1>
        <p><strong>{t('legal.legalPages.editeur')}</strong> {t('legal.legalPages.shongreSasAuCapitalDe')}</p>
        <p><strong>{t('legal.legalPages.siegeSocial')}</strong> 14 boulevard Haussmann, 75009 Paris, France</p>
        <p><strong>{t('legal.legalPages.directeurDeLaPublication')}</strong> {t('legal.legalPages.antoineFabrePresident')}</p>
        <p><strong>{t('legal.legalPages.hebergement')}</strong> {t('legal.legalPages.serveursSecurisesSituesEnFrance')}</p>
      </div>
    </div>
  );
};

export const AccessibilityPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Accessibilité",
    description:
      "Notre démarche d'accessibilité numérique : niveau de conformité visé, aménagements en place et moyen de nous signaler un obstacle.",
    canonicalPath: "/accessibilite",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs items={[{ label: 'Accueil', href: '/' }, { label: 'Déclaration d\'Accessibilité' }]} />
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-4 text-xs sm:text-sm text-stone-700 leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">{t('legal.legalPages.declarationDAccessibiliteWcag2')}</h1>
        <p>{t('legal.legalPages.shongreSEngageARendre')}</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.legalPages.navigationIntegraleAuClavierAvec')}</li>
          <li>{t('legal.legalPages.contrastesTypographiquesSuperieursAuxRatios')}</li>
          <li>{t('legal.legalPages.labelsEtAttributsAriaSur')}</li>
        </ul>
      </div>
    </div>
  );
};

export const HelpSafetyPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Sécurité & prévention des fraudes",
    description:
      "Reconnaître une arnaque, sécuriser un paiement et acheter ou vendre sereinement sur Shongre.",
    canonicalPath: "/securite",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs items={[{ label: 'Accueil', href: '/' }, { label: 'Centre d\'Aide & Sécurité' }]} />
      <div className="bg-white p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-6 text-xs sm:text-sm text-stone-700 leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">{t('legal.legalPages.conseilsDeSecuriteAntiFraude')}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-danger-surface border border-danger-border text-danger space-y-1">
            <h2 className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-danger" /> Ne payez jamais hors plateforme</h2>
            <p className="text-xs">{t('legal.legalPages.refusezLesVirementsDirectsMandats')}</p>
          </div>
          <div className="p-4 rounded-xl bg-success-surface border border-success-border text-success space-y-1">
            <h2 className="font-bold flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-success" /> {t('legal.legalPages.utilisezLeSequestreShongre')}</h2>
            <p className="text-xs">{t('legal.legalPages.votreArgentEstProtegeJusqu')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DealsPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Bons plans & baisses de prix",
    description:
      "Les annonces dont le prix vient de baisser et les meilleures affaires du moment sur Shongre.",
    canonicalPath: "/bons-plans",
  });

  const deals = storageService.getListings().filter((l) => l.originalPrice && l.originalPrice > l.price);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Accueil', href: '/' }, { label: 'Bons plans & Réductions' }]} />
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-surface border border-warning-border text-warning text-xs font-bold mb-2">
          <Tag className="w-3.5 h-3.5 text-warning" />{t('legal.legalPages.offresVerifieesAPrixReduits')}</div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
          Les meilleures réductions du moment ({deals.length})
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">{t('legal.legalPages.articlesDontLePrixA')}</p>
      </div>

      {/* The card titles are h3, so the results grid needs its own section
          heading rather than jumping straight from the page h1. */}
      <section aria-labelledby="deals-results-heading">
        <h2 id="deals-results-heading" className="sr-only">{t('legal.legalPages.annoncesEnPromotion')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {deals.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </div>
  );
};
