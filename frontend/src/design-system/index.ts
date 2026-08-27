/**
 * Canonical public API for Shongre UI infrastructure.
 *
 * Internal Design System files import their direct dependencies to avoid
 * cycles. Features and layouts should prefer this barrel when touching more
 * than one shared UI concept.
 */

// Canonical shared tokens (re-exported for legacy barrel consumers).
export * from "@shongre/design-tokens";

// Foundational primitives
export * from "./primitives/Badge";
export * from "./primitives/BrandIcons";
export * from "./primitives/Button";
export * from "./primitives/DataTable";
export * from "./primitives/DropdownMenu";
export * from "./primitives/FilterChip";
export * from "./primitives/FilterPanel";
export * from "./primitives/FormField";
export * from "./primitives/IconButton";
export * from "./primitives/Icon";
export * from "./primitives/Image";
export * from "./primitives/Layout";
export * from "./primitives/Modal";
export * from "./primitives/Card";
export * from "./primitives/ScrollRail";
export * from "./primitives/ScrollableRegion";
export * from "./primitives/SelectableCard";
export * from "./primitives/SkipLink";
export * from "./primitives/Spinner";
export * from "./primitives/StatePanel";
export * from "./primitives/Typography";

// Shared UI components
export * from "./components/Breadcrumbs";
export * from "./components/Feedback";
export * from "./components/Price";
export * from "./components/Skeleton";
export * from "./components/Tabs";

// Marketplace components and patterns. These retain their stable filenames
// while the public API classifies them above the primitive layer.
export * from "./primitives/CategoryFilterRail";
export * from "./primitives/CategoryIcon";
export * from "./primitives/FavoriteButton";
export * from "./primitives/GlobalSearchBar";
export * from "./primitives/LanguageSelector";
export * from "./primitives/ListingCard";
export * from "./primitives/ListingGrid";
export * from "./primitives/ListingRail";
export * from "./primitives/NoResultsFound";
export * from "./primitives/PriceRangeSlider";
export * from "./primitives/ProgressBar";
export * from "./primitives/PublishCtaButton";
export * from "./primitives/SearchAutocomplete";
export * from "./primitives/SellerCard";
export * from "./primitives/ViewModeToggle";

export * from "./utils/variants";
export * from "./utils/controlMetrics";
