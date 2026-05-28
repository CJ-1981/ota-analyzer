import { generateData } from "../src/lib/data-generator.ts";
import { normalizeData } from "../src/lib/data-parser.ts";
import { computeAnalytics } from "../src/lib/analytics.ts";
import { DEFAULT_OTA_CONFIG } from "../src/lib/types.ts";

const t0 = performance.now();
const rawData = generateData(42, 450);
const rawRows = rawData.map(e => ({ vehicle_id: e.vehicle_id, timestamp: e.timestamp, state: e.state, progress: e.progress, package_size_mb: e.package_size_mb, condition: e.condition }));
console.log(`Generate+map: ${(performance.now()-t0).toFixed(0)}ms, ${rawRows.length} rows`);

const t1 = performance.now();
const normalized = normalizeData(rawRows, DEFAULT_OTA_CONFIG.columnMapping);
console.log(`Normalize: ${(performance.now()-t1).toFixed(0)}ms`);

const t2 = performance.now();
const result = computeAnalytics(normalized, DEFAULT_OTA_CONFIG.stateConfig);
console.log(`ComputeAnalytics: ${(performance.now()-t2).toFixed(0)}ms`);
console.log(`Total: ${(performance.now()-t0).toFixed(0)}ms`);
console.log(`Filtered entries: ${result.filteredEntries.length}`);
