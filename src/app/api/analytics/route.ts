import { NextRequest, NextResponse } from "next/server";
import { generateData } from "@/lib/data-generator";
import { computeAnalytics } from "@/lib/analytics";

// In-memory cache for generated data
let cachedData: ReturnType<typeof generateData> | null = null;
let cachedSeed: number | null = null;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const seedParam = searchParams.get("seed");
  const vehicleIdFilter = searchParams.get("vehicle_id") || undefined;
  const stateFilter = searchParams.get("state") || undefined;

  const seed = seedParam ? parseInt(seedParam, 10) : 42;

  // Generate data if seed changed or not cached
  if (!cachedData || cachedSeed !== seed) {
    cachedData = generateData(seed);
    cachedSeed = seed;
  }

  const result = computeAnalytics(cachedData, vehicleIdFilter, stateFilter);

  return NextResponse.json(result);
}
