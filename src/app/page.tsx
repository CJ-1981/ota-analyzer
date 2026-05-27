"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  AreaChart,
  Area,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type EnrichedEntry = {
  vehicle_id: string;
  timestamp: string;
  state: string;
  progress: number;
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

const CONDITION_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6",
];

/* ------------------------------------------------------------------ */
/*  State badge component                                               */
/* ------------------------------------------------------------------ */
function StateBadge({ state }: { state: string }) {
  const colorMap: Record<string, string> = {
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
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${colorMap[state] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"}`}
    >
      {state}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Sankey-like Flow Diagram (horizontal stacked bars)                  */
/* ------------------------------------------------------------------ */
function FlowDiagram({ links }: { links: SankeyLink[] }) {
  const stateOrder = [
    "INITIATED",
    "AUTHENTICATING",
    "DOWNLOADING",
    "VERIFYING",
    "INSTALLING",
    "COMPLETED",
    "FAILED",
    "ABORTED",
    "RETRYING",
  ];

  // Build per-source data: each bar shows stacked segments colored by target
  const sourceMap = new Map<string, Map<string, number>>();
  const validSources = new Set(stateOrder);

  for (const link of links) {
    if (!validSources.has(link.source)) continue;
    if (!sourceMap.has(link.source)) sourceMap.set(link.source, new Map());
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
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
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
                `${value.toLocaleString()} vehicles`,
                `→ ${name}`,
              ]}
            />
            <Legend />
            {targetList.map((target) => (
              <Bar
                key={target}
                dataKey={target}
                stackId="a"
                fill={STATE_COLORS[target] || "#888"}
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
function FunnelChart({ data }: { data: FunnelStage[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const chartData = data.map((d) => ({
    ...d,
    width_pct: ((d.count / maxCount) * 100).toFixed(1),
  }));

  const funnelColors = [
    "#6366f1",
    "#8b5cf6",
    "#3b82f6",
    "#06b6d4",
    "#f59e0b",
    "#10b981",
  ];

  return (
    <Card className="p-4 gap-4">
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-base">Pipeline Funnel</CardTitle>
        <CardDescription>
          Vehicle progression through update stages
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2">
          {chartData.map((item, idx) => (
            <div key={item.stage} className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground w-28 text-right shrink-0">
                {item.stage}
              </span>
              <div className="flex-1">
                <div
                  className="h-8 rounded-md flex items-center justify-end px-2 transition-all"
                  style={{
                    width: `${Math.max(Number(item.width_pct), 8)}%`,
                    backgroundColor: funnelColors[idx] || "#888",
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
/*  Main Dashboard                                                     */
/* ------------------------------------------------------------------ */
export default function Home() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seed, setSeed] = useState(42);
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      const params = new URLSearchParams();
      params.set("seed", String(seed));
      if (vehicleFilter && vehicleFilter !== "all") {
        params.set("vehicle_id", vehicleFilter);
      }
      if (stateFilter && stateFilter !== "all") {
        params.set("state", stateFilter);
      }
      try {
        const res = await fetch(`/api/analytics?${params.toString()}`);
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setPage(0);
        }
      } catch (err) {
        if (!cancelled) console.error("Failed to fetch analytics:", err);
      }
      if (!cancelled) setLoading(false);
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [seed, vehicleFilter, stateFilter]);

  const handleRegenerate = () => {
    const newSeed = Math.floor(Math.random() * 100000);
    setSeed(newSeed);
    setLoading(true);
  };

  // Paginated entries
  const paginatedEntries = useMemo(() => {
    if (!data) return [];
    const start = page * pageSize;
    return data.filteredEntries.slice(start, start + pageSize);
  }, [data, page]);

  const totalPages = data
    ? Math.ceil(data.filteredEntries.length / pageSize)
    : 0;

  // Build all-targets list for the sankey data source filtering
  const allTargetsForSankey = useMemo(() => {
    if (!data) return [];
    const targets = new Set<string>();
    for (const link of data.sankey.links) {
      targets.add(link.target);
    }
    return [...targets].sort();
  }, [data]);

  // Build retry bar chart colors
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
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Vehicle OTA Update Analytics Report</title>
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
<p class="subtitle">Vehicle OTA Update Analytics Report — Generated ${new Date().toISOString()}</p>

<h2>Key Metrics</h2>
<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-label">Total VINs</div>
    <div class="kpi-value">${data.kpi.total_vins.toLocaleString()}</div>
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
    <div class="kpi-label">Data Wasted</div>
    <div class="kpi-value amber">${data.kpi.wasted_data_gb} GB</div>
  </div>
</div>

<h2>Pipeline Funnel</h2>
<table>
  <tr><th>Stage</th><th>Vehicles</th><th>Drop-off</th><th>Drop-off %</th></tr>
  ${data.funnel
    .map(
      (f) => `<tr><td>${f.stage}</td><td>${f.count.toLocaleString()}</td><td>${f.dropoff > 0 ? f.dropoff.toLocaleString() : "—"}</td><td>${f.dropoff_pct > 0 ? f.dropoff_pct + "%" : "—"}</td></tr>`
    )
    .join("")}
</table>

<h2>Retry Distribution</h2>
<table>
  <tr><th># Attempts</th><th>VINs</th></tr>
  ${data.retryDistribution
    .map(
      (r) => `<tr><td>${r.attempts}</td><td>${r.count.toLocaleString()}</td></tr>`
    )
    .join("")}
</table>

<h2>Wasted Data by Condition</h2>
<table>
  <tr><th>Condition</th><th>Wasted (GB)</th><th>Count</th></tr>
  ${data.wastedByCondition
    .map(
      (w) => `<tr><td>${w.condition}</td><td>${w.wasted_gb}</td><td>${w.count.toLocaleString()}</td></tr>`
    )
    .join("")}
</table>

<h2>Failure Progress Distribution</h2>
<table>
  <tr><th>Progress Range</th><th>Count</th></tr>
  ${data.failureProgressBuckets
    .map(
      (b) => `<tr><td>${b.range}</td><td>${b.count}</td></tr>`
    )
    .join("")}
</table>

<h2>Time Series (Daily Events)</h2>
<table>
  <tr><th>Date</th><th>Total Events</th><th>Successes</th><th>Failures</th></tr>
  ${data.timeSeries
    .map(
      (t) => `<tr><td>${t.date}</td><td>${t.events.toLocaleString()}</td><td>${t.successes.toLocaleString()}</td><td>${t.failures.toLocaleString()}</td></tr>`
    )
    .join("")}
</table>

<h2>Top 100 Log Entries</h2>
<table>
  <tr><th>Vehicle ID</th><th>Timestamp</th><th>State</th><th>Progress</th><th>Attempt</th><th>Condition</th></tr>
  ${data.filteredEntries
    .slice(0, 100)
    .map(
      (e) => `<tr><td>${e.vehicle_id}</td><td>${e.timestamp}</td><td>${e.state}</td><td>${e.progress}%</td><td>${e.attempt_id}</td><td>${e.condition || "—"}</td></tr>`
    )
    .join("")}
</table>

<p class="footer">Report generated by Vehicle OTA Update Analytics Dashboard. Seed: ${seed}. Total log entries: ${data.filteredEntries.length.toLocaleString()}.</p>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ota-analytics-report-${seed}.html`;
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

  const vinOptions = data.uniqueVinList.slice(0, 50);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b px-4 py-6 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Multi-State Log Analysis & Visualization
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Vehicle OTA Update Analytics Dashboard
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={downloadReport} className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download HTML Report</span>
              <span className="sm:hidden">Report</span>
            </Button>
            <Button onClick={handleRegenerate} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Generate New Data</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 gap-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">Total VINs</CardDescription>
                <Car className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">
                {data.kpi.total_vins.toLocaleString()}
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
                <CardDescription className="text-xs">Data Wasted</CardDescription>
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
                <FlowDiagram links={data.sankey.links} />
                <FunnelChart data={data.funnel} />
              </div>

              {/* Transition table */}
              <Card className="p-4 gap-4">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-base">State Transition Summary</CardTitle>
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
                                <span className="text-muted-foreground">→</span>{" "}
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
                  <Select
                    value={vehicleFilter}
                    onValueChange={(val) => {
                      setLoading(true);
                      setVehicleFilter(val);
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Vehicles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vehicles</SelectItem>
                      {vinOptions.map((vin) => (
                        <SelectItem key={vin} value={vin}>
                          {vin}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={stateFilter}
                    onValueChange={(val) => {
                      setLoading(true);
                      setStateFilter(val);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {data.uniqueStates.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {(vehicleFilter !== "all" || stateFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLoading(true);
                        setVehicleFilter("all");
                        setStateFilter("all");
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Retry Distribution */}
                <Card className="p-4 gap-4">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base">
                      Retry Distribution
                    </CardTitle>
                    <CardDescription>
                      Number of attempts per vehicle
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
                            `${value.toLocaleString()} VINs`,
                            "Vehicles",
                          ]}
                        />
                        <Bar
                          dataKey="count"
                          name="Vehicles"
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
                        Page {page + 1} of {totalPages} ({data.filteredEntries.length.toLocaleString()} total)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vehicle ID</TableHead>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead className="text-right">Progress</TableHead>
                          <TableHead className="text-right">Attempt</TableHead>
                          <TableHead>Condition</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedEntries.map((entry, idx) => (
                          <TableRow key={`${entry.vehicle_id}-${entry.timestamp}-${idx}`}>
                            <TableCell className="font-mono text-xs">
                              {entry.vehicle_id}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(entry.timestamp).toLocaleString()}
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
                                <Badge variant="destructive" className="text-xs">
                                  {entry.condition}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-muted-foreground">
                      Showing {page * pageSize + 1}–
                      {Math.min((page + 1) * pageSize, data.filteredEntries.length)} of{" "}
                      {data.filteredEntries.length.toLocaleString()}
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
                        disabled={page >= totalPages - 1}
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
                      Distribution of download/install progress when failures occurred
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
                      Wasted Data by Condition
                    </CardTitle>
                    <CardDescription>
                      Data wasted (GB) per failure type
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={data.wastedByCondition}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 120, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
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
                              return [`${value} GB`, "Wasted Data"];
                            if (name === "count")
                              return [`${value.toLocaleString()}`, "Failures"];
                            return [value, name];
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="wasted_gb"
                          name="Wasted (GB)"
                          fill="#f59e0b"
                          radius={[0, 4, 4, 0]}
                          opacity={0.85}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Progress Steps Horizontal Bar */}
              <Card className="p-4 gap-4">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-base">
                    Failure Frequency by Progress Step
                  </CardTitle>
                  <CardDescription>
                    At which 5% increment failures occur most frequently
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={data.failureProgressBuckets.filter((b) => b.count > 0)}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis
                        dataKey="range"
                        type="category"
                        tick={{ fontSize: 11 }}
                        width={50}
                      />
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
                        fill="#ec4899"
                        radius={[0, 4, 4, 0]}
                        opacity={0.8}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Wasted Data Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.wastedByCondition.map((item, idx) => (
                  <Card key={item.condition} className="p-4 gap-2">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs">
                        {item.condition}
                      </CardDescription>
                      <TrendingDown
                        className="h-4 w-4"
                        style={{ color: CONDITION_COLORS[idx % CONDITION_COLORS.length] }}
                      />
                    </div>
                    <div
                      className="text-xl font-bold"
                      style={{ color: CONDITION_COLORS[idx % CONDITION_COLORS.length] }}
                    >
                      {item.wasted_gb} GB
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.count.toLocaleString()} failure events
                    </p>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-4 py-4 md:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>Vehicle OTA Update Analytics Dashboard</p>
          <p>
            Seed: {seed} | {data.filteredEntries.length.toLocaleString()} log
            entries | {data.kpi.total_vins.toLocaleString()} VINs
          </p>
        </div>
      </footer>
    </div>
  );
}
