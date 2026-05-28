// Pre-generate sample OTA data at build time
// Output: public/sample-logs.json (raw data for table)
//         public/sample-analytics.json (pre-computed analytics for charts/KPIs)
import { generateData } from "../src/lib/data-generator.ts";
import { normalizeData } from "../src/lib/data-parser.ts";
import { computeAnalytics } from "../src/lib/analytics.ts";
import { DEFAULT_OTA_CONFIG } from "../src/lib/types.ts";
import { writeFileSync, mkdirSync } from "fs";

const seed = 42;
const dataSizeMB = 450;

const rawData = generateData(seed, dataSizeMB);

// 1. Compact raw data for table filtering/sorting
const headers = ["vehicle_id", "timestamp", "state", "progress", "package_size_mb", "condition"];
const compactRows: unknown[][] = rawData.map((e) => {
  const row: unknown[] = [e.vehicle_id, e.timestamp, e.state, e.progress, e.package_size_mb];
  if (e.condition) row.push(e.condition);
  return row;
});
const sampleLogs = { h: headers, d: compactRows };

// 2. Pre-computed analytics (without filteredEntries — those come from raw data)
const rawRows = rawData.map((e) => ({
  vehicle_id: e.vehicle_id,
  timestamp: e.timestamp,
  state: e.state,
  progress: e.progress,
  package_size_mb: e.package_size_mb,
  condition: e.condition,
}));
const normalized = normalizeData(rawRows, DEFAULT_OTA_CONFIG.columnMapping);
const fullResult = computeAnalytics(normalized, DEFAULT_OTA_CONFIG.stateConfig);

// Save analytics without heavy filteredEntries
const { filteredEntries, ...analytics } = fullResult;
const sampleAnalytics = analytics;

mkdirSync("public", { recursive: true });
writeFileSync("public/sample-logs.json", JSON.stringify(sampleLogs), "utf-8");
writeFileSync("public/sample-analytics.json", JSON.stringify(sampleAnalytics), "utf-8");

console.log(`Generated sample data:`);
console.log(`  sample-logs.json: ${rawData.length} entries`);
console.log(`  sample-analytics.json: KPIs, sankey, funnel, timeSeries, etc.`);
