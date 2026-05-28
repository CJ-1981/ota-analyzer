"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Activity,
  RotateCcw,
  HardDrive,
  Download,
  Filter,
  RefreshCw,
  AlertTriangle,
  Car,
  CheckCircle2,
  TrendingDown,
  Clock,
  Upload,
  FileSpreadsheet,
  Settings,
  X,
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Play,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import type {
  AnalyzerConfig,
  ColumnMapping,
  StateConfig,
  RawDataRow,
} from "@/lib/types";
import { DEFAULT_OTA_CONFIG } from "@/lib/types";
import { parseFile, autoDetectColumns, normalizeData } from "@/lib/data-parser";
import { generateData } from "@/lib/data-generator";
import { computeAnalytics, type AnalyticsResult } from "@/lib/analytics";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
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

type SankeyLink = { source: string; target: string; value: number };
type FunnelStage = { stage: string; count: number; dropoff: number; dropoff_pct: number };
type RetryDistribution = { attempts: number; count: number };
type FailureProgressBucket = { range: string; count: number };
type WastedByCondition = { condition: string; wasted_gb: number; count: number };
type TimeSeriesPoint = { date: string; events: number; failures: number; successes: number };

type AnalyticsData = {
  kpi: {
    total_entities: number;
    total_vins: number;
    total_retries: number;
    success_rate: number;
    wasted_data_gb: number;
  };
  sankey: { links: SankeyLink[] };
  funnel: FunnelStage[];
  retryDistribution: RetryDistribution[];
  failureProgressBuckets: FailureProgressBucket[];
  wastedByCondition: WastedByCondition[];
  timeSeries: TimeSeriesPoint[];
  filteredEntries: EnrichedEntry[];
  uniqueEntityList: string[];
  uniqueVinList: string[];
  uniqueStates: string[];
};

/* ------------------------------------------------------------------ */
/*  Color helpers                                                      */
/* ------------------------------------------------------------------ */
const STATE_COLORS: Record<string, string> = {
  INITIATED: "#6366f1",
  AUTHENTICATING: "#8b5cf6",
  DOWNLOADING: "#3b82f6",
  VERIFYING: "#06b6d4",
  INSTALLING: "#f59e0b",
  COMPLETED: "#10b981",
  FAILED: "#ef4444",
  RETRYING: "#f97316",
  ABORTED: "#ec4899",
};

const CHART_PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#3b82f6",
  "#06b6d4",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#a855f7",
  "#eab308",
];

