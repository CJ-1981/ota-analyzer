// Deterministic seeded PRNG (mulberry32)
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type LogEntry = {
  vehicle_id: string;
  timestamp: string;
  state: string;
  progress: number;
  package_size_mb: number;
  condition: string | null;
};

export type VehiclePath = {
  vehicle_id: string;
  states: Array<{ state: string; progress: number; condition: string | null }>;
};

const STATES = [
  "INITIATED",
  "AUTHENTICATING",
  "DOWNLOADING",
  "VERIFYING",
  "INSTALLING",
  "COMPLETED",
] as const;

const FAILURE_CONDITIONS = [
  "NETWORK_TIMEOUT",
  "DISK_FULL",
  "AUTH_FAILURE",
  "CHECKSUM_MISMATCH",
  "SERVER_ERROR",
] as const;

const NORMAL_FLOW = [
  "INITIATED",
  "AUTHENTICATING",
  "DOWNLOADING",
  "VERIFYING",
  "INSTALLING",
  "COMPLETED",
];

// Map state -> state it returns to after retry
const RETRY_RETURN_STATE: Record<string, string> = {
  DOWNLOADING: "DOWNLOADING",
  VERIFYING: "VERIFYING",
  INSTALLING: "INSTALLING",
  AUTHENTICATING: "AUTHENTICATING",
};

function generateVehiclePath(
  rng: () => number,
  vehicleId: string
): VehiclePath {
  const states: VehiclePath["states"] = [];
  let currentState = "INITIATED";
  let maxAttempts = 1;
  const baseAttempts = rng();

  // Decide outcome: ~70% success, ~20% fail permanently, ~10% abort
  const outcomeRoll = rng();

  if (outcomeRoll < 0.70) {
    // SUCCESS path - may have 0-2 retries before success
    maxAttempts = baseAttempts < 0.5 ? 1 : baseAttempts < 0.85 ? 2 : 3;
  } else if (outcomeRoll < 0.90) {
    // FAIL path - fail permanently after 1-3 attempts
    maxAttempts = baseAttempts < 0.4 ? 1 : baseAttempts < 0.75 ? 2 : 3;
  } else {
    // ABORT path - abort after 1 attempt (during downloading)
    maxAttempts = 1;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      // Add RETRYING state
      states.push({ state: "RETRYING", progress: 0, condition: null });
    }

    // Walk through normal flow
    const willFail =
      outcomeRoll >= 0.70 &&
      (outcomeRoll < 0.90 || attempt === 0);
    const willAbort = outcomeRoll >= 0.90 && attempt === 0;

    // Determine failure state
    const failAtState = willFail
      ? NORMAL_FLOW[Math.floor(rng() * 4) + 1] // fail at AUTH..INSTALL
      : null;

    const failProgress = willFail ? Math.floor(rng() * 20) * 5 : 100; // 0-95%
    const condition =
      willFail || willAbort
        ? FAILURE_CONDITIONS[Math.floor(rng() * FAILURE_CONDITIONS.length)]
        : null;

    for (const s of NORMAL_FLOW) {
      states.push({
        state: s,
        progress: s === "DOWNLOADING" || s === "INSTALLING" ? failProgress : 0,
        condition: null,
      });

      if (s === "COMPLETED" && !willFail && !willAbort) {
        states.push({ state: "COMPLETED", progress: 100, condition: null });
        return { vehicle_id: vehicleId, states };
      }

      if (willAbort && s === "DOWNLOADING") {
        const abortProgress = Math.floor(rng() * 10) * 5; // 0-45%
        states[states.length - 1].progress = abortProgress;
        states.push({ state: "ABORTED", progress: abortProgress, condition });
        return { vehicle_id: vehicleId, states };
      }

      if (willFail && s === failAtState) {
        states[states.length - 1].progress = failProgress;
        states.push({
          state: "FAILED",
          progress: failProgress,
          condition,
        });

        // If we have more attempts, break to start retry
        if (attempt < maxAttempts - 1 && outcomeRoll < 0.90) {
          break;
        } else {
          return { vehicle_id: vehicleId, states };
        }
      }
    }
  }

  return { vehicle_id: vehicleId, states };
}

export function generateData(seed: number = 42): LogEntry[] {
  const rng = mulberry32(seed);
  const numVehicles = 3000;
  const entries: LogEntry[] = [];
  const baseTime = new Date("2025-01-15T08:00:00Z");

  for (let i = 0; i < numVehicles; i++) {
    const vehicleId = `VH-${String(i).padStart(5, "0")}`;
    const path = generateVehiclePath(rng, vehicleId);

    // Random start time within 7 days
    const startOffset = Math.floor(rng() * 7 * 24 * 60 * 60 * 1000);
    let currentTime = new Date(baseTime.getTime() + startOffset);

    for (const step of path.states) {
      // Main state entry
      currentTime = new Date(
        currentTime.getTime() + Math.floor(rng() * 30000 + 5000)
      );
      entries.push({
        vehicle_id: vehicleId,
        timestamp: currentTime.toISOString(),
        state: step.state,
        progress: step.progress,
        package_size_mb: 450 + Math.floor(rng() * 20 - 10),
        condition: step.condition,
      });
    }
  }

  // Sort by timestamp
  entries.sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return entries;
}
