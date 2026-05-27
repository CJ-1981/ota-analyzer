export type ColumnMapping = {
  entityId: string;
  timestamp: string;
  state: string;
  progress?: string;
  sizeField?: string;
  condition?: string;
};

export type StateConfig = {
  pipelineStates: string[];
  successStates: string[];
  failureStates: string[];
  retryStates: string[];
  entityLabel: string;
  progressLabel: string;
  wasteLabel: string;
};

export type AnalyzerConfig = {
  columnMapping: ColumnMapping;
  stateConfig: StateConfig;
};

export type RawDataRow = Record<string, unknown>;

export type NormalizedEntry = {
  entity_id: string;
  timestamp: string;
  state: string;
  progress: number;
  size_value: number;
  condition: string | null;
};

export const DEFAULT_OTA_CONFIG: AnalyzerConfig = {
  columnMapping: {
    entityId: "vehicle_id",
    timestamp: "timestamp",
    state: "state",
    progress: "progress",
    sizeField: "package_size_mb",
    condition: "condition",
  },
  stateConfig: {
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
  },
};