function getStateColor(state: string): string {
  if (STATE_COLORS[state]) return STATE_COLORS[state];
  const colors = [
    "#6366f1", "#8b5cf6", "#3b82f6", "#06b6d4", "#f59e0b",
    "#10b981", "#ef4444", "#f97316", "#ec4899", "#14b8a6",
    "#a855f7", "#eab308",
  ];
  let hash = 0;
  for (let i = 0; i < state.length; i++)
    hash = state.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getStateBadgeClass(state: string): string {
  const map: Record<string, string> = {
    INITIATED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
    AUTHENTICATING: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
    DOWNLOADING: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    VERIFYING: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
    INSTALLING: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    FAILED: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    RETRYING: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    ABORTED: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  };
  if (map[state]) return map[state];
  const classes = [
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
    "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
    "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  ];
  let hash = 0;
  for (let i = 0; i < state.length; i++)
    hash = state.charCodeAt(i) + ((hash << 5) - hash);
  return classes[Math.abs(hash) % classes.length];
}

/* ------------------------------------------------------------------ */
/*  State badge component                                               */
/* ------------------------------------------------------------------ */
function StateBadge({ state }: { state: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${getStateBadgeClass(state)}`}
    >
      {state}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Tag Input Component (for state lists)                              */
/* ------------------------------------------------------------------ */
function TagInput({
  values,
  onChange,
  placeholder,
  reorderable,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  reorderable?: boolean;
}) {
  const [inputVal, setInputVal] = useState("");

  const addTag = () => {
    const trimmed = inputVal.trim().toUpperCase();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInputVal("");
  };

  const removeTag = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  const moveTag = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= values.length) return;
    const arr = [...values];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    onChange(arr);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, idx) => (
          <span
            key={v}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${getStateBadgeClass(v)}`}
          >
            {reorderable && (
              <>
                <button
                  type="button"
                  onClick={() => moveTag(idx, -1)}
                  className="hover:bg-black/10 rounded p-0.5"
                  disabled={idx === 0}
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveTag(idx, 1)}
                  className="hover:bg-black/10 rounded p-0.5"
                  disabled={idx === values.length - 1}
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </>
            )}
            {v}
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="hover:bg-black/10 rounded p-0.5 ml-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="h-8 text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTag}
          className="h-8 px-2"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sankey-like Flow Diagram                                           */
/* ------------------------------------------------------------------ */
function FlowDiagram({
  links,
  stateOrder,
  entityLabel,
}: {
  links: SankeyLink[];
  stateOrder: string[];
  entityLabel: string;
}) {
  const sourceMap = new Map<string, Map<string, number>>();
  const validSources = new Set(stateOrder);

  for (const link of links) {
    if (!validSources.has(link.source)) continue;
    if (!sourceMap.has(link.source))
      sourceMap.set(link.source, new Map());
    const targets = sourceMap.get(link.source)!;
    targets.set(link.target, (targets.get(link.target) || 0) + link.value);
  }

  const chartData = stateOrder
    .filter((s) => sourceMap.has(s))
    .map((source) => {
      const targets = sourceMap.get(source)!;
      const item: Record<string, string | number> = { source };
      for (const [target, value] of targets) {
        item[target] = value;
      }
      return item;
    });

  const allTargets = new Set<string>();
  for (const link of links) {
    if (validSources.has(link.source)) allTargets.add(link.target);
  }
  const targetList = [...allTargets].sort(
    (a, b) => stateOrder.indexOf(a) - stateOrder.indexOf(b)
  );

  return (
    <Card className="p-4 gap-4">
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-base">State Transition Flow</CardTitle>
        <CardDescription>
          Horizontal stacked view of state-to-state transitions
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 20, right: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis
              dataKey="source"
              type="category"
              width={110}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--background))",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number, name: string) => [
                `${value.toLocaleString()} ${entityLabel.toLowerCase()}s`,
                `→ ${name}`,
              ]}
            />
            <Legend />
            {targetList.map((target) => (
              <Bar
                key={target}
                dataKey={target}
                stackId="a"
                fill={getStateColor(target)}
                name={target}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Funnel Chart                                                       */
/* ------------------------------------------------------------------ */
function FunnelChart({
  data,
  entityLabel,
}: {
  data: FunnelStage[];
  entityLabel: string;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const chartData = data.map((d) => ({
    ...d,
    width_pct: ((d.count / maxCount) * 100).toFixed(1),
  }));

  return (
    <Card className="p-4 gap-4">
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-base">Pipeline Funnel</CardTitle>
        <CardDescription>
          {entityLabel} progression through stages
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2">
          {chartData.map((item, idx) => (
            <div key={item.stage} className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground w-28 text-right shrink-0 truncate">
                {item.stage}
              </span>
              <div className="flex-1">
                <div
                  className="h-8 rounded-md flex items-center justify-end px-2 transition-all"
                  style={{
                    width: `${Math.max(Number(item.width_pct), 8)}%`,
                    backgroundColor: CHART_PALETTE[idx] || "#888",
                    opacity: 0.85,
                  }}
                >
                  <span className="text-xs font-semibold text-white">
                    {item.count.toLocaleString()}
                  </span>
                </div>
              </div>
              {item.dropoff > 0 && (
                <span className="text-xs text-rose-500 shrink-0 w-20 text-right">
                  -{item.dropoff.toLocaleString()} ({item.dropoff_pct}%)
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Column Mapping Selector                                            */
/* ------------------------------------------------------------------ */
function ColumnMappingSelector({
  columns,
  mapping,
  onChange,
}: {
  columns: string[];
  mapping: ColumnMapping;
  onChange: (m: ColumnMapping) => void;
}) {
  const colOptions = [
    { label: "Entity ID Column", key: "entityId" as const, optional: false },
    { label: "Timestamp Column", key: "timestamp" as const, optional: false },
    { label: "State Column", key: "state" as const, optional: false },
    { label: "Progress Column", key: "progress" as const, optional: true },
    { label: "Size Column", key: "sizeField" as const, optional: true },
    { label: "Condition Column", key: "condition" as const, optional: true },
  ];

  const set = (key: keyof ColumnMapping, val: string) => {
    onChange({ ...mapping, [key]: val === "__none__" ? undefined : val });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {colOptions.map((opt) => (
        <div key={opt.key} className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {opt.label}
            {opt.optional && (
              <span className="text-muted-foreground/60 ml-1">(optional)</span>
            )}
          </Label>
          <Select
            value={mapping[opt.key] || "__none__"}
            onValueChange={(v) => set(opt.key, v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— not mapped —</SelectItem>
              {columns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Dashboard                                                     */
/* ------------------------------------------------------------------ */
export default function Home() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seed, setSeed] = useState(42);
  const [entityFilter, setEntityFilter] = useState<string[]>([]);
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Table column sort & filter
  type SortKey = "entity_id" | "timestamp" | "state" | "progress" | "attempt_id" | "condition";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [colFilters, setColFilters] = useState<Record<SortKey, string>>({
    entity_id: "",
    timestamp: "",
    state: "",
    progress: "",
    attempt_id: "",
    condition: "",
  });

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("asc");
      return key;
    });
    setPage(0);
  }, []);

  const handleColFilter = useCallback((key: SortKey, value: string) => {
    setColFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }, []);

  // Config mode
  const [mode, setMode] = useState<"demo" | "custom">("demo");
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState<AnalyzerConfig>({
    ...DEFAULT_OTA_CONFIG,
    stateConfig: { ...DEFAULT_OTA_CONFIG.stateConfig },
    columnMapping: { ...DEFAULT_OTA_CONFIG.columnMapping },
  });
  const [dataSizeMB, setDataSizeMB] = useState<number>(450);
  const [uploadedData, setUploadedData] = useState<RawDataRow[] | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Derived labels
  const entityLabel = config.stateConfig.entityLabel;
  const wasteLabel = config.stateConfig.wasteLabel;
  const progressLabel = config.stateConfig.progressLabel;
  const isCustom = mode === "custom" && uploadedData !== null;

  // All known states for flow diagram ordering
  const allKnownStates = useMemo(() => {
    if (!data) return config.stateConfig.pipelineStates;
    const stateSet = new Set<string>();
    for (const s of data.uniqueStates) stateSet.add(s);
    // Ensure pipeline states are first, then any extra states
    const ordered = [...config.stateConfig.pipelineStates];
    for (const s of data.uniqueStates) {
      if (!ordered.includes(s)) ordered.push(s);
    }
    return ordered;
  }, [data, config.stateConfig.pipelineStates]);

  // Cache normalized entries for demo mode (so filters don't re-fetch)
  const [cachedNormalized, setCachedNormalized] = useState<ReturnType<typeof normalizeData> | null>(null);

  // Load demo data from static JSON, compute analytics client-side
  useEffect(() => {
    if (mode !== "demo") return;
    setLoading(true);

    let cancelled = false;

    const loadDemo = async () => {
      try {
        const res = await fetch("sample-logs.json");
        const json = await res.json();
        if (cancelled) return;

        // Parse compact format: { h: headers, d: rows }
        const headers = json.h as string[];
        const rows = json.d as unknown[][];
        const rawRows: RawDataRow[] = rows.map((row) => {
          const obj: RawDataRow = {};
          headers.forEach((h, i) => { obj[h] = row[i]; });
          return obj;
        });

        const normalized = normalizeData(rawRows, DEFAULT_OTA_CONFIG.columnMapping);
        if (!cancelled) {
          setCachedNormalized(normalized);
        }
      } catch (err) {
        console.error("Failed to load demo data:", err);
        if (!cancelled) setLoading(false);
      }
    };

    loadDemo();

    return () => { cancelled = true; };
  }, [mode]); // Only re-fetch when mode changes, not when filters change

  // Recompute analytics from cached normalized data when filters change
  useEffect(() => {
    if (mode !== "demo" || !cachedNormalized) return;
    setLoading(true);

    const timer = setTimeout(() => {
      try {
        const result = computeAnalytics(
          cachedNormalized,
          DEFAULT_OTA_CONFIG.stateConfig,
          entityFilter.length > 0 ? entityFilter : undefined,
          stateFilter.length > 0 ? stateFilter : undefined
        );
        setData(result);
        setPage(0);
      } catch (err) {
        console.error("Failed to compute analytics:", err);
      }
      setLoading(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [mode, cachedNormalized, entityFilter, stateFilter]);

  // Run custom analysis (client-side)
  const runCustomAnalysis = useCallback(() => {
    if (!uploadedData) return;
    setLoading(true);

    setTimeout(() => {
      try {
        const normalized = normalizeData(uploadedData, config.columnMapping);
        const result = computeAnalytics(
          normalized,
          config.stateConfig,
          entityFilter.length > 0 ? entityFilter : undefined,
          stateFilter.length > 0 ? stateFilter : undefined
        );
        setData(result);
        setPage(0);
      } catch (err) {
        console.error("Failed to run custom analysis:", err);
      }
      setLoading(false);
    }, 0);
  }, [uploadedData, config, entityFilter, stateFilter]);

  const handleRegenerate = () => {
    // Reset filters and reload the static sample data
    setEntityFilter([]);
    setStateFilter([]);
    setCachedNormalized(null);
    setMode("demo");
    setLoading(true);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const rows = parseFile(text, file.name);
      if (rows.length === 0) {
        alert("Could not parse any rows from the file.");
        return;
      }
      setUploadedData(rows);
      setUploadedFileName(file.name);
      const cols = Object.keys(rows[0]);
      setDetectedColumns(cols);

      // Auto-detect
      const detected = autoDetectColumns(rows);
      if (detected) {
        setConfig((prev) => ({
          ...prev,
          columnMapping: detected,
        }));
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleAutoDetect = () => {
    if (!uploadedData) return;
    const detected = autoDetectColumns(uploadedData);
    if (detected) {
      setConfig((prev) => ({
        ...prev,
        columnMapping: detected,
      }));
    }
  };

  const handleUseSampleConfig = () => {
    setConfig((prev) => ({
      ...prev,
      stateConfig: { ...DEFAULT_OTA_CONFIG.stateConfig },
    }));
  };

  const handleResetToDemo = () => {
    setMode("demo");
    setUploadedData(null);
    setUploadedFileName(null);
    setDetectedColumns([]);
    setConfig({
      ...DEFAULT_OTA_CONFIG,
      stateConfig: { ...DEFAULT_OTA_CONFIG.stateConfig },
      columnMapping: { ...DEFAULT_OTA_CONFIG.columnMapping },
    });
    setEntityFilter([]);
    setStateFilter([]);
    setSeed(42);
    setLoading(true);
  };

  const updateColumnMapping = (mapping: ColumnMapping) => {
    setConfig((prev) => ({ ...prev, columnMapping: mapping }));
  };

  const updateStateConfig = (partial: Partial<StateConfig>) => {
    setConfig((prev) => ({
      ...prev,
      stateConfig: { ...prev.stateConfig, ...partial },
    }));
  };

  // Paginated entries
  // Table entries: filtered by column text, sorted, then paginated
  const tableFilteredEntries = useMemo(() => {
    if (!data) return [];
    let entries = data.filteredEntries;
    // Apply per-column text filters
    for (const [key, filterText] of Object.entries(colFilters)) {
      const trimmed = filterText.trim().toLowerCase();
      if (!trimmed) continue;
      entries = entries.filter((entry) => {
        const val = String(entry[key as keyof typeof entry] ?? "").toLowerCase();
        return val.includes(trimmed);
      });
    }
    return entries;
  }, [data, colFilters]);

  const tableSortedEntries = useMemo(() => {
    if (!tableFilteredEntries.length) return tableFilteredEntries;
    if (!sortKey) return tableFilteredEntries;
    const sorted = [...tableFilteredEntries];
    const dir = sortDir === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1 * dir;
      if (vb == null) return -1 * dir;
      if (typeof va === "number" && typeof vb === "number")
        return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
    return sorted;
  }, [tableFilteredEntries, sortKey, sortDir]);

  const tableTotalPages = Math.ceil(tableSortedEntries.length / pageSize) || 0;

  const paginatedEntries = useMemo(() => {
    const start = page * pageSize;
    return tableSortedEntries.slice(start, start + pageSize);
  }, [tableSortedEntries, page]);

  // Retry bar chart colors
  const retryColors = [
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
    "#8b5cf6",
    "#06b6d4",
    "#6366f1",
  ];

  /* ---------------------------------------------------------------- */
  /*  Download HTML Report                                              */
  /* ---------------------------------------------------------------- */
  const downloadReport = async () => {
    if (!data) return;
    const entityLabelHtml = entityLabel;
    const entityListKey = isCustom ? "entity_id" : "vehicle_id";
    const html = `<!DOCTYPE html>
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
<h1>Multi-State Log Analysis & Visualization</h1>
<p class="subtitle">${entityLabelHtml} Analytics Report — Generated ${new Date().toISOString()}</p>

<h2>Key Metrics</h2>
<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-label">Total ${entityLabelHtml}s</div>
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
    <div class="kpi-label">${wasteLabel}</div>
    <div class="kpi-value amber">${data.kpi.wasted_data_gb} GB</div>
  </div>
</div>

<h2>Pipeline Funnel</h2>
<table>
  <tr><th>Stage</th><th>${entityLabelHtml}s</th><th>Drop-off</th><th>Drop-off %</th></tr>
  ${data.funnel
    .map(
      (f) =>
        `<tr><td>${f.stage}</td><td>${f.count.toLocaleString()}</td><td>${f.dropoff > 0 ? f.dropoff.toLocaleString() : "—"}</td><td>${f.dropoff_pct > 0 ? f.dropoff_pct + "%" : "—"}</td></tr>`
    )
    .join("")}
</table>

<h2>Retry Distribution</h2>
<table>
  <tr><th># Attempts</th><th>${entityLabelHtml}s</th></tr>
  ${data.retryDistribution
    .map(
      (r) =>
        `<tr><td>${r.attempts}</td><td>${r.count.toLocaleString()}</td></tr>`
    )
    .join("")}
</table>

<h2>${wasteLabel} by Condition</h2>
<table>
  <tr><th>Condition</th><th>Wasted (GB)</th><th>Count</th></tr>
  ${data.wastedByCondition
    .map(
      (w) =>
        `<tr><td>${w.condition}</td><td>${w.wasted_gb}</td><td>${w.count.toLocaleString()}</td></tr>`
    )
    .join("")}
</table>

<h2>Failure Progress Distribution</h2>
<table>
  <tr><th>Progress Range</th><th>Count</th></tr>
  ${data.failureProgressBuckets
    .map((b) => `<tr><td>${b.range}</td><td>${b.count}</td></tr>`)
    .join("")}
</table>

<h2>Time Series (Daily Events)</h2>
<table>
  <tr><th>Date</th><th>Total Events</th><th>Successes</th><th>Failures</th></tr>
  ${data.timeSeries
    .map(
      (t) =>
        `<tr><td>${t.date}</td><td>${t.events.toLocaleString()}</td><td>${t.successes.toLocaleString()}</td><td>${t.failures.toLocaleString()}</td></tr>`
    )
    .join("")}
</table>

<h2>Top 100 Log Entries</h2>
<table>
  <tr><th>${entityLabelHtml} ID</th><th>Timestamp</th><th>State</th><th>Progress</th><th>Attempt</th><th>Condition</th></tr>
  ${data.filteredEntries
    .slice(0, 100)
    .map(
      (e) =>
        `<tr><td>${e[entityListKey] || e.entity_id}</td><td>${e.timestamp}</td><td>${e.state}</td><td>${e.progress}%</td><td>${e.attempt_id}</td><td>${e.condition || "—"}</td></tr>`
    )
    .join("")}
</table>

<p class="footer">Report generated by Multi-State Log Analyzer. Total log entries: ${data.filteredEntries.length.toLocaleString()}.</p>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-report-${seed}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            Loading analytics data...
          </p>
        </div>
      </div>
    );
  }

  const entityOptions = (data.uniqueEntityList || data.uniqueVinList || []).slice(
    0,
    50
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b px-4 py-6 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Multi-State Log Analysis
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isCustom
                ? `${entityLabel} Analytics Dashboard — ${uploadedFileName}`
                : "Vehicle OTA Update Analytics Dashboard"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={downloadReport} className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download Report</span>
              <span className="sm:hidden">Report</span>
            </Button>
            {mode === "demo" && (
              <Button onClick={handleRegenerate} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Generate New Data</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Configuration Panel */}
          <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  {configOpen ? "Hide Configuration" : "Configure"}
                </Button>
              </CollapsibleTrigger>
              {isCustom && (
                <Badge variant="secondary" className="gap-1">
                  <FileSpreadsheet className="h-3 w-3" />
                  Custom Data
                </Badge>
              )}
              {mode === "demo" && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Demo
                </Badge>
              )}
            </div>

            <CollapsibleContent className="mt-4 space-y-6">
              <Card className="p-4 md:p-6 space-y-6">
                {/* Section A: Data Source */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Data Source
                  </h3>
                  <Separator />
                  <RadioGroup
                    value={mode}
                    onValueChange={(v) => {
                      const val = v as "demo" | "custom";
                      setMode(val);
                      if (val === "demo") {
                        setLoading(true);
                        setEntityFilter([]);
                        setStateFilter([]);
                      }
                    }}
                    className="flex flex-row gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="demo" id="demo" />
                      <Label htmlFor="demo" className="text-sm cursor-pointer">
                        Demo Data
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label htmlFor="custom" className="text-sm cursor-pointer">
                        Upload File
                      </Label>
                    </div>
                  </RadioGroup>

                  {mode === "demo" && (
                    <div className="flex items-end gap-3">
                      <div className="flex-1 max-w-[200px] space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          OTA Package Size (MB)
                        </Label>
                        <Input
                          type="number"
                          value={dataSizeMB}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > 0) setDataSizeMB(val);
                          }}
                          className="h-8 text-xs"
                          min={1}
                          step={10}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground pb-2">
                        Simulate different OTA package sizes — affects bandwidth &amp; waste metrics
                      </p>
                    </div>
                  )}

                  {mode === "custom" && (
                    <div className="space-y-3">
                      {/* Drag & Drop zone */}
                      <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                          dragOver
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25 hover:border-muted-foreground/50"
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                      >
                        <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Drag & drop a CSV, TSV, or JSON file here
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Choose File
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,.tsv,.json,.txt"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                          }}
                        />
                      </div>

                      {uploadedData && (
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant="outline" className="gap-1">
                            <FileSpreadsheet className="h-3 w-3" />
                            {uploadedFileName}
                          </Badge>
                          <Badge variant="secondary">
                            {uploadedData.length.toLocaleString()} rows
                          </Badge>
                          <Badge variant="secondary">
                            {detectedColumns.length} columns
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleAutoDetect}
                            className="text-xs"
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Auto-detect Columns
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleUseSampleConfig}
                            className="text-xs"
                          >
                            Use Sample Config
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section B: Column Mapping */}
                {isCustom && detectedColumns.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Column Mapping
                    </h3>
                    <Separator />
                    <ColumnMappingSelector
                      columns={detectedColumns}
                      mapping={config.columnMapping}
                      onChange={updateColumnMapping}
                    />
                  </div>
                )}

                {/* Section C: State Machine Config */}
                {(isCustom || configOpen) && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      State Machine Configuration
                    </h3>
                    <Separator />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Pipeline States */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Pipeline States (ordered — defines funnel stages)
                        </Label>
                        <TagInput
                          values={config.stateConfig.pipelineStates}
                          onChange={(v) =>
                            updateStateConfig({ pipelineStates: v })
                          }
                          placeholder="e.g. PENDING, PROCESSING"
                          reorderable
                        />
                      </div>

                      {/* Success / Failure / Retry */}
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Success States
                          </Label>
                          <TagInput
                            values={config.stateConfig.successStates}
                            onChange={(v) =>
                              updateStateConfig({ successStates: v })
                            }
                            placeholder="e.g. COMPLETED"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Failure States
                          </Label>
                          <TagInput
                            values={config.stateConfig.failureStates}
                            onChange={(v) =>
                              updateStateConfig({ failureStates: v })
                            }
                            placeholder="e.g. FAILED, ABORTED"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Retry States
                          </Label>
                          <TagInput
                            values={config.stateConfig.retryStates}
                            onChange={(v) =>
                              updateStateConfig({ retryStates: v })
                            }
                            placeholder="e.g. RETRYING"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Labels */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Entity Label
                        </Label>
                        <Input
                          value={config.stateConfig.entityLabel}
                          onChange={(e) =>
                            updateStateConfig({ entityLabel: e.target.value })
                          }
                          className="h-8 text-xs"
                          placeholder="Vehicle"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Progress Label
                        </Label>
                        <Input
                          value={config.stateConfig.progressLabel}
                          onChange={(e) =>
                            updateStateConfig({ progressLabel: e.target.value })
                          }
                          className="h-8 text-xs"
                          placeholder="Progress"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Waste Label
                        </Label>
                        <Input
                          value={config.stateConfig.wasteLabel}
                          onChange={(e) =>
                            updateStateConfig({ wasteLabel: e.target.value })
                          }
                          className="h-8 text-xs"
                          placeholder="Data Wasted"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Section D: Actions */}
                {mode === "custom" && (
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={runCustomAnalysis}
                      className="gap-2"
                      disabled={!uploadedData}
                    >
                      <Play className="h-4 w-4" />
                      Analyze Data
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleResetToDemo}
                      className="gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset to Demo
                    </Button>
                  </div>
                )}
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 gap-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">
                  Total {entityLabel}s
                </CardDescription>
                <Car className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">
                {(data.kpi.total_entities || data.kpi.total_vins).toLocaleString()}
              </div>
            </Card>
            <Card className="p-4 gap-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">Total Retries</CardDescription>
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">
                {data.kpi.total_retries.toLocaleString()}
              </div>
            </Card>
            <Card className="p-4 gap-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">Success Rate</CardDescription>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {data.kpi.success_rate}%
              </div>
            </Card>
            <Card className="p-4 gap-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">{wasteLabel}</CardDescription>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {data.kpi.wasted_data_gb} GB
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="system" className="space-y-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="system" className="gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                System Analytics
              </TabsTrigger>
              <TabsTrigger value="operational" className="gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Operational Drilldown
              </TabsTrigger>
              <TabsTrigger value="wasted" className="gap-1.5">
                <HardDrive className="h-3.5 w-3.5" />
                Wasted Data
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: System Analytics */}
            <TabsContent value="system" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FlowDiagram
                  links={data.sankey.links}
                  stateOrder={allKnownStates}
                  entityLabel={entityLabel}
                />
                <FunnelChart
                  data={data.funnel}
                  entityLabel={entityLabel}
                />
              </div>

              {/* Transition table */}
              <Card className="p-4 gap-4">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-base">
                    State Transition Summary
                  </CardTitle>
                  <CardDescription>Top 20 transitions by count</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source State</TableHead>
                          <TableHead>Target State</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...data.sankey.links]
                          .sort((a, b) => b.value - a.value)
                          .slice(0, 20)
                          .map((link, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <StateBadge state={link.source} />
                              </TableCell>
                              <TableCell>
                                <span className="text-muted-foreground">
                                  →
                                </span>{" "}
                                <StateBadge state={link.target} />
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {link.value.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Operational Drilldown */}
            <TabsContent value="operational" className="space-y-4">
              {/* Filters */}
              <Card className="p-4 gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  Filters
                </div>
                <div className="flex flex-wrap gap-3">
                  <MultiSelect
                    options={entityOptions}
                    selected={entityFilter}
                    onChange={(val) => {
                      setLoading(true);
                      setEntityFilter(val);
                    }}
                    placeholder={`All ${entityLabel}s`}
                    className="w-[240px]"
                  />

                  <MultiSelect
                    options={data.uniqueStates}
                    selected={stateFilter}
                    onChange={(val) => {
                      setLoading(true);
                      setStateFilter(val);
                    }}
                    placeholder="All States"
                    className="w-[220px]"
                  />

                  {(entityFilter.length > 0 || stateFilter.length > 0) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLoading(true);
                        setEntityFilter([]);
                        setStateFilter([]);
                      }}
                    >
                      Clear filters
                    </Button>
                  )}

                  <Badge variant="secondary" className="ml-auto">
                    {data.filteredEntries.length.toLocaleString()} entries
                  </Badge>
                </div>
              </Card>

              {/* Re-run analysis for custom mode when filters change */}
              {mode === "custom" && uploadedData && (
                <FilterRunner
                  entityFilter={entityFilter}
                  stateFilter={stateFilter}
                  runCustomAnalysis={runCustomAnalysis}
                />
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Retry Distribution */}
                <Card className="p-4 gap-4">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base">
                      Retry Distribution
                    </CardTitle>
                    <CardDescription>
                      Number of attempts per {entityLabel.toLowerCase()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={data.retryDistribution}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="attempts"
                          tick={{ fontSize: 12 }}
                          label={{
                            value: "# Attempts",
                            position: "insideBottom",
                            offset: -2,
                            fontSize: 11,
                          }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--background))",
                            color: "hsl(var(--foreground))",
                          }}
                          formatter={(value: number) => [
                            `${value.toLocaleString()} ${entityLabel.toLowerCase()}s`,
                            entityLabel + "s",
                          ]}
                        />
                        <Bar
                          dataKey="count"
                          name={entityLabel + "s"}
                          radius={[4, 4, 0, 0]}
                        >
                          {data.retryDistribution.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={retryColors[idx % retryColors.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Time Series */}
                <Card className="p-4 gap-4">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base">Events Over Time</CardTitle>
                    <CardDescription>Daily log event counts</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart
                        data={data.timeSeries}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => v.slice(5)}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--background))",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="events"
                          stroke="#6366f1"
                          fill="#6366f120"
                          name="Total Events"
                        />
                        <Area
                          type="monotone"
                          dataKey="successes"
                          stroke="#10b981"
                          fill="#10b98120"
                          name="Successes"
                        />
                        <Area
                          type="monotone"
                          dataKey="failures"
                          stroke="#ef4444"
                          fill="#ef444420"
                          name="Failures"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Data Table */}
              <Card className="p-4 gap-4">
                <CardHeader className="p-0 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Log Entries</CardTitle>
                      <CardDescription>
                        Page {tableTotalPages > 0 ? page + 1 : 0} of {tableTotalPages} (
                        {tableSortedEntries.length.toLocaleString()} shown
                        {tableSortedEntries.length !== data.filteredEntries.length
                          ? ` of ${data.filteredEntries.length.toLocaleString()}`
                          : ""}
                        )
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[32rem] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        {/* Sortable column headers */}
                        <TableRow>
                          <TableHead className="cursor-pointer select-none" onClick={() => handleSort("entity_id")}>
                            <span className="inline-flex items-center gap-1">
                              {entityLabel} ID
                              {sortKey === "entity_id" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                            </span>
                          </TableHead>
                          <TableHead className="cursor-pointer select-none" onClick={() => handleSort("timestamp")}>
                            <span className="inline-flex items-center gap-1">
                              Timestamp
                              {sortKey === "timestamp" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                            </span>
                          </TableHead>
                          <TableHead className="cursor-pointer select-none" onClick={() => handleSort("state")}>
                            <span className="inline-flex items-center gap-1">
                              State
                              {sortKey === "state" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                            </span>
                          </TableHead>
                          <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort("progress")}>
                            <span className="inline-flex items-center gap-1 justify-end">
                              {progressLabel}
                              {sortKey === "progress" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                            </span>
                          </TableHead>
                          <TableHead className="text-right cursor-pointer select-none" onClick={() => handleSort("attempt_id")}>
                            <span className="inline-flex items-center gap-1 justify-end">
                              Attempt
                              {sortKey === "attempt_id" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                            </span>
                          </TableHead>
                          <TableHead className="cursor-pointer select-none" onClick={() => handleSort("condition")}>
                            <span className="inline-flex items-center gap-1">
                              Condition
                              {sortKey === "condition" ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                            </span>
                          </TableHead>
                        </TableRow>
                        {/* Filter row */}
                        <TableRow>
                          <TableHead className="p-1">
                            <Input
                              placeholder={`Search ${entityLabel.toLowerCase()}…`}
                              value={colFilters.entity_id}
                              onChange={(e) => handleColFilter("entity_id", e.target.value)}
                              className="h-7 text-xs"
                            />
                          </TableHead>
                          <TableHead className="p-1">
                            <Input
                              placeholder="Search time…"
                              value={colFilters.timestamp}
                              onChange={(e) => handleColFilter("timestamp", e.target.value)}
                              className="h-7 text-xs"
                            />
                          </TableHead>
                          <TableHead className="p-1">
                            <Input
                              placeholder="Search state…"
                              value={colFilters.state}
                              onChange={(e) => handleColFilter("state", e.target.value)}
                              className="h-7 text-xs"
                            />
                          </TableHead>
                          <TableHead className="p-1">
                            <Input
                              placeholder="Search…"
                              value={colFilters.progress}
                              onChange={(e) => handleColFilter("progress", e.target.value)}
                              className="h-7 text-xs ml-auto w-20"
                            />
                          </TableHead>
                          <TableHead className="p-1">
                            <Input
                              placeholder="Search…"
                              value={colFilters.attempt_id}
                              onChange={(e) => handleColFilter("attempt_id", e.target.value)}
                              className="h-7 text-xs ml-auto w-20"
                            />
                          </TableHead>
                          <TableHead className="p-1">
                            <Input
                              placeholder="Search…"
                              value={colFilters.condition}
                              onChange={(e) => handleColFilter("condition", e.target.value)}
                              className="h-7 text-xs"
                            />
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedEntries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-sm">
                              No entries match the current filters.
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedEntries.map((entry, idx) => {
                            const eid =
                              entry.entity_id || entry.vehicle_id || "—";
                            return (
                              <TableRow
                                key={`${eid}-${entry.timestamp}-${idx}`}
                              >
                                <TableCell className="font-mono text-xs">
                                  {eid}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {new Date(
                                    entry.timestamp
                                  ).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <StateBadge state={entry.state} />
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {entry.progress}%
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {entry.attempt_id}
                                </TableCell>
                                <TableCell>
                                  {entry.condition ? (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      {entry.condition}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-muted-foreground">
                      Showing {tableSortedEntries.length > 0 ? page * pageSize + 1 : 0}–
                      {Math.min(
                        (page + 1) * pageSize,
                        tableSortedEntries.length
                      )}{" "}
                      of{" "}
                      {tableSortedEntries.length.toLocaleString()}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 0}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= tableTotalPages - 1}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Wasted Data Analysis */}
            <TabsContent value="wasted" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Failure Progress Distribution (Histogram) */}
                <Card className="p-4 gap-4">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base">
                      Progress at Failure
                    </CardTitle>
                    <CardDescription>
                      Distribution of progress when failures occurred
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={data.failureProgressBuckets}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="range"
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--background))",
                            color: "hsl(var(--foreground))",
                          }}
                          formatter={(value: number) => [
                            `${value} failures`,
                            "Count",
                          ]}
                        />
                        <Bar
                          dataKey="count"
                          name="Failures"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                          opacity={0.85}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Wasted Data by Condition */}
                <Card className="p-4 gap-4">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base">
                      {wasteLabel} by Condition
                    </CardTitle>
                    <CardDescription>
                      {wasteLabel} (GB) per failure type
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={data.wastedByCondition}
                        layout="vertical"
                        margin={{
                          top: 5,
                          right: 20,
                          left: 120,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal={false}
                        />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis
                          dataKey="condition"
                          type="category"
                          tick={{ fontSize: 11 }}
                          width={110}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--background))",
                            color: "hsl(var(--foreground))",
                          }}
                          formatter={(value: number, name: string) => {
                            if (name === "wasted_gb")
                              return [`${value} GB`, wasteLabel];
                            if (name === "count")
                              return [
                                `${value.toLocaleString()}`,
                                "Failures",
                              ];
                            return [value, name];
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="wasted_gb"
                          name={`Wasted (GB)`}
                          fill="#f59e0b"
                          radius={[0, 4, 4, 0]}
                          opacity={0.85}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Condition Breakdown Table */}
              <Card className="p-4 gap-4">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-base">
                    {wasteLabel} Breakdown
                  </CardTitle>
                  <CardDescription>
                    Total {wasteLabel.toLowerCase()} by failure condition
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Condition</TableHead>
                          <TableHead className="text-right">
                            {wasteLabel} (GB)
                          </TableHead>
                          <TableHead className="text-right">
                            Failure Count
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.wastedByCondition.map((w, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Badge variant="destructive" className="text-xs">
                                {w.condition}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-amber-600 dark:text-amber-400">
                              {w.wasted_gb} GB
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {w.count.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                        {data.wastedByCondition.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center text-muted-foreground py-6"
                            >
                              No failure data available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-4 py-4 md:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>Multi-State Log Analyzer</span>
          <span>
            {isCustom
              ? `${uploadedData?.length.toLocaleString()} entries loaded`
              : `Seed: ${seed}`}
          </span>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper: auto-runs custom analysis when filters change               */
/* ------------------------------------------------------------------ */
function FilterRunner({
  entityFilter,
  stateFilter,
  runCustomAnalysis,
}: {
  entityFilter: string[];
  stateFilter: string[];
  runCustomAnalysis: () => void;
}) {
  useEffect(() => {
    runCustomAnalysis();
    // runCustomAnalysis intentionally omitted from deps to avoid infinite loop
  }, [entityFilter, stateFilter, runCustomAnalysis]);
  return null;
}
