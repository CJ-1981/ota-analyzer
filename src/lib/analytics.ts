import { LogEntry } from "./data-generator";

export type EnrichedEntry = LogEntry & {
  attempt_id: number;
  wasted_data_mb: number;
};

export type KpiMetrics = {
  total_vins: number;
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
  uniqueVinList: string[];
  uniqueStates: string[];
};

// Assign attempt_id: increment per vehicle, reset on RETRYING
function enrichEntries(entries: LogEntry[]): EnrichedEntry[] {
  const vehicleAttempts = new Map<string, number>();

  return entries.map((entry) => {
    let attempt = vehicleAttempts.get(entry.vehicle_id) ?? 1;
    if (entry.state === "RETRYING") {
      attempt++;
      vehicleAttempts.set(entry.vehicle_id, attempt);
    } else {
      vehicleAttempts.set(entry.vehicle_id, attempt);
    }

    const isFailed = entry.state === "FAILED" || entry.state === "ABORTED";
    const wasted_data_mb = isFailed
      ? (entry.progress / 100) * entry.package_size_mb
      : 0;

    return {
      ...entry,
      attempt_id: attempt,
      wasted_data_mb,
    };
  });
}

// Get per-vehicle final state
function getVehicleFinalStates(
  entries: LogEntry[]
): Map<string, { finalState: string; attempts: number }> {
  const vehicleMap = new Map<
    string,
    { finalState: string; maxAttempt: number; retryCount: number }
  >();

  for (const entry of entries) {
    const existing = vehicleMap.get(entry.vehicle_id);
    if (!existing) {
      vehicleMap.set(entry.vehicle_id, {
        finalState: entry.state,
        maxAttempt: 1,
        retryCount: 0,
      });
    } else {
      // Update final state (last seen wins)
      existing.finalState = entry.state;
      if (entry.state === "RETRYING") {
        existing.retryCount++;
      }
    }
  }

  const result = new Map<string, { finalState: string; attempts: number }>();
  for (const [vin, data] of vehicleMap) {
    result.set(vin, {
      finalState: data.finalState,
      attempts: data.retryCount + 1,
    });
  }
  return result;
}

export function computeAnalytics(
  entries: LogEntry[],
  vehicleIdFilter?: string,
  stateFilter?: string
): AnalyticsResult {
  // Apply filters
  let filtered = entries;
  if (vehicleIdFilter) {
    filtered = filtered.filter((e) => e.vehicle_id === vehicleIdFilter);
  }
  if (stateFilter) {
    filtered = filtered.filter((e) => e.state === stateFilter);
  }

  const enriched = enrichEntries(filtered);
  const vehicleFinalStates = getVehicleFinalStates(filtered);
  const uniqueVins = new Set(filtered.map((e) => e.vehicle_id));
  const uniqueStates = [...new Set(entries.map((e) => e.state))].sort();

  // KPI Metrics
  const totalVins = uniqueVins.size;
  let totalRetries = 0;
  let completedCount = 0;

  for (const [, data] of vehicleFinalStates) {
    totalRetries += data.attempts - 1;
    if (data.finalState === "COMPLETED") {
      completedCount++;
    }
  }

  const successRate = totalVins > 0 ? (completedCount / totalVins) * 100 : 0;

  const totalWastedMb = enriched.reduce(
    (sum, e) => sum + e.wasted_data_mb,
    0
  );
  const wastedDataGb = totalWastedMb / 1024;

  // Sankey Diagram: state-to-state transitions
  const transitionCounts = new Map<string, number>();
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Group entries by vehicle
  const byVehicle = new Map<string, LogEntry[]>();
  for (const entry of sortedEntries) {
    if (!vehicleIdFilter || entry.vehicle_id === vehicleIdFilter) {
      const list = byVehicle.get(entry.vehicle_id) || [];
      list.push(entry);
      byVehicle.set(entry.vehicle_id, list);
    }
  }

  for (const [, vehicleEntries] of byVehicle) {
    // Deduplicate consecutive same-state entries, get unique state sequence
    const stateSequence: string[] = [];
    for (const e of vehicleEntries) {
      if (stateSequence.length === 0 || stateSequence[stateSequence.length - 1] !== e.state) {
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

  // Funnel: count vehicles that reached each stage
  const stageOrder = [
    "INITIATED",
    "AUTHENTICATING",
    "DOWNLOADING",
    "VERIFYING",
    "INSTALLING",
    "COMPLETED",
  ];
  const stageReached = new Map<string, number>();

  for (const [, vehicleEntries] of byVehicle) {
    const reached = new Set<string>();
    for (const e of vehicleEntries) {
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
    const dropoffPct = prevCount > 0 ? ((prevCount - count) / prevCount) * 100 : 0;
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
  for (const [, data] of vehicleFinalStates) {
    attemptCounts.set(data.attempts, (attemptCounts.get(data.attempts) || 0) + 1);
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
  const failureEntries = enriched.filter(
    (e) => e.state === "FAILED" || e.state === "ABORTED"
  );
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
    if (e.state === "FAILED" || e.state === "ABORTED") {
      existing.failures += 1;
    }
    if (e.state === "COMPLETED") {
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

  return {
    kpi: {
      total_vins: totalVins,
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
    uniqueVinList: [...uniqueVins].sort(),
    uniqueStates,
  };
}
