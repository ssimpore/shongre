import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  MarketContext,
  TaxonomyV4ListingIntent,
  TaxonomyV4TreeResponse,
} from "@shongre/contracts";
import { services } from "../../api/client/service-registry";
import type { PublicationDraftState } from "../../domains/publication/publication.types";
import {
  buildListingOnboardingModel,
  searchListingOnboardingCategories,
  selectTaxonomyPathNode,
} from "../../domains/publication/publication.onboarding";
import { toTaxonomyV4ListingIntent } from "../../domains/publication/publication.taxonomy-state";

export type ListingOnboardingLoadState =
  "loading" | "ready" | "empty" | "error";

export function useListingOnboardingController(input: {
  marketContext: MarketContext | null;
  locale: string;
  sellerType: "individual" | "professional";
  draft: PublicationDraftState;
  setDraft: Dispatch<SetStateAction<PublicationDraftState>>;
}) {
  const [tree, setTree] = useState<TaxonomyV4TreeResponse | null>(null);
  const [state, setState] = useState<ListingOnboardingLoadState>("loading");
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    if (!input.marketContext || input.marketContext.kind !== "market") {
      setTree(null);
      setState("error");
      setError("MARKET_UNAVAILABLE");
      return () => {
        active = false;
      };
    }
    setTree(null);
    setState("loading");
    setError("");
    void services.taxonomy
      .getV4Tree({
        marketContext: input.marketContext,
        locale: input.locale,
        taxonomyVersion: "4.0.0",
      })
      .then((response) => {
        if (!active) return;
        setTree(response);
        setState(
          response.items.length > 0 && response.listingTypes.length > 0
            ? "ready"
            : "empty",
        );
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setState("error");
        setError(
          reason instanceof Error ? reason.message : "TAXONOMY_UNAVAILABLE",
        );
      });
    return () => {
      active = false;
    };
  }, [input.locale, input.marketContext, retryKey]);

  const model = useMemo(
    () =>
      tree
        ? buildListingOnboardingModel({
            tree,
            intent: toTaxonomyV4ListingIntent(input.draft.listingIntent),
            sellerType: input.sellerType,
            selectedPath: input.draft.taxonomyPath,
            selectedCategoryId: input.draft.taxonomyNodeId,
            locale: input.locale,
          })
        : null,
    [
      input.draft.listingIntent,
      input.draft.taxonomyNodeId,
      input.draft.taxonomyPath,
      input.locale,
      input.sellerType,
      tree,
    ],
  );

  useEffect(() => {
    if (!model || !tree) return;
    const normalizedPath = model.path.map((item) => item.id);
    const currentPath = input.draft.taxonomyPath ?? [];
    const intentAvailable = model.intents.some(
      (option) =>
        option.intent === toTaxonomyV4ListingIntent(input.draft.listingIntent),
    );
    if (!intentAvailable && model.intents[0]) {
      input.setDraft((current) => ({
        ...current,
        listingIntent: model.intents[0].intent,
        taxonomyPath: [],
        taxonomyNodeId: "",
        listingTypeId: undefined,
        taxonomyVersion: undefined,
      }));
      return;
    }
    if (
      normalizedPath.join("|") !== currentPath.join("|") ||
      (input.draft.taxonomyNodeId && !model.isComplete)
    ) {
      input.setDraft((current) => ({
        ...current,
        taxonomyPath: normalizedPath,
        taxonomyNodeId: model.isComplete ? (model.path.at(-1)?.id ?? "") : "",
        listingTypeId: model.selectedListingType?.id,
        taxonomyVersion: model.isComplete ? "4.0.0" : undefined,
      }));
    }
  }, [
    input.draft.listingIntent,
    input.draft.taxonomyNodeId,
    input.draft.taxonomyPath,
    input.setDraft,
    model,
    tree,
  ]);

  const selectIntent = useCallback(
    (intent: TaxonomyV4ListingIntent) => {
      input.setDraft((current) => ({
        ...current,
        listingIntent: intent,
        taxonomyPath: [],
        taxonomyNodeId: "",
        listingTypeId: undefined,
        taxonomyVersion: undefined,
      }));
    },
    [input.setDraft],
  );

  const selectCategory = useCallback(
    (depth: number, nodeId: string) => {
      if (!model || !tree) return false;
      const taxonomyPath = selectTaxonomyPathNode({ model, depth, nodeId });
      const next = buildListingOnboardingModel({
        tree,
        intent: toTaxonomyV4ListingIntent(input.draft.listingIntent),
        sellerType: input.sellerType,
        selectedPath: taxonomyPath,
        locale: input.locale,
      });
      input.setDraft((current) => ({
        ...current,
        taxonomyPath,
        taxonomyNodeId: next.isComplete ? (next.path.at(-1)?.id ?? "") : "",
        listingTypeId: next.selectedListingType?.id,
        taxonomyVersion: next.isComplete ? "4.0.0" : undefined,
      }));
      return next.isComplete;
    },
    [
      input.draft.listingIntent,
      input.locale,
      input.sellerType,
      input.setDraft,
      model,
      tree,
    ],
  );

  const selectSearchResult = useCallback(
    (nodeId: string) => {
      if (!tree) return false;
      const path: string[] = [];
      const byId = new Map(tree.items.map((item) => [item.id, item]));
      let cursor = byId.get(nodeId);
      while (cursor) {
        path.unshift(cursor.id);
        cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
      }
      const next = buildListingOnboardingModel({
        tree,
        intent: toTaxonomyV4ListingIntent(input.draft.listingIntent),
        sellerType: input.sellerType,
        selectedPath: path,
        locale: input.locale,
      });
      input.setDraft((current) => ({
        ...current,
        taxonomyPath: path,
        taxonomyNodeId: next.isComplete ? nodeId : "",
        listingTypeId: next.selectedListingType?.id,
        taxonomyVersion: next.isComplete ? "4.0.0" : undefined,
      }));
      return next.isComplete;
    },
    [
      input.draft.listingIntent,
      input.locale,
      input.sellerType,
      input.setDraft,
      tree,
    ],
  );

  const search = useCallback(
    (query: string) =>
      tree && model
        ? searchListingOnboardingCategories({
            tree,
            model,
            query,
            locale: input.locale,
          })
        : [],
    [input.locale, model, tree],
  );

  return {
    state,
    error,
    tree,
    model,
    retry: () => setRetryKey((value) => value + 1),
    selectIntent,
    selectCategory,
    selectSearchResult,
    search,
  };
}
