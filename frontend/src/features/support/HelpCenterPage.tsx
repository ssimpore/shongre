import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  HelpCircle,
  ShieldCheck,
  Tag,
  Truck,
  CreditCard,
  User,
  Briefcase,
  ChevronDown,
  ArrowRight,
  Headphones,
} from "lucide-react";
import { Button } from "../../design-system/primitives/Button";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";

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
    id: "faq-1",
    category: "transactions",
    question: "Comment fonctionne le paiement en ligne ?",
    answer:
      "Le paiement est traité par Stripe et son avancement est reflété dans la commande. Selon le mode de livraison et le statut transmis par le prestataire, le versement au vendeur peut rester en attente pendant la remise ou l'examen d'un litige. Consultez toujours le statut de la commande avant de remettre l'article.",
    linkText: "En savoir plus sur les paiements",
    linkHref: "/securite",
  },
  {
    id: "faq-2",
    category: "transactions",
    question:
      "Quelle est la différence entre l'achat direct et la réservation ?",
    answer:
      "L'Achat Direct est adapté à la livraison : vous payez la commande et la livraison, puis le vendeur expédie le colis. La Réservation sert à organiser une remise en main propre : les conditions et le montant à payer sont affichés avant toute confirmation.",
    linkText: "Voir mes transactions",
    linkHref: "/compte/achats",
  },
  {
    id: "faq-3",
    category: "listings",
    question: "Combien de temps mon annonce reste-t-elle en ligne ?",
    answer:
      "Votre annonce reste active gratuitement pendant 60 jours. Vous recevrez une notification 3 jours avant expiration pour la prolonger gratuitement en 1 clic.",
    linkText: "Gérer mes annonces",
    linkHref: "/compte/annonces",
  },
  {
    id: "faq-4",
    category: "delivery",
    question: "Comment expédier un colis vendu via Shongre ?",
    answer:
      "Vérifiez d’abord que la commande indique un paiement confirmé. Convenez ensuite du transporteur avec l’acheteur, expédiez le colis avec suivi et renseignez le transporteur ainsi que le numéro de suivi depuis votre espace ventes. Shongre ne fournit pas encore de bordereau prépayé.",
    linkText: "Mes ventes en cours",
    linkHref: "/compte/achats",
  },
  {
    id: "faq-5",
    category: "account",
    question: "Comment faire vérifier mon profil vendeur ?",
    answer:
      "Rendez-vous dans « Mon profil » pour vérifier votre numéro de téléphone et votre pièce d'identité. Le badge vérifié renforce la confiance des acheteurs et accélère vos ventes.",
    linkText: "Vérifier mon profil",
    linkHref: "/compte/profil",
  },
  {
    id: "faq-6",
    category: "pro",
    question: "Quels sont les avantages d'un compte professionnel ?",
    answer:
      "Les professionnels bénéficient d'une vitrine personnalisée, d'un badge Pro certifié avec numéro SIRET, de statistiques avancées, d'un volume d'annonces illimité et d'une facturation avec TVA déductible.",
    linkText: "Découvrir les offres Pro",
    linkHref: "/solutions-pro",
  },
  {
    id: "faq-7",
    category: "safety",
    question:
      "Que faire en cas de tentative d'escroquerie ou de message suspect ?",
    answer:
      "Ne communiquez jamais vos coordonnées bancaires, votre mot de passe ou vos codes SMS. Utilisez toujours le bouton « Signaler » présent sur chaque annonce et conversation pour alerter instantanément nos modérateurs.",
    linkText: "Conseils anti-fraude",
    linkHref: "/securite",
  },
];

export const HelpCenterPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Centre d'aide",
    description:
      "Réponses aux questions les plus fréquentes sur la publication d'annonces, les paiements, la livraison et la sécurité sur Shongre.",
    canonicalPath: "/aide",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const categories = [
    {
      id: "all",
      label: "Toutes les questions",
      icon: <HelpCircle className="w-4 h-4" />,
    },
    {
      id: "transactions",
      label: "Paiements & Remboursements",
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      id: "listings",
      label: "Annonces & Vente",
      icon: <Tag className="w-4 h-4" />,
    },
    {
      id: "delivery",
      label: "Livraison & Retrait",
      icon: <Truck className="w-4 h-4" />,
    },
    { id: "account", label: "Mon compte", icon: <User className="w-4 h-4" /> },
    { id: "pro", label: "Espace Pro", icon: <Briefcase className="w-4 h-4" /> },
    {
      id: "safety",
      label: "Sécurité & Fraude",
      icon: <ShieldCheck className="w-4 h-4" />,
    },
  ];

  const filteredArticles = useMemo(() => {
    return FAQ_ARTICLES.filter((article) => {
      const matchCat =
        selectedCategory === "all" || article.category === selectedCategory;
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
          {t("support.helpCenterPage.commentPouvonsNousVousAider")}
        </h1>
        <p className="text-xs sm:text-sm text-stone-500">
          {t("support.helpCenterPage.retrouvezLesReponsesAuxQuestions")}
        </p>

        {/* Search Box */}
        <div className="relative max-w-lg mx-auto pt-2">
          <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 mt-1" />
          <input
            type="text"
            placeholder={t(
              "support.helpCenterPage.rechercherUneQuestionExSequestre",
            )}
            aria-label={t("support.helpCenterPage.rechercherUneQuestionDansL")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-control-lg pl-12 pr-4 text-xs sm:text-sm font-semibold bg-white border border-border-base rounded-control shadow-xs focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all placeholder:text-stone-400"
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
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-white border border-border-base text-stone-700 hover:bg-stone-50 hover:text-stone-950"
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
        <h2 className="text-base font-black text-stone-900 mb-2">
          {t("support.helpCenterPage.questionsFrequentes")}
        </h2>

        {filteredArticles.length === 0 ? (
          <div className="text-center py-8 text-stone-500 text-xs">
            {t("support.helpCenterPage.aucunArticleNeCorrespondA")}
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
                        isOpen ? "rotate-180 text-primary" : ""
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
          <h3 className="text-lg sm:text-xl font-black">
            {t("support.helpCenterPage.vousNAvezPasTrouve")}
          </h3>
          {/* Dark panel: secondary text needs the lighter stone step to stay readable. */}
          <p className="text-xs sm:text-sm text-stone-400 max-w-md">
            {t("support.helpCenterPage.notreEquipeDeSupportClient")}
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
