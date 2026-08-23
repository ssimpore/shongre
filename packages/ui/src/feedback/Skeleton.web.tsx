import React from "react";
import { cn } from "../utils/variants";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: "line" | "control" | "media" | "circle" | "panel";
}

const shapeClasses = {
  line: "h-4 rounded-lg",
  control: "h-control-touch rounded-control",
  media: "aspect-[4/3] rounded-control",
  circle: "aspect-square rounded-full",
  panel: "min-h-32 rounded-card",
} as const;

export const Skeleton: React.FC<SkeletonProps> = ({
  shape,
  className,
  "aria-hidden": ariaHidden = true,
  ...props
}) => (
  <div
    aria-hidden={ariaHidden}
    className={cn(
      "animate-pulse bg-stone-200/80",
      shape && shapeClasses[shape],
      className,
    )}
    {...props}
  />
);

export const ListingCardSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => (
  <div
    aria-hidden="true"
    className={cn(
      "listing-card-skeleton h-listing-card-height space-y-2",
      className,
    )}
  >
    <Skeleton shape="media" className="w-full" />
    <Skeleton shape="line" className="w-3/4" />
    <Skeleton shape="line" className="h-5 w-1/3" />
    <Skeleton shape="line" className="h-3 w-1/2" />
  </div>
);

export const SearchResultsSkeleton: React.FC<{
  count?: number;
  className?: string;
}> = ({ count = 6, className }) => (
  <div
    aria-hidden="true"
    className={cn(
      "listing-grid grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,var(--spacing-listing-card))] sm:justify-start sm:gap-4",
      className,
    )}
  >
    {Array.from({ length: count }, (_, index) => (
      <ListingCardSkeleton key={index} />
    ))}
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 5,
  className,
}) => (
  <div
    aria-hidden="true"
    className={cn("divide-y divide-border-subtle", className)}
  >
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="flex items-center gap-4 py-3.5">
        <Skeleton shape="circle" className="w-8 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton shape="line" className="w-2/5" />
          <Skeleton shape="line" className="h-3 w-3/5" />
        </div>
        <Skeleton shape="line" className="hidden w-24 sm:block" />
      </div>
    ))}
  </div>
);

export const ProfileSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => (
  <div aria-hidden="true" className={cn("flex items-center gap-4", className)}>
    <Skeleton shape="circle" className="w-avatar-xl shrink-0" />
    <div className="min-w-0 flex-1 space-y-2">
      <Skeleton shape="line" className="h-5 w-48 max-w-full" />
      <Skeleton shape="line" className="w-64 max-w-full" />
    </div>
  </div>
);
