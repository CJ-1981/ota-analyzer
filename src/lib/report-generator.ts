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

import type { AnalyticsResult } from "./analytics";

export function generateReportHtml(
  data: AnalyticsResult,
  entityLabel: string,
  wasteLabel: string,
  _isCustom: boolean
): string {
  const el = escapeHtml(entityLabel);
  const wl = escapeHtml(wasteLabel);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Multi-State Log Analysis Report</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Playfair Display', Georgia, serif; background: #ffffff; color: #000000; padding: 2rem; }
  h1 { font-size: 2rem; font-weight: 400; margin-bottom: 0.25rem; letter-spacing: -0.3px; }
  h2 { font-size: 0.85rem; margin-top: 2rem; margin-bottom: 1rem; color: #000000; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.5rem; font-family: 'Inter', system-ui, sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
  .subtitle { color: #757575; margin-bottom: 1.5rem; font-family: 'Inter', system-ui, sans-serif; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin-bottom: 2rem; border: 1px solid #e0e0e0; }
  .kpi-card { background: #ffffff; padding: 1.25rem; }
  .kpi-label { font-size: 0.7rem; color: #757575; text-transform: uppercase; letter-spacing: 0.1em; font-family: 'Inter', system-ui, sans-serif; font-weight: 700; }
  .kpi-value { font-size: 1.75rem; font-weight: 400; margin-top: 0.25rem; }
  table { width: 100%; border-collapse: collapse; background: #ffffff; }
  th, td { padding: 0.6rem 0.8rem; text-align: left; border-bottom: 1px solid #e0e0e0; font-size: 0.85rem; font-family: 'Inter', system-ui, sans-serif; }
  th { font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.7rem; color: #757575; }
  .badge { display: inline-block; padding: 2px 8px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .badge-success { background: #f5f5f5; color: #000000; }
  .badge-danger { background: #000000; color: #ffffff; }
  .badge-warning { background: #333333; color: #ffffff; }
  .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e0e0e0; color: #757575; font-size: 0.75rem; font-family: 'Inter', system-ui, sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
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
    <div class="kpi-value">${data.kpi.success_rate}%</div>
  </div>
  <div class="kpi-card">
    <div class="kpi-label">${wl}</div>
    <div class="kpi-value">${data.kpi.wasted_data_gb} GB</div>
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
        `<tr><td>${escapeHtml(e.entity_id)}</td><td>${escapeHtml(e.timestamp)}</td><td>${escapeHtml(e.state)}</td><td>${e.progress}%</td><td>${e.attempt_id}</td><td>${e.condition ? escapeHtml(e.condition) : "—"}</td></tr>`
    )
    .join("")}
</table>

<p class="footer">Report generated by Multi-State Log Analyzer. Total log entries: ${data.filteredEntries.length.toLocaleString()}.</p>
</body>
</html>`;
}
