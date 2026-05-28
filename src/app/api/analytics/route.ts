import { NextRequest, NextResponse } from "next/server";
import { generateData } from "@/lib/data-generator";
import { computeAnalytics } from "@/lib/analytics";
import { normalizeData } from "@/lib/data-parser";
import type { AnalyzerConfig, RawDataRow } from "@/lib/types";
import { DEFAULT_OTA_CONFIG } from "@/lib/types";

// In-memory cache for generated data (as normalized entries)
let cachedNormalized: ReturnType<typeof normalizeData> | null = null;
let cachedSeed: number | null = null;
let cachedDataSizeMB: number = 450;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const seedParam = searchParams.get("seed");
  const vehicleIdFilter = searchParams.get("vehicle_id") || undefined;
  const stateFilterParam = searchParams.get("state") || undefined;

  const seed = seedParam ? parseInt(seedParam, 10) : 42;
  const dataSizeParam = searchParams.get("data_size_mb");
  const dataSizeMB = dataSizeParam ? parseFloat(dataSizeParam) : 450;

  // Generate and normalize data if seed or data size changed or not cached
  if (!cachedNormalized || cachedSeed !== seed || cachedDataSizeMB !== dataSizeMB) {
    const rawData = generateData(seed, dataSizeMB);
    // Convert LogEntry[] → RawDataRow[] then normalize
    const rawRows: RawDataRow[] = rawData.map((entry) => ({
      vehicle_id: entry.vehicle_id,
      timestamp: entry.timestamp,
      state: entry.state,
      progress: entry.progress,
      package_size_mb: entry.package_size_mb,
      condition: entry.condition,
    }));
    cachedNormalized = normalizeData(rawRows, DEFAULT_OTA_CONFIG.columnMapping);
    cachedSeed = seed;
    cachedDataSizeMB = dataSizeMB;
  }

  // Parse comma-separated filters into arrays
  const entityIdFilters = vehicleIdFilter ? vehicleIdFilter.split(",") : undefined;
  const stateFilters = stateFilterParam ? stateFilterParam.split(",") : undefined;

  const result = computeAnalytics(
    cachedNormalized,
    DEFAULT_OTA_CONFIG.stateConfig,
    entityIdFilters,
    stateFilters
  );

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, data, filters } = body as {
      config: AnalyzerConfig;
      data: RawDataRow[];
      filters?: { entity_ids?: string[]; states?: string[] };
    };

    if (!config || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "Missing config or data in request body" },
        { status: 400 }
      );
    }

    const normalized = normalizeData(data, config.columnMapping);
    const result = computeAnalytics(
      normalized,
      config.stateConfig,
      filters?.entity_ids,
      filters?.states
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing analytics POST:", error);
    return NextResponse.json(
      { error: "Failed to process analytics request" },
      { status: 500 }
    );
  }
}
