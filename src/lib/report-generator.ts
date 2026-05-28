/* ------------------------------------------------------------------ */
/*  Report Generator — extracted HTML report template                  */
/* ------------------------------------------------------------------ */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

type EnrichedEntry = {
  entity_id: string;
  vehicle_id: string;
  timestamp: string;
  state: string;
  progress: number;
  size_value: number;
  package_size_mb: number;
  condition: string | null;
  attempt_id: number;
  wasted_data_mb: number;
};

type FunnelStage = { stage: string; count: number; dropoff: number; dropoff_pct: number };
type RetryDistribution = { attempts: number; count: number };
type FailureProgressBucket = { range: string; count: number };
type WastedByCondition = { condition: string; wasted_gb: number; count: number };
type TimeSeriesPoint = { date: string; events: number; failures: number; successes: number };

type ReportData = {
  kpi: {
    total_entities: number;
    total_vins: number;
    total_retries: number;
    success_rate: number;
    wasted_data_gb: number;
  };
  funnel: FunnelStage[];
  retryDistribution: RetryDistribution[];
  failureProgressBuckets: FailureProgressBucket[];
  wastedByCondition: WastedByCondition[];
  timeSeries: TimeSeriesPoint[];
  filteredEntries: EnrichedEntry[];
};

export function generateReportHtml(
  data: ReportData,
  entityLabel: string,
  wasteLabel: string,
  isCustom: boolean
): string {
  const el = escapeHtml(entityLabel);
  const wl = escapeHtml(wasteLabel);
  const entityListKey = isCustom ? "entity_id" : "vehicle_id";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Multi-State Log Analysis Report</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f8f8; color: #1a1a1a; padding: 2rem; }
  h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.15rem; margin-top: 2rem; margin-bottom: 1rem; color: #333; border-bottom: 2px solid #e5e5e5; padding-bottom: 0.5rem; }
  .subtitle { color: #666; margin-bottom: 1.5rem; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
  .kpi-card { background: white; border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .kpi-label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
  .kpi-value { font-size: 1.75rem; font-weight: 700; margin-top: 0.25rem; }
  .kpi-value.green { color: #10b981; }
  .kpi-value.amber { color: #f59e0b; }
  table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  th, td { padding: 0.6rem 0.8rem; text-align: left; border-bottom: 1px solid #eee; font-size: 0.85rem; }
  th { background: #f5f5f5; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
  .badge-success { background: #d1fae5; color: #065f46; }
  .badge-danger { background: #fee2e2; color: #991b1b; }
  .badge-warning { background: #fef3c7; color: #92400e; }
  .footer { margin-top: 2rem; color: #999; font-size: 0.8rem; }
</style>
</head>
<body>
<h1>Multi-State Log Analysis &amp; Visualization</h1>
<p class="subtitle">${el} Analytics Report — Generated ${escapeHtml(new Date().toISOString())}</p>

<h2>Key Metrics</h2>
<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-label">Total ${el}s</div>
    <div class="kpi-value">${data.kpi.total_entities.toLocaleString()}</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Total Retries</div>
    <div class="kpi-value">${data.kpi.total_retries.toLocaleString()}</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">Success Rate</div>
    <div class="kpi-value green">${data.kpi.success_rate}%</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">${wl}</div>
    <div class="kpi-value amber">${data.kpi.wasted_data_gb} GB</div>
  </div>
</div>

<h2>Pipeline Funnel</h2>
<table>
  <tr><th>Stage</th><th>${el}s</th><th>Drop-off</th><th>Drop-off %</th></tr>
  ${data.funnel
    .map(
      (f) =>
        `<tr><td>${escapeHtml(f.stage)}</td><td>${f.count.toLocaleString()}</td><td>${f.dropoff > 0 ? f.dropoff.toLocaleString() : "—"}</td><td>${f.dropoff_pct > 0 ? f.dropoff_pct + "%" : "—"}</td></tr>`
    )
    .join("")}
</table>

<h2>Retry Distribution</h2>
<table>
  <tr><th># Attempts</th><th>${el}s</th></tr>
  ${data.retryDistribution
    .map(
      (r) =>
        `<tr><td>${r.attempts}</td><td>${r.count.toLocaleString()}</td></tr>`
    )
    .join("")}
</table>

<h2>${wl} by Condition</h2>
<table>
  <tr><th>Condition</th><th>Wasted (GB)</th><th>Count</th></tr>
  ${data.wastedByCondition
    .map(
      (w) =>
        `<tr><td>${escapeHtml(w.condition)}</td><td>${w.wasted_gb}</td><td>${w.count.toLocaleString()}</td></tr>`
    )
    .join("")}
</table>

<h2>Failure Progress Distribution</h2>
<table>
  <tr><th>Progress Range</th><th>Count</th></tr>
  ${data.failureProgressBuckets
    .map((b) => `<tr><td>${escapeHtml(b.range)}</td><td>${b.count}</td></tr>`)
    .join("")}
</table>

<h2>Time Series (Daily Events)</h2>
<table>
  <tr><th>Date</th><th>Total Events</th><th>Successes</th><th>Failures</th></tr>
  ${data.timeSeries
    .map(
      (t) =>
        `<tr><td>${escapeHtml(t.date)}</td><td>${t.events.toLocaleString()}</td><td>${t.successes.toLocaleString()}</td><td>${t.failures.toLocaleString()}</td></tr>`
    )
    .join("")}
</table>

<h2>Top 100 Log Entries</h2>
<table>
  <tr><th>${el} ID</th><th>Timestamp</th><th>State</th><th>Progress</th><th>Attempt</th><th>Condition</th></tr>
  ${data.filteredEntries
    .slice(0, 100)
    .map(
      (e) =>
        `<tr><td>${escapeHtml(String(e[entityListKey as keyof typeof e] || e.entity_id))}</td><td>${escapeHtml(e.timestamp)}</td><td>${escapeHtml(e.state)}</td><td>${e.progress}%</td><td>${e.attempt_id}</td><td>${e.condition ? escapeHtml(e.condition) : "—"}</td></tr>`
    )
    .join("")}
</table>

<p class="footer">Report generated by Multi-State Log Analyzer. Total log entries: ${data.filteredEntries.length.toLocaleString()}.</p>
</body>
</html>`;
}
