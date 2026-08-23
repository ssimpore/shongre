import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { ScrollRail } from "../../../design-system/primitives/ScrollRail";
import { Image } from "../../../design-system/primitives/Image";
import { useTranslation } from "../../../i18n/I18nProvider";
import type { MessageKey } from "../../../i18n/messages.fr";
import { HomeSectionHeading } from "./HomeSectionHeading";
import { routes } from "../../../configuration/routes";

interface TrendingCollectionItem {
  id: string;
  titleKey: MessageKey;
  imageUrl: string;
  to: string;
}

const TRENDING_COLLECTIONS: TrendingCollectionItem[] = [
  {
    id: "piece-manquante",
    titleKey: "home.homeCollectionsSection.laPieceManquante",
    imageUrl:
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80",
    to: routes.search({ query: "jante roue pièce auto" }),
  },
  {
    id: "velo-famille",
    titleKey: "home.homeCollectionsSection.aVeloEnFamille",
    imageUrl:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80",
    to: routes.search({ category: "velos" }),
  },
  {
    id: "amenagez-exterieur",
    titleKey: "home.homeCollectionsSection.amenagezVotreExterieur",
    imageUrl:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
    to: routes.search({ category: "maison-deco" }),
  },
  {
    id: "petit-plongeon",
    titleKey: "home.homeCollectionsSection.unPetitPlongeon",
    imageUrl:
      "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=800&q=80",
    to: routes.search({ query: "piscine bouée été" }),
  },
  {
    id: "de-l-air",
    titleKey: "home.homeCollectionsSection.deLAir",
    imageUrl:
      "https://images.unsplash.com/photo-1565151443833-29bf2b583c19?auto=format&fit=crop&w=800&q=80",
    to: routes.search({ query: "ventilateur climatiseur" }),
  },
];

function CollectionArtworkFallback(): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      data-collection-fallback="true"
      className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-light via-bg-surface to-bg-muted"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-pill border border-primary-border/60 bg-bg-surface/80 text-primary shadow-xs">
        <Sparkles className="h-8 w-8" aria-hidden="true" />
      </span>
    </div>
  );
}

function CollectionCard({
  item,
  title,
}: {
  item: TrendingCollectionItem;
  title: string;
}): React.ReactElement {
  const [imageFailed, setImageFailed] = React.useState(false);

  return (
    <Link
      to={item.to}
      data-collection-id={item.id}
      className="group relative flex aspect-[4/5] w-collection-card shrink-0 snap-start flex-col justify-end overflow-hidden rounded-control border border-border-base bg-stone-900 shadow-2xs motion-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary hover:shadow-lg active:scale-95 sm:w-collection-card-wide sm:rounded-card md:w-auto"
    >
      <div data-collection-artwork="true" className="absolute inset-0">
        {imageFailed ? (
          <CollectionArtworkFallback />
        ) : (
          <Image
            src={item.imageUrl}
            alt={title}
            sizes="(max-width: 640px) 160px, (max-width: 1024px) 240px, 260px"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 h-full w-full object-cover motion-surface group-hover:scale-105"
          />
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent" />
      <div className="relative z-raised p-3.5 text-left sm:p-4">
        <span className="block text-sm font-bold leading-snug text-white drop-shadow-xs sm:text-base">
          {title}
        </span>
      </div>
    </Link>
  );
}

export const HomeCollectionsSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section
      className="mx-auto max-w-page px-4 sm:px-6 lg:px-8"
      aria-labelledby="home-collections-title"
    >
      <div className="mb-4 sm:mb-6">
        <HomeSectionHeading id="home-collections-title">
          {t("home.homeCollectionsSection.tendanceEnCeMoment")}
        </HomeSectionHeading>
      </div>

      <ScrollRail
        label={t("home.homeCollectionsSection.tendanceEnCeMoment")}
        snap
        className="-mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible"
      >
        <div className="flex min-w-max gap-3 sm:gap-4 md:grid md:min-w-0 md:grid-cols-5">
          {TRENDING_COLLECTIONS.map((item) => (
            <CollectionCard
              key={item.id}
              item={item}
              title={t(item.titleKey)}
            />
          ))}
        </div>
      </ScrollRail>
    </section>
  );
};
