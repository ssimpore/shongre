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
export * from "./primitives/BrandLogo";
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
export * from "./primitives/PageHeader";
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
export * from "./components/StaffBadge";
export * from "./components/LocationSelector";
export * from "./components/OnboardingPreparationPage";
export * from "./components/Price";
export * from "./components/SellerAvatarWithPresence";
export * from "./components/SellerIdentityLink";
export * from "./components/Skeleton";
export * from "./components/Tabs";

// Marketplace components and patterns. These retain their stable filenames
// while the public API classifies them above the primitive layer.
/* `CategoryFilterRail` and `ListingCard` are deliberately NOT re-exported here.
 *
 * The original reason was a bundle incident: the rail statically imported
 * `domains/taxonomy/taxonomy.data`, whose module scope eagerly built the
 * taxonomy projection from a ~616 KiB gzip generated bundle. Because that
 * evaluation was a module side effect the bundler could not drop it, so
 * re-exporting the rail pulled the whole taxonomy into the initial client
 * bundle of every route touching the design system — including /connexion.
 *
 * That specific hazard is gone: `taxonomy.data` no longer exists, and the rail
 * now imports only `taxonomy.labels` (a ~1.7 KB pure formatter). The exclusion
 * stands on the narrower rule it established — a barrel plus one side-effectful
 * module is enough to defeat tree-shaking for the entire app, so route-owned
 * components are imported by path and the cost lands on that route alone:
 *   import { CategoryFilterRail } from "@/design-system/primitives/CategoryFilterRail";
 *
 * `ListingCard` follows the same rule: its adapter hydrates the card
 * projection and localized pricing, which routes without listings should not
 * pay for.
 */
export * from "./primitives/CategoryIcon";
export * from "./primitives/CountryFlag";
export * from "./primitives/FavoriteButton";
export * from "./primitives/GlobalSearchBar";
export * from "./primitives/LanguageSelector";
export * from "./primitives/ListingGrid";
export * from "./primitives/ListingRail";
export * from "./primitives/NoResultsFound";
export * from "./primitives/PriceRangeSlider";
export * from "./primitives/ProgressBar";
export * from "./primitives/PublishCtaButton";
export * from "./primitives/SearchAutocomplete";
export * from "./primitives/SearchPageControls";
export * from "./primitives/SearchMapResultsLayout";
export * from "./primitives/SellerCard";
export * from "./primitives/ViewModeToggle";

export * from "./utils/variants";
export * from "./utils/controlMetrics";
