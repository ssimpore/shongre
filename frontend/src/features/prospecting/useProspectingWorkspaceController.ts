import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type {
  CrmAccount,
  CrmActivity,
  CrmOpportunity,
  CrmPipeline,
  CrmTask,
  MarketingCampaign,
  MarketingPreflight,
  MarketingSuppression,
} from "@shongre/contracts";
import type {
  LeadSourceDefinition,
  ProspectCandidate,
  ProspectOpportunityBrief,
  ProspectingContext,
  ProspectingProfile,
  ProspectingUsage,
} from "@shongre/contracts/prospecting";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";

export type ProspectingWorkspaceView =
  | "overview"
  | "discover"
  | "companies"
  | "pipeline"
  | "campaigns"
  | "tasks"
  | "sources"
  | "compliance"
  | "usage";

const VIEWS = new Set<ProspectingWorkspaceView>([
  "overview",
  "discover",
  "companies",
  "pipeline",
  "campaigns",
  "tasks",
  "sources",
  "compliance",
  "usage",
]);

const ROUTED_VIEW_PATH: Record<ProspectingWorkspaceView, string> = {
  overview: "",
  discover: "discover",
  companies: "companies",
  pipeline: "pipeline",
  campaigns: "campaigns",
  tasks: "tasks",
  sources: "sources",
  compliance: "settings",
  usage: "billing",
};

function viewFromPathname(
  pathname: string,
  routeBasePath?: string,
): ProspectingWorkspaceView | null {
  if (!routeBasePath) return null;
  const normalizedBase = routeBasePath.replace(/\/$/, "");
  if (
    pathname !== normalizedBase &&
    !pathname.startsWith(`${normalizedBase}/`)
  ) {
    return null;
  }
  const segment = pathname
    .slice(normalizedBase.length)
    .replace(/^\/+|\/+$/g, "");
  return (
    (Object.entries(ROUTED_VIEW_PATH).find(
      ([, path]) => path === segment,
    )?.[0] as ProspectingWorkspaceView | undefined) ?? null
  );
}

function message(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Shongre Prospects est temporairement indisponible.";
}

