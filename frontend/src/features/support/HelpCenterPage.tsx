import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  HelpCircle,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  CreditCard,
  User,
  Briefcase,
  ChevronDown,
  ArrowRight,
  Headphones,
} from 'lucide-react';
import { Button } from '../../design-system/primitives/Button';

interface HelpArticle {
  id: string;
  category: string;
  question: string;
  answer: string;
  linkText?: string;
  linkHref?: string;
}

const FAQ_ARTICLES: HelpArticle[] = [
  {
    id: 'faq-1',
    category: 'transactions',
    question: 'Comment fonctionne le paiement sécurisé sous séquestre ?',
    answer: 'Lorsque vous achetez ou réservez un article, votre argent n\'est pas directement versé au vendeur. Il est conservé sur un compte de séquestre sécurisé en France. Les fonds ne sont libérés qu\'une fois que vous avez reçu et validé la conformité de l\'article (ou validé le code PIN lors de la remise en main propre).',
    linkText: 'En savoir plus sur la protection Shongre',
    linkHref: '/securite',
  },
  {
    id: 'faq-2',
    category: 'transactions',
    question: 'Quelle est la différence entre l\'achat direct et la réservation ?',
    answer: 'L\'Achat Direct est idéal pour la livraison : vous payez la totalité de la commande + livraison, le vendeur expédie le colis. La Réservation est conçue pour la remise en main propre : vous versez un acompte sous séquestre pour bloquer l\'article, convenez d\'un rendez-vous, puis réglez le solde sur place.',
    linkText: 'Voir mes transactions',
    linkHref: '/compte/achats',
  },
  {
    id: 'faq-3',
    category: 'listings',
    question: 'Combien de temps mon annonce reste-t-elle en ligne ?',
    answer: 'Votre annonce reste active gratuitement pendant 60 jours. Vous recevrez une notification 3 jours avant expiration pour la prolonger gratuitement en 1 clic.',
    linkText: 'Gérer mes annonces',
    linkHref: '/compte/annonces',
  },
  {
    id: 'faq-4',
    category: 'delivery',
    question: 'Comment expédier un colis vendu via Shongre ?',
    answer: 'Une fois la commande payée, téléchargez votre bordereau prépayé (Mondial Relay ou Colissimo) depuis votre espace ventes. Emballez soigneusement l\'article et déposez-le en point relais sous 72 heures.',
    linkText: 'Mes ventes en cours',
    linkHref: '/compte/achats',
  },
  {
    id: 'faq-5',
    category: 'account',
    question: 'Comment faire vérifier mon profil vendeur ?',
    answer: 'Rendez-vous dans « Mon profil » pour vérifier votre numéro de téléphone et votre pièce d\'identité. Le badge vérifié renforce la confiance des acheteurs et accélère vos ventes.',
    linkText: 'Vérifier mon profil',
    linkHref: '/compte/profil',
  },
  {
    id: 'faq-6',
    category: 'pro',
    question: 'Quels sont les avantages d\'un compte professionnel ?',
    answer: 'Les professionnels bénéficient d\'une vitrine personnalisée, d\'un badge Pro certifié avec numéro SIRET, de statistiques avancées, d\'un volume d\'annonces illimité et d\'une facturation avec TVA déductible.',
    linkText: 'Découvrir les offres Pro',
    linkHref: '/solutions-pro',
  },
  {
    id: 'faq-7',
    category: 'safety',
    question: 'Que faire en cas de tentative d\'escroquerie ou de message suspect ?',
    answer: 'Ne communiquez jamais vos coordonnées bancaires, votre mot de passe ou vos codes SMS. Utilisez toujours le bouton « Signaler » présent sur chaque annonce et conversation pour alerter instantanément nos modérateurs.',
    linkText: 'Conseils anti-fraude',
    linkHref: '/securite',
  },
];

export const HelpCenterPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'Toutes les questions', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'transactions', label: 'Paiement & Séquestre', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'listings', label: 'Annonces & Vente', icon: <Tag className="w-4 h-4" /> },
    { id: 'delivery', label: 'Livraison & Retrait', icon: <Truck className="w-4 h-4" /> },
    { id: 'account', label: 'Mon compte', icon: <User className="w-4 h-4" /> },
    { id: 'pro', label: 'Espace Pro', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'safety', label: 'Sécurité & Fraude', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  const filteredArticles = useMemo(() => {
    return FAQ_ARTICLES.filter((article) => {
      const matchCat = selectedCategory === 'all' || article.category === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        article.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      {/* 1. Hero Search Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-light text-primary text-xs font-bold">
          <Headphones className="w-3.5 h-3.5" />
          <span>Centre d'aide Shongre</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
          Comment pouvons-nous vous aider ?
        </h1>
        <p className="text-xs sm:text-sm text-stone-500">
          Retrouvez les réponses aux questions fréquentes sur le séquestre, la livraison, la publication et votre compte.
        </p>

        {/* Search Box */}
        <div className="relative max-w-lg mx-auto pt-2">
          <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 mt-1" />
          <input
            type="text"
            placeholder="Rechercher une question (ex: séquestre, virement, litige...)"
            aria-label="Rechercher une question dans l'aide"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 text-xs sm:text-sm font-semibold bg-white border border-border-base rounded-2xl shadow-xs focus:border-primary focus:outline-none transition-all placeholder:text-stone-400"
          />
        </div>
      </div>

      {/* 2. Topic Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 justify-start sm:justify-center no-scrollbar">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white border border-border-base text-stone-700 hover:bg-stone-50 hover:text-stone-950'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. FAQ Accordion Section */}
      <div className="bg-white rounded-3xl border border-border-base p-6 sm:p-8 shadow-xs space-y-4">
        <h2 className="text-base font-black text-stone-900 mb-2">Questions fréquentes</h2>

        {filteredArticles.length === 0 ? (
          <div className="text-center py-8 text-stone-500 text-xs">
            Aucun article ne correspond à votre recherche. Vous pouvez contacter notre équipe ci-dessous.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {filteredArticles.map((art) => {
              const isOpen = openFaqId === art.id;

              return (
                <div key={art.id} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? null : art.id)}
                    className="w-full flex items-center justify-between gap-4 min-h-6 text-left font-bold text-xs sm:text-sm text-stone-900 hover:text-primary transition-colors cursor-pointer"
                  >
                    <span>{art.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-stone-400 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-primary' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="mt-3 space-y-3 text-xs text-stone-600 leading-relaxed pl-1 animate-fadeIn">
                      <p>{art.answer}</p>
                      {art.linkText && art.linkHref && (
                        <Link
                          to={art.linkHref}
                          className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                        >
                          <span>{art.linkText}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Bottom Contact Support Callout */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-lg sm:text-xl font-black">Vous n'avez pas trouvé votre réponse ?</h3>
          {/* Dark panel: secondary text needs the lighter stone step to stay readable. */}
          <p className="text-xs sm:text-sm text-stone-400 max-w-md">
            Notre équipe de support client basée en France vous assiste 7j/7 pour vos commandes, annonces et questions.
          </p>
        </div>

        <Button
          to="/contact"
          variant="primary"
          size="lg"
          className="shrink-0 font-black"
        >
          Contacter l'assistance Shongre
        </Button>
      </div>
    </div>
  );
};
