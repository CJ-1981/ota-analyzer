"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataKey } from "recharts/types/util/types";
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
  Upload,
  FileSpreadsheet,
  Settings,
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
import { computeAnalytics } from "@/lib/analytics";
import type { AnalyticsResult } from "@/lib/analytics";
import { generateReportHtml } from "@/lib/report-generator";
import { TOOLTIP_CONTENT_STYLE } from "@/lib/chart-helpers";

import { StateBadge } from "@/components/StateBadge";
import { TagInput } from "@/components/TagInput";
import { FlowDiagram } from "@/components/FlowDiagram";
import { FunnelChart } from "@/components/FunnelChart";
import { ColumnMappingSelector } from "@/components/ColumnMappingSelector";
import { DataTable } from "@/components/DataTable";
import type { SortKey } from "@/components/DataTable";
import { FilterRunner } from "@/components/FilterRunner";

/* ------------------------------------------------------------------ */
/*  Main Dashboard                                                     */
/* ------------------------------------------------------------------ */
export default function Home() {
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [entityFilter, setEntityFilter] = useState<string[]>([]);
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Table column sort & filter
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [colTextFilters, setColTextFilters] = useState<Record<string, string>>({
    entity_id: "",
    timestamp: "",
    progress: "",
    attempt_id: "",
  });
  const [colStateFilter, setColStateFilter] = useState<string[]>([]);
  const [colConditionFilter, setColConditionFilter] = useState<string[]>([]);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        // Third click: reset to original order
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }, [sortKey, sortDir]);

  const handleColTextFilter = useCallback((key: string, value: string) => {
    setColTextFilters((prev) => ({ ...prev, [key]: value }));
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
    const ordered = [...config.stateConfig.pipelineStates];
    for (const s of data.uniqueStates) {
      if (!ordered.includes(s)) ordered.push(s);
    }
    return ordered;
  }, [data, config.stateConfig.pipelineStates]);

  // Cache for demo mode
  const [cachedNormalized, setCachedNormalized] = useState<ReturnType<typeof normalizeData> | null>(null);

  // Load pre-computed analytics (fast, 68KB) and raw data for table
  useEffect(() => {
    if (mode !== "demo") return;
    if (cachedNormalized) return;
    let cancelled = false;

    const loadDemo = async () => {
      setLoading(true);
      try {
        // Load raw data for table
        const logsRes = await fetch("sample-logs.json");
        const logsJson = await logsRes.json();
        if (cancelled) return;

        const headers = logsJson.h as string[];
        const rows = logsJson.d as unknown[][];
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
  }, [mode, cachedNormalized]);

  // Build full result from cached data with filters
  useEffect(() => {
    if (mode !== "demo" || !cachedNormalized) return;

    const timer = setTimeout(() => {
      setComputing(true);
      try {
        const result = computeAnalytics(
          cachedNormalized,
          DEFAULT_OTA_CONFIG.stateConfig,
          entityFilter.length > 0 ? entityFilter : undefined,
          stateFilter.length > 0 ? stateFilter : undefined
        );
        setData(result);
        setPage(0);
        setLoading(false);
      } catch (err) {
        console.error("Failed to compute analytics:", err);
      }
      setComputing(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [mode, cachedNormalized, entityFilter, stateFilter]);

  // Run custom analysis (client-side)
  const runCustomAnalysis = useCallback(() => {
    if (!uploadedData) return;
    setComputing(true);

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
      setComputing(false);
    }, 0);
  }, [uploadedData, config, entityFilter, stateFilter]);

  const handleRegenerate = () => {
    // Data is pre-computed and static — just reset all filters/views
    setEntityFilter([]);
    setStateFilter([]);
    setColTextFilters({
      entity_id: "",
      timestamp: "",
      progress: "",
      attempt_id: "",
    });
    setColStateFilter([]);
    setColConditionFilter([]);
    setSortKey(null);
    setSortDir("asc");
    setPage(0);
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
    setColTextFilters({
      entity_id: "",
      timestamp: "",
      progress: "",
      attempt_id: "",
    });
    setColStateFilter([]);
    setColConditionFilter([]);
    setSortKey(null);
    setSortDir("asc");
    setPage(0);
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

  // Condition options for multi-select
  const conditionOptions = useMemo(() => {
    if (!data) return [];
    return data.wastedByCondition.map((w) => w.condition);
  }, [data]);

  // Clickable legend: track hidden series per chart
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});
  const toggleSeries = useCallback((dataKey: string) => {
    setHiddenSeries((prev) => ({ ...prev, [dataKey]: !prev[dataKey] }));
  }, []);
  const handleLegendClick = useCallback((data: { dataKey?: DataKey<string> }) => {
    if (typeof data.dataKey === "string") {
      toggleSeries(data.dataKey);
    }
  }, [toggleSeries]);

  // Retry bar chart colors — Wired monochrome ink palette
  const retryColors = [
    "#000000",
    "#1a1a1a",
    "#333333",
    "#4a4a4a",
    "#555555",
    "#6a6a6a",
    "#757575",
  ];

  /* ---------------------------------------------------------------- */
  /*  Download HTML Report                                              */
  /* ---------------------------------------------------------------- */
  const downloadReport = () => {
    if (!data) return;
    const html = generateReportHtml(data, entityLabel, wasteLabel, isCustom);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-body" />
          <p className="text-body text-sm font-bold uppercase tracking-wider">
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
      {/* Masthead Band — Wired signature */}
      <header className="border-b border-ink px-4 py-6 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-4xl font-normal tracking-tight leading-tight">
              Multi-State Log Analysis
            </h1>
            <p className="text-body text-sm mt-1 uppercase tracking-wider font-bold">
              {isCustom
                ? `${entityLabel} Analytics — ${uploadedFileName}`
                : "Vehicle OTA Update Analytics"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={downloadReport} className="gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download Report</span>
              <span className="sm:hidden">Report</span>
            </Button>
            {mode === "demo" && (
              <Button onClick={handleRegenerate} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Reset Filters</span>
                <span className="sm:hidden">Reset</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Computing overlay */}
          {computing && (
            <div className="flex items-center gap-2 text-sm text-body font-bold uppercase tracking-wider">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Recomputing analytics...
            </div>
          )}

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
              <Card className="p-4 md:p-6 space-y-6 bg-secondary border-hairline">
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

                  {mode === "custom" && (
                    <div className="space-y-3">
                      {/* Drag & Drop zone */}
                      <div
                        className={`border-2 border-dashed p-8 text-center transition-colors ${
                          dragOver
                            ? "border-ink bg-ink/5"
                            : "border-hairline hover:border-ink/50"
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

          {/* KPI Cards — magazine story-row style with hairline dividers */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-hairline border border-hairline">
            <div className="p-4 gap-2 bg-background">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-bold uppercase tracking-wider">
                  Total {entityLabel}s
                </CardDescription>
                <Car className="h-4 w-4 text-body" />
              </div>
              <div className="font-display text-2xl">
                {(data.kpi.total_entities || data.kpi.total_vins).toLocaleString()}
              </div>
            </div>
            <div className="p-4 gap-2 bg-background">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-bold uppercase tracking-wider">Total Retries</CardDescription>
                <RotateCcw className="h-4 w-4 text-body" />
              </div>
              <div className="font-display text-2xl">
                {data.kpi.total_retries.toLocaleString()}
              </div>
            </div>
            <div className="p-4 gap-2 bg-background">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-bold uppercase tracking-wider">Success Rate</CardDescription>
                <CheckCircle2 className="h-4 w-4 text-ink" />
              </div>
              <div className="font-display text-2xl">
                {data.kpi.success_rate}%
              </div>
            </div>
            <div className="p-4 gap-2 bg-background">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-bold uppercase tracking-wider">{wasteLabel}</CardDescription>
                <AlertTriangle className="h-4 w-4 text-ink" />
              </div>
              <div className="font-display text-2xl">
                {data.kpi.wasted_data_gb} GB
              </div>
            </div>
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
                  <CardTitle className="text-base font-bold uppercase tracking-wide">
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
                      setComputing(true);
                      setEntityFilter(val);
                    }}
                    placeholder={`All ${entityLabel}s`}
                    className="w-[240px]"
                  />

                  <MultiSelect
                    options={data.uniqueStates}
                    selected={stateFilter}
                    onChange={(val) => {
                      setComputing(true);
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
                        setComputing(true);
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
                  runCustomAnalysis={runCustomAnalysis}
                />
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Retry Distribution */}
                <Card className="p-4 gap-4">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base font-bold uppercase tracking-wide">
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="attempts"
                          tick={{ fontSize: 11, fill: "#757575" }}
                          label={{
                            value: "# Attempts",
                            position: "insideBottom",
                            offset: -2,
                            fontSize: 10,
                            fill: "#757575",
                          }}
                        />
                        <YAxis tick={{ fontSize: 11, fill: "#757575" }} />
                        <Tooltip
                          contentStyle={TOOLTIP_CONTENT_STYLE}
                          formatter={(value: number) => [
                            `${value.toLocaleString()} ${entityLabel.toLowerCase()}s`,
                            entityLabel + "s",
                          ]}
                        />
                        <Bar
                          dataKey="count"
                          name={entityLabel + "s"}
                          radius={0}
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
                    <CardTitle className="text-base font-bold uppercase tracking-wide">Events Over Time</CardTitle>
                    <CardDescription>Daily log event counts</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart
                        data={data.timeSeries}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "#757575" }}
                          tickFormatter={(v) => v.slice(5)}
                        />
                        <YAxis tick={{ fontSize: 11, fill: "#757575" }} />
                        <Tooltip
                          contentStyle={TOOLTIP_CONTENT_STYLE}
                        />
                        <Legend
                          onClick={handleLegendClick}
                          wrapperStyle={{ cursor: "pointer" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="events"
                          stroke="#000000"
                          fill="#00000015"
                          name="Total Events"
                          hide={hiddenSeries["events"]}
                          opacity={hiddenSeries["events"] ? 0 : undefined}
                        />
                        <Area
                          type="monotone"
                          dataKey="successes"
                          stroke="#333333"
                          fill="#33333315"
                          name="Successes"
                          hide={hiddenSeries["successes"]}
                          opacity={hiddenSeries["successes"] ? 0 : undefined}
                        />
                        <Area
                          type="monotone"
                          dataKey="failures"
                          stroke="#757575"
                          fill="#75757515"
                          name="Failures"
                          hide={hiddenSeries["failures"]}
                          opacity={hiddenSeries["failures"] ? 0 : undefined}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Data Table */}
              {data && (
                <DataTable
                  data={data}
                  entityLabel={entityLabel}
                  progressLabel={progressLabel}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  colTextFilters={colTextFilters}
                  colStateFilter={colStateFilter}
                  colConditionFilter={colConditionFilter}
                  page={page}
                  pageSize={pageSize}
                  conditionOptions={conditionOptions}
                  onSort={(key) => {
                    handleSort(key);
                  }}
                  onColTextFilter={(key, value) => {
                    handleColTextFilter(key, value);
                  }}
                  onColStateFilter={(val) => {
                    setColStateFilter(val);
                    setPage(0);
                  }}
                  onColConditionFilter={(val) => {
                    setColConditionFilter(val);
                    setPage(0);
                  }}
                  onPage={setPage}
                />
              )}
            </TabsContent>

            {/* Tab 3: Wasted Data Analysis */}
            <TabsContent value="wasted" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Failure Progress Distribution (Histogram) */}
                <Card className="p-4 gap-4">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base font-bold uppercase tracking-wide">
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis
                          dataKey="range"
                          tick={{ fontSize: 10, fill: "#757575" }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 11, fill: "#757575" }} />
                        <Tooltip
                          contentStyle={TOOLTIP_CONTENT_STYLE}
                          formatter={(value: number) => [
                            `${value} failures`,
                            "Count",
                          ]}
                        />
                        <Bar
                          dataKey="count"
                          name="Failures"
                          fill="#000000"
                          radius={0}
                          opacity={0.85}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Wasted Data by Condition */}
                <Card className="p-4 gap-4">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base font-bold uppercase tracking-wide">
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
                          stroke="#e0e0e0"
                          horizontal={false}
                        />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#757575" }} />
                        <YAxis
                          dataKey="condition"
                          type="category"
                          tick={{ fontSize: 11, fill: "#000000", fontWeight: 700 }}
                          width={110}
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_CONTENT_STYLE}
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
                        <Legend
                          onClick={handleLegendClick}
                          wrapperStyle={{ cursor: "pointer" }}
                        />
                        <Bar
                          dataKey="wasted_gb"
                          name={`Wasted (GB)`}
                          fill="#333333"
                          radius={0}
                          opacity={hiddenSeries["wasted_gb"] ? 0 : 0.85}
                          hide={hiddenSeries["wasted_gb"]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Condition Breakdown Table */}
              <Card className="p-4 gap-4">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-base font-bold uppercase tracking-wide">
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
                            <TableCell className="text-right font-mono font-bold">
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

      {/* Footer Band — Wired near-black footer */}
      <footer className="bg-ink px-4 py-6 md:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-white/70 font-bold uppercase tracking-wider">
          <span className="font-display text-sm text-white tracking-tight normal-case">
            Multi-State Log Analyzer
          </span>
          <span>
            {isCustom
              ? `${uploadedData?.length.toLocaleString()} entries loaded`
              : `${data.filteredEntries.length.toLocaleString()} entries`}
          </span>
        </div>
      </footer>
    </div>
  );
}
