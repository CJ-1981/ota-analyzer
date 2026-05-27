import type { NormalizedEntry, StateConfig } from "./types";

export type EnrichedEntry = NormalizedEntry & {
  attempt_id: number;
  wasted_data_mb: number;
};

export type KpiMetrics = {
  total_entities: number;
  total_vins: number; // backward compat alias
  total_retries: number;
  success_rate: number;
  wasted_data_gb: number;
};

export type SankeyLink = {
  source: string;
  target: string;
  value: number;
};

export type SankeyData = {
  links: SankeyLink[];
};

export type FunnelStage = {
  stage: string;
  count: number;
  dropoff: number;
  dropoff_pct: number;
};

export type RetryDistribution = {
  attempts: number;
  count: number;
};

export type FailureProgressBucket = {
  range: string;
  count: number;
};

export type WastedByCondition = {
  condition: string;
  wasted_gb: number;
  count: number;
};

export type TimeSeriesPoint = {
  date: string;
  events: number;
  failures: number;
  successes: number;
};

export type AnalyticsResult = {
  kpi: KpiMetrics;
  sankey: SankeyData;
  funnel: FunnelStage[];
  retryDistribution: RetryDistribution[];
  failureProgressBuckets: FailureProgressBucket[];
  wastedByCondition: WastedByCondition[];
  timeSeries: TimeSeriesPoint[];
  filteredEntries: EnrichedEntry[];
  uniqueEntityList: string[];
  uniqueVinList: string[]; // backward compat alias
  uniqueStates: string[];
};

// Default config for backward compatibility with GET endpoint
const DEFAULT_CONFIG: StateConfig = {
  pipelineStates: [
    "INITIATED",
    "AUTHENTICATING",
    "DOWNLOADING",
    "VERIFYING",
    "INSTALLING",
    "COMPLETED",
  ],
  successStates: ["COMPLETED"],
  failureStates: ["FAILED", "ABORTED"],
  retryStates: ["RETRYING"],
  entityLabel: "Vehicle",
  progressLabel: "Progress",
  wasteLabel: "Data Wasted",
};

// Assign attempt_id: increment per entity, reset on retry states
function enrichEntries(
  entries: NormalizedEntry[],
  config: StateConfig
): EnrichedEntry[] {
  const retrySet = new Set(config.retryStates);
  const failureSet = new Set(config.failureStates);
  const entityAttempts = new Map<string, number>();

  return entries.map((entry) => {
    let attempt = entityAttempts.get(entry.entity_id) ?? 1;
    if (retrySet.has(entry.state)) {
      attempt++;
      entityAttempts.set(entry.entity_id, attempt);
    } else {
      entityAttempts.set(entry.entity_id, attempt);
    }

    const isFailed = failureSet.has(entry.state);
    const wasted_data_mb = isFailed
      ? (entry.progress / 100) * entry.size_value
      : 0;

    return {
      ...entry,
      attempt_id: attempt,
      wasted_data_mb,
    };
  });
}

// Get per-entity final state
function getEntityFinalStates(
  entries: NormalizedEntry[],
  config: StateConfig
): Map<string, { finalState: string; attempts: number }> {
  const retrySet = new Set(config.retryStates);
  const entityMap = new Map<
    string,
    { finalState: string; maxAttempt: number; retryCount: number }
  >();

  for (const entry of entries) {
    const existing = entityMap.get(entry.entity_id);
    if (!existing) {
      entityMap.set(entry.entity_id, {
        finalState: entry.state,
        maxAttempt: 1,
        retryCount: 0,
      });
    } else {
      existing.finalState = entry.state;
      if (retrySet.has(entry.state)) {
        existing.retryCount++;
      }
    }
  }

  const result = new Map<string, { finalState: string; attempts: number }>();
  for (const [id, data] of entityMap) {
    result.set(id, {
      finalState: data.finalState,
      attempts: data.retryCount + 1,
    });
  }
  return result;
}

