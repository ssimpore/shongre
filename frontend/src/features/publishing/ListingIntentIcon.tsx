import type { TaxonomyV4ListingIntent } from "@shongre/contracts";
import {
  ArrowLeftRight,
  BriefcaseBusiness,
  CalendarCheck,
  CircleDollarSign,
  Gift,
  GraduationCap,
  KeyRound,
  MapPinHouse,
  Megaphone,
  MessageCircleQuestion,
  Search,
  Store,
  UserSearch,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const LISTING_INTENT_ICON_MAP: Record<
  TaxonomyV4ListingIntent,
  LucideIcon
> = {
  SELL: CircleDollarSign,
  WANTED: Search,
  DONATE: Gift,
  EXCHANGE: ArrowLeftRight,
  RENT_OUT: KeyRound,
  RENT_SEEK: MapPinHouse,
  SERVICE_REQUEST: MessageCircleQuestion,
  SERVICE_OFFER: Wrench,
  NOTICE: Megaphone,
  BOOK: CalendarCheck,
  COURSE_OFFER: GraduationCap,
  JOB_OFFER: BriefcaseBusiness,
  BUSINESS_SALE: Store,
  JOB_SEEK: UserSearch,
};

interface ListingIntentIconProps {
  intent: TaxonomyV4ListingIntent;
  className?: string;
}

export function ListingIntentIcon({
  intent,
  className,
}: ListingIntentIconProps) {
  const Icon = LISTING_INTENT_ICON_MAP[intent];

  return (
    <Icon
      className={className}
      aria-hidden="true"
      focusable="false"
      data-listing-intent-icon={intent}
    />
  );
}
