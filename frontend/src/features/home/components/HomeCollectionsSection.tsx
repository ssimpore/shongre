import React from 'react';
import { Link } from 'react-router-dom';
import { ScrollRail } from '../../../design-system/primitives/ScrollRail';
import { Image } from '../../../design-system/primitives/Image';
import { useTranslation } from '../../../i18n/I18nProvider';
import type { MessageKey } from '../../../i18n/messages.fr';

interface TrendingCollectionItem {
  id: string;
  titleKey: MessageKey;
  defaultTitle: string;
  imageUrl: string;
  to: string;
}

const TRENDING_COLLECTIONS: TrendingCollectionItem[] = [
  {
    id: 'piece-manquante',
    titleKey: 'home.homeCollectionsSection.laPieceManquante',
    defaultTitle: 'La pièce manquante',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
    to: '/recherche?q=jante+roue+piece+auto',
  },
  {
    id: 'velo-famille',
    titleKey: 'home.homeCollectionsSection.aVeloEnFamille',
    defaultTitle: 'À vélo en famille',
    imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
    to: '/recherche?category=velos',
  },
  {
    id: 'amenagez-exterieur',
    titleKey: 'home.homeCollectionsSection.amenagezVotreExterieur',
    defaultTitle: 'Aménagez votre extérieur',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
    to: '/recherche?category=maison-deco',
  },
  {
    id: 'petit-plongeon',
    titleKey: 'home.homeCollectionsSection.unPetitPlongeon',
    defaultTitle: 'Un petit plongeon ?',
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=800&q=80',
    to: '/recherche?q=piscine+bouee+ete',
  },
  {
    id: 'de-l-air',
    titleKey: 'home.homeCollectionsSection.deLAir',
    defaultTitle: 'De l\'air !',
    imageUrl: 'https://images.unsplash.com/photo-1565151443833-29bf2b583c19?auto=format&fit=crop&w=800&q=80',
    to: '/recherche?q=ventilateur+climatiseur',
  },
];

export const HomeCollectionsSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      aria-labelledby="home-collections-title"
    >
      {/* Section Header */}
      <div className="mb-4 sm:mb-5">
        <h2
          id="home-collections-title"
          className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight"
        >
          {t('home.homeCollectionsSection.tendanceEnCeMoment')}
        </h2>
      </div>

      {/* Trending Collections Grid / Rail */}
      <ScrollRail
        label={t('home.homeCollectionsSection.tendanceEnCeMoment')}
        snap
        className="-mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible"
      >
        <div className="flex gap-3 sm:gap-4 md:grid md:grid-cols-5 min-w-max md:min-w-0">
          {TRENDING_COLLECTIONS.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className="group relative flex flex-col justify-end w-[155px] sm:w-[190px] md:w-auto aspect-[4/5] shrink-0 snap-start rounded-xl sm:rounded-2xl overflow-hidden bg-stone-900 border border-stone-200/80 shadow-2xs hover:shadow-lg transition-all duration-300 active:scale-[0.98]"
            >
              {/* Full background image with hover zoom */}
              <Image
                src={item.imageUrl}
                alt={t(item.titleKey)}
                sizes="(max-width: 640px) 160px, (max-width: 1024px) 240px, 260px"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />

              {/* Bottom gradient vignette for high text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent pointer-events-none" />

              {/* Title overlay at bottom */}
              <div className="relative z-10 p-3.5 sm:p-4 text-left">
                <span className="text-sm sm:text-base font-bold text-white leading-snug drop-shadow-xs block">
                  {t(item.titleKey)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </ScrollRail>
    </section>
  );
};