export function computeAnalytics(
  entries: NormalizedEntry[],
  configOrEntityIds?: StateConfig | string[],
  maybeStateFilters?: string[],
  stateFiltersOrUndefined?: string[]
): AnalyticsResult {
  // Support legacy signature: (entries, vehicleIdFilter, stateFilter)
  let config: StateConfig;
  let entityIdFilters: string[] | undefined;
  let stateFilters: string[] | undefined;

  if (Array.isArray(configOrEntityIds)) {
    config = DEFAULT_CONFIG;
    entityIdFilters = configOrEntityIds;
    stateFilters = maybeStateFilters;
  } else {
    config = configOrEntityIds || DEFAULT_CONFIG;
    entityIdFilters = undefined;
    stateFilters = stateFiltersOrUndefined;
  }

  // Apply filters (multi-select: include entries matching ANY selected entity or state)
  let filtered = entries;
  if (entityIdFilters && entityIdFilters.length > 0) {
    const idSet = new Set(entityIdFilters);
    filtered = filtered.filter((e) => idSet.has(e.entity_id));
  }
  if (stateFilters && stateFilters.length > 0) {
    const stateSet = new Set(stateFilters);
    filtered = filtered.filter((e) => stateSet.has(e.state));
  }

  const enriched = enrichEntries(filtered, config);
  const entityFinalStates = getEntityFinalStates(filtered, config);
  const uniqueEntities = new Set(filtered.map((e) => e.entity_id));
  const uniqueStates = [...new Set(entries.map((e) => e.state))].sort();

  const successSet = new Set(config.successStates);
  const failureSet = new Set(config.failureStates);

  // KPI Metrics
  const totalEntities = uniqueEntities.size;
  let totalRetries = 0;
  let completedCount = 0;

  for (const [, data] of entityFinalStates) {
    totalRetries += data.attempts - 1;
    if (successSet.has(data.finalState)) {
      completedCount++;
    }
  }

  const successRate =
    totalEntities > 0 ? (completedCount / totalEntities) * 100 : 0;

  const totalWastedMb = enriched.reduce(
    (sum, e) => sum + e.wasted_data_mb,
    0
  );
  const wastedDataGb = totalWastedMb / 1024;

  // Sankey Diagram: state-to-state transitions
  const transitionCounts = new Map<string, number>();
  const sortedEntries = [...entries].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Group entries by entity
  const byEntity = new Map<string, NormalizedEntry[]>();
  for (const entry of sortedEntries) {
    if (!entityIdFilters || entityIdFilters.length === 0 || entityIdFilters.includes(entry.entity_id)) {
      const list = byEntity.get(entry.entity_id) || [];
      list.push(entry);
      byEntity.set(entry.entity_id, list);
    }
  }

  for (const [, entityEntries] of byEntity) {
    const stateSequence: string[] = [];
    for (const e of entityEntries) {
      if (
        stateSequence.length === 0 ||
        stateSequence[stateSequence.length - 1] !== e.state
      ) {
        stateSequence.push(e.state);
      }
    }

    for (let i = 0; i < stateSequence.length - 1; i++) {
      const key = `${stateSequence[i]}→${stateSequence[i + 1]}`;
      transitionCounts.set(key, (transitionCounts.get(key) || 0) + 1);
    }
  }

  const sankeyLinks: SankeyLink[] = [];
  for (const [key, value] of transitionCounts) {
    const [source, target] = key.split("→");
    sankeyLinks.push({ source, target, value });
  }

  // Funnel: count entities that reached each pipeline stage
  const stageOrder = config.pipelineStates;
  const stageReached = new Map<string, number>();

  for (const [, entityEntries] of byEntity) {
    const reached = new Set<string>();
    for (const e of entityEntries) {
      reached.add(e.state);
    }
    for (const stage of stageOrder) {
      if (reached.has(stage)) {
        stageReached.set(stage, (stageReached.get(stage) || 0) + 1);
      }
    }
  }

  const funnel: FunnelStage[] = [];
  let prevCount = 0;
  for (const stage of stageOrder) {
    const count = stageReached.get(stage) || 0;
    const dropoff = prevCount > 0 ? prevCount - count : 0;
    const dropoffPct =
      prevCount > 0 ? ((prevCount - count) / prevCount) * 100 : 0;
    funnel.push({
      stage,
      count,
      dropoff,
      dropoff_pct: Math.round(dropoffPct * 10) / 10,
    });
    prevCount = count;
  }

  // Retry Distribution
  const attemptCounts = new Map<number, number>();
  for (const [, data] of entityFinalStates) {
    attemptCounts.set(
      data.attempts,
      (attemptCounts.get(data.attempts) || 0) + 1
    );
  }
  const retryDistribution: RetryDistribution[] = [];
  const sortedAttempts = [...attemptCounts.keys()].sort((a, b) => a - b);
  for (const attempts of sortedAttempts) {
    retryDistribution.push({
      attempts,
      count: attemptCounts.get(attempts) || 0,
    });
  }

  // Failure Progress Distribution (histogram)
  const failureEntries = enriched.filter((e) => failureSet.has(e.state));
  const progressBucketCounts = new Map<string, number>();
  for (let p = 0; p <= 95; p += 5) {
    const bucket = `${p}-${p + 4}%`;
    progressBucketCounts.set(bucket, 0);
  }
  for (const e of failureEntries) {
    const bucketKey = `${Math.floor(e.progress / 5) * 5}-${Math.floor(e.progress / 5) * 5 + 4}%`;
    progressBucketCounts.set(
      bucketKey,
      (progressBucketCounts.get(bucketKey) || 0) + 1
    );
  }
  const failureProgressBuckets: FailureProgressBucket[] = [];
  for (const [range, count] of progressBucketCounts) {
    failureProgressBuckets.push({ range, count });
  }

  // Wasted Data by Condition
  const conditionWaste = new Map<
    string,
    { totalWastedMb: number; count: number }
  >();
  for (const e of failureEntries) {
    const cond = e.condition || "UNKNOWN";
    const existing = conditionWaste.get(cond) || {
      totalWastedMb: 0,
      count: 0,
    };
    existing.totalWastedMb += e.wasted_data_mb;
    existing.count += 1;
    conditionWaste.set(cond, existing);
  }

  const wastedByCondition: WastedByCondition[] = [];
  for (const [condition, data] of conditionWaste) {
    wastedByCondition.push({
      condition,
      wasted_gb: Math.round((data.totalWastedMb / 1024) * 100) / 100,
      count: data.count,
    });
  }
  wastedByCondition.sort((a, b) => b.wasted_gb - a.wasted_gb);

  // Time Series (events per day)
  const timeSeriesMap = new Map<
    string,
    { events: number; failures: number; successes: number }
  >();
  for (const e of enriched) {
    const dateStr = e.timestamp.slice(0, 10); // YYYY-MM-DD
    const existing = timeSeriesMap.get(dateStr) || {
      events: 0,
      failures: 0,
      successes: 0,
    };
    existing.events += 1;
    if (failureSet.has(e.state)) {
      existing.failures += 1;
    }
    if (successSet.has(e.state)) {
      existing.successes += 1;
    }
    timeSeriesMap.set(dateStr, existing);
  }

  const timeSeries: TimeSeriesPoint[] = [...timeSeriesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      events: data.events,
      failures: data.failures,
      successes: data.successes,
    }));

  const entityList = [...uniqueEntities].sort();

  return {
    kpi: {
      total_entities: totalEntities,
      total_vins: totalEntities, // backward compat
      total_retries: totalRetries,
      success_rate: Math.round(successRate * 10) / 10,
      wasted_data_gb: Math.round(wastedDataGb * 100) / 100,
    },
    sankey: { links: sankeyLinks },
    funnel,
    retryDistribution,
    failureProgressBuckets,
    wastedByCondition,
    timeSeries,
    filteredEntries: enriched,
    uniqueEntityList: entityList,
    uniqueVinList: entityList, // backward compat
    uniqueStates,
  };
}