function deterministicCommandId(value: string): string {
  const words = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35].map((seed) => {
    let hash = seed;
    for (const character of value) {
      hash ^= character.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  });
  const hex = words.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function useProspectingWorkspaceController(
  operatingContext: ProspectingContext = "SUBSCRIBER",
  routeBasePath?: string,
  defaultView: ProspectingWorkspaceView = "overview",
) {
  const { currentUser } = useAuth();
  const { activeMarket, currentLocale, currentCurrency } = useMarketLocation();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const rawView = params.get("view") as ProspectingWorkspaceView | null;
  const queryParam = params.get("q") || "";
  const routedView = viewFromPathname(location.pathname, routeBasePath);
  const view =
    routedView ?? (rawView && VIEWS.has(rawView) ? rawView : defaultView);
  const [query, setQuery] = useState(queryParam);
  const previousQueryParamRef = useRef(queryParam);
  const [profiles, setProfiles] = useState<ProspectingProfile[]>([]);
  const [sources, setSources] = useState<LeadSourceDefinition[]>([]);
  const [usage, setUsage] = useState<ProspectingUsage | null>(null);
  const [candidates, setCandidates] = useState<ProspectCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  );
  const [brief, setBrief] = useState<ProspectOpportunityBrief | null>(null);
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [suppressions, setSuppressions] = useState<MarketingSuppression[]>([]);
  const [campaignPreflights, setCampaignPreflights] = useState<
    Record<string, MarketingPreflight>
  >({});
  const [hasSearched, setHasSearched] = useState(false);
  const [discoverySummary, setDiscoverySummary] = useState<{
    generatedAt: string;
    sourceIds: string[];
    measuredTotal: number;
    query: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshOperations = useCallback(async () => {
    const [
      nextPipelines,
      accountPage,
      opportunityPage,
      taskPage,
      allCampaigns,
    ] = await Promise.all([
      services.crm.listPipelines(),
      services.crm.listAccounts({ limit: 100 }),
      services.crm.listOpportunities({ limit: 100 }),
      services.crm.listTasks({ limit: 100 }),
      services.marketing.listCampaigns(),
    ]);

    const nextAccounts = accountPage.items.filter(
      (account) => account.marketCode === activeMarket.code,
    );
    const accountIds = new Set(nextAccounts.map((account) => account.id));
    const nextOpportunities = opportunityPage.items.filter((opportunity) =>
      opportunity.accountId ? accountIds.has(opportunity.accountId) : false,
    );
    const opportunityIds = new Set(
      nextOpportunities.map((opportunity) => opportunity.id),
    );
    const nextTasks = taskPage.items.filter(
      (task) =>
        (task.accountId ? accountIds.has(task.accountId) : false) ||
        (task.opportunityId ? opportunityIds.has(task.opportunityId) : false),
    );
    const nextCampaigns = allCampaigns.filter(
      (campaign) => campaign.locale === currentLocale,
    );
    const entityQueries = [
      ...nextAccounts.map((account) =>
        services.crm.listActivities("account", account.id, 20),
      ),
      ...nextOpportunities.map((opportunity) =>
        services.crm.listActivities("opportunity", opportunity.id, 20),
      ),
      ...nextTasks.map((task) =>
        services.crm.listActivities("task", task.id, 20),
      ),
    ];
    const [activityGroups, nextSuppressions] = await Promise.all([
      Promise.all(entityQueries),
      services.marketing.listSuppressions(),
    ]);
    const deduplicatedActivities = new Map<string, CrmActivity>();
    activityGroups.flat().forEach((activity) => {
      deduplicatedActivities.set(activity.id, activity);
    });

    setPipelines(nextPipelines);
    setAccounts(nextAccounts);
    setOpportunities(nextOpportunities);
    setTasks(nextTasks);
    setCampaigns(nextCampaigns);
    setSuppressions(nextSuppressions);
    setActivities(
      [...deduplicatedActivities.values()]
        .sort(
          (left, right) =>
            new Date(right.occurredAt).getTime() -
            new Date(left.occurredAt).getTime(),
        )
        .slice(0, 20),
    );
  }, [activeMarket.code, currentLocale, currentUser?.id]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCandidates([]);
    setSelectedCandidateId(null);
    setBrief(null);
    setCampaignPreflights({});
    setHasSearched(false);
    setDiscoverySummary(null);
    try {
      const operationsPromise = refreshOperations();
      const [nextProfiles, nextSources, nextUsage] = await Promise.all([
        services.crmProspecting.listProfiles(),
        services.crmProspecting.listSources(activeMarket.code),
        services.crmProspecting.getUsage(activeMarket.code),
        operationsPromise,
      ]);
      setProfiles(nextProfiles);
      setSources(nextSources);
      setUsage(nextUsage);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, currentUser?.id, refreshOperations]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const queryParamChanged = previousQueryParamRef.current !== queryParam;
    previousQueryParamRef.current = queryParam;
    setQuery(queryParam);
    if (queryParamChanged) {
      setCandidates([]);
      setSelectedCandidateId(null);
      setBrief(null);
      setHasSearched(false);
      setDiscoverySummary(null);
    }
  }, [queryParam]);

  const setView = useCallback(
    (next: string) => {
      if (!VIEWS.has(next as ProspectingWorkspaceView)) return;
      const updated = new URLSearchParams(params);
      if (routeBasePath) {
        updated.delete("view");
        const segment = ROUTED_VIEW_PATH[next as ProspectingWorkspaceView];
        const search = updated.toString();
        navigate(
          {
            pathname: `${routeBasePath.replace(/\/$/, "")}${segment ? `/${segment}` : ""}`,
            search: search ? `?${search}` : "",
          },
          { replace: false },
        );
      } else {
        updated.set("view", next);
        setParams(updated, { replace: true });
      }
    },
    [navigate, params, routeBasePath, setParams],
  );

  const discover = useCallback(
    async (overrideQuery?: string) => {
      const activeQuery = (overrideQuery ?? query).trim();
      setSearching(true);
      setHasSearched(true);
      setDiscoverySummary(null);
      setError(null);
      if (overrideQuery !== undefined) setQuery(overrideQuery);
      const updated = new URLSearchParams(params);
      if (activeQuery) updated.set("q", activeQuery);
      else updated.delete("q");
      // The demo adapter can resolve before React Router commits the URL update.
      // Mark this query as the controller's own navigation so the synchronization
      // effect does not erase the just-returned discovery as if Back/Forward had
      // changed the search externally.
      previousQueryParamRef.current = activeQuery;
      if (routeBasePath) {
        updated.delete("view");
        const search = updated.toString();
        navigate(
          {
            pathname: `${routeBasePath.replace(/\/$/, "")}/discover`,
            search: search ? `?${search}` : "",
          },
          { replace: true },
        );
      } else {
        updated.set("view", "discover");
        setParams(updated, { replace: true });
      }
      try {
        const result = await services.crmProspecting.discover({
          context: operatingContext,
          idempotencyKey: deterministicCommandId(
            [currentUser?.id, activeMarket.code, activeQuery].join(":"),
          ),
          filters: {
            profileId: profiles[0]?.id,
            query: activeQuery || undefined,
            marketCode: activeMarket.code,
            countryCode: activeMarket.countryCode,
            locale: currentLocale,
            currency: currentCurrency,
            timezone: activeMarket.timezone,
            industries: [],
            taxonomySlugs: [],
            companyTypes: [],
            geographicArea: undefined,
            requireWebsite: true,
            sourceIds: sources
              .filter(
                (source) =>
                  source.lifecycle === "ACTIVE" &&
                  source.operations.includes("SEARCH"),
              )
              .map((source) => source.id),
            freshness: ["CURRENT"],
            limit: 25,
          },
        });
        setCandidates(result.items);
        setDiscoverySummary({
          generatedAt: result.generatedAt,
          sourceIds: result.sourceIds,
          measuredTotal: result.measuredTotal,
          query: result.appliedFilters.query ?? "",
        });
        setSelectedCandidateId(null);
        setBrief(null);
        setUsage(await services.crmProspecting.getUsage(activeMarket.code));
      } catch (cause) {
        setCandidates([]);
        setDiscoverySummary(null);
        setSelectedCandidateId(null);
        setError(message(cause));
      } finally {
        setSearching(false);
      }
    },
    [
      activeMarket.code,
      activeMarket.countryCode,
      activeMarket.timezone,
      currentCurrency,
      currentLocale,
      currentUser?.id,
      navigate,
      operatingContext,
      params,
      profiles,
      query,
      routeBasePath,
      setParams,
      sources,
    ],
  );

  const selectCandidate = useCallback(async (candidateId: string | null) => {
    setSelectedCandidateId(candidateId);
    setBrief(null);
    if (!candidateId) return;
    setBriefLoading(true);
    try {
      setBrief(await services.crmProspecting.getOpportunityBrief(candidateId));
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBriefLoading(false);
    }
  }, []);

  const importCandidate = useCallback(
    async (candidate: ProspectCandidate) => {
      setImportingId(candidate.company.id);
      setError(null);
      try {
        const result = await services.crmProspecting.importCandidate({
          companyId: candidate.company.id,
          expectedEvidenceIds: candidate.evidence.map((item) => item.id),
          reviewDecision: "APPROVED",
          idempotencyKey: candidate.company.id.replace(/^./, "f"),
        });
        setCandidates((current) =>
          current.map((item) =>
            item.company.id === candidate.company.id
              ? {
                  ...item,
                  status: "IMPORTED",
                  company: {
                    ...item.company,
                    crmAccountId: result.crmAccountId,
                    reviewState: "APPROVED",
                  },
                }
              : item,
          ),
        );
        await refreshOperations();
        return result;
      } catch (cause) {
        setError(message(cause));
        throw cause;
      } finally {
        setImportingId(null);
      }
    },
    [refreshOperations],
  );

  const moveOpportunity = useCallback(
    async (opportunityId: string, stageId: string) => {
      const opportunity = opportunities.find(
        (item) => item.id === opportunityId,
      );
      if (!opportunity || opportunity.stageId === stageId) return;
      setPendingActionId(opportunityId);
      setError(null);
      try {
        await services.crm.transitionOpportunity(opportunity.id, {
          stageId,
          expectedVersion: opportunity.version,
        });
        await refreshOperations();
      } catch (cause) {
        setError(message(cause));
        throw cause;
      } finally {
        setPendingActionId(null);
      }
    },
    [opportunities, refreshOperations],
  );

  const completeTask = useCallback(
    async (taskId: string) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task || task.status === "completed") return;
      setPendingActionId(taskId);
      setError(null);
      try {
        await services.crm.completeTask(task.id, task.version);
        await refreshOperations();
      } catch (cause) {
        setError(message(cause));
        throw cause;
      } finally {
        setPendingActionId(null);
      }
    },
    [refreshOperations, tasks],
  );

  const checkCampaign = useCallback(async (campaignId: string) => {
    setPendingActionId(campaignId);
    setError(null);
    try {
      const preflight = await services.marketing.preflight(campaignId);
      setCampaignPreflights((current) => ({
        ...current,
        [campaignId]: preflight,
      }));
      return preflight;
    } catch (cause) {
      setError(message(cause));
      throw cause;
    } finally {
      setPendingActionId(null);
    }
  }, []);

  const selectedCandidate = useMemo(
    () =>
      candidates.find((item) => item.company.id === selectedCandidateId) ??
      null,
    [candidates, selectedCandidateId],
  );

  const weightedPipelineMinor = useMemo(
    () =>
      opportunities
        .filter((item) => item.status === "open")
        .reduce(
          (sum, item) =>
            sum +
            Math.round((item.amount.amountMinor * item.probability) / 100),
          0,
        ),
    [opportunities],
  );

  return {
    activeMarket,
    currentLocale,
    currentCurrency,
    view,
    setView,
    query,
    setQuery,
    profiles,
    sources,
    usage,
    candidates,
    selectedCandidate,
    brief,
    accounts,
    pipelines,
    opportunities,
    tasks,
    activities,
    campaigns,
    suppressions,
    campaignPreflights,
    hasSearched,
    discoverySummary,
    weightedPipelineMinor,
    loading,
    searching,
    briefLoading,
    importingId,
    pendingActionId,
    error,
    reload,
    discover,
    selectCandidate,
    importCandidate,
    moveOpportunity,
    completeTask,
    checkCampaign,
  };
}
