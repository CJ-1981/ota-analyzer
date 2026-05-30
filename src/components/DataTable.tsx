"use client";

import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AnalyticsResult, EnrichedEntry } from "@/lib/analytics";
import { StateBadge } from "./StateBadge";

/* ------------------------------------------------------------------ */
/*  Deterministic color for entity IDs                                   */
/* ------------------------------------------------------------------ */
const ENTITY_PALETTE = [
  { bg: "#dbeafe", text: "#1e40af", darkBg: "#1e3a5f", darkText: "#93c5fd" }, // blue
  { bg: "#dcfce7", text: "#166534", darkBg: "#14532d", darkText: "#86efac" }, // green
  { bg: "#fef3c7", text: "#92400e", darkBg: "#451a03", darkText: "#fde68a" }, // amber
  { bg: "#fae8ff", text: "#86198f", darkBg: "#4a044e", darkText: "#f0abfc" }, // fuchsia
  { bg: "#e0e7ff", text: "#3730a3", darkBg: "#1e1b4b", darkText: "#c7d2fe" }, // indigo
  { bg: "#ffe4e6", text: "#9f1239", darkBg: "#4c0519", darkText: "#fda4af" }, // rose
  { bg: "#f0fdf4", text: "#15803d", darkBg: "#052e16", darkText: "#bbf7d0" }, // emerald
  { bg: "#fff7ed", text: "#9a3412", darkBg: "#431407", darkText: "#fed7aa" }, // orange
  { bg: "#f5f3ff", text: "#5b21b6", darkBg: "#2e1065", darkText: "#ddd6fe" }, // violet
  { bg: "#ecfdf5", text: "#065f46", darkBg: "#022c22", darkText: "#a7f3d0" }, // teal
  { bg: "#fef9c3", text: "#854d0e", darkBg: "#422006", darkText: "#fef08a" }, // yellow
  { bg: "#fdf2f8", text: "#9d174d", darkBg: "#500724", darkText: "#fbcfe8" }, // pink
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash);
}

const entityColorCache = new Map<string, { bg: string; text: string }>();

function getEntityColor(entityId: string): { bg: string; text: string } {
  if (entityId === "—") return { bg: "transparent", text: "inherit" };
  let cached = entityColorCache.get(entityId);
  if (cached) return cached;
  const entry = ENTITY_PALETTE[hashString(entityId) % ENTITY_PALETTE.length];
  // Detect dark mode from document element
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  cached = isDark
    ? { bg: entry.darkBg, text: entry.darkText }
    : { bg: entry.bg, text: entry.text };
  entityColorCache.set(entityId, cached);
  return cached;
}

export type SortKey = "entity_id" | "timestamp" | "state" | "progress" | "attempt_id" | "condition";

export type DataTableProps = {
  data: AnalyticsResult;
  entityLabel: string;
  progressLabel: string;
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
  colTextFilters: Record<string, string>;
  colStateFilter: string[];
  colConditionFilter: string[];
  page: number;
  pageSize: number;
  conditionOptions: string[];
  onSort: (key: SortKey) => void;
  onColTextFilter: (key: string, value: string) => void;
  onColStateFilter: (val: string[]) => void;
  onColConditionFilter: (val: string[]) => void;
  onPage: (page: number) => void;
};

function SortIcon({
  column,
  sortKey,
  sortDir,
}: {
  column: SortKey;
  sortKey: SortKey | null;
  sortDir: "asc" | "desc";
}) {
  if (sortKey === column) {
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  }
  return <ArrowUpDown className="h-3 w-3 opacity-30" />;
}

export function DataTable({
  data,
  entityLabel,
  progressLabel,
  sortKey,
  sortDir,
  colTextFilters,
  colStateFilter,
  colConditionFilter,
  page,
  pageSize,
  conditionOptions,
  onSort,
  onColTextFilter,
  onColStateFilter,
  onColConditionFilter,
  onPage,
}: DataTableProps) {
  const tableFilteredEntries = useMemo(() => {
    let entries: EnrichedEntry[] = data.filteredEntries;
    for (const [key, filterText] of Object.entries(colTextFilters)) {
      const trimmed = filterText.trim().toLowerCase();
      if (!trimmed) continue;
      entries = entries.filter((entry) => {
        const val = key in entry
          ? String((entry as Record<string, unknown>)[key] ?? "").toLowerCase()
          : "";
        return val.includes(trimmed);
      });
    }
    if (colStateFilter.length > 0) {
      const stateSet = new Set(colStateFilter);
      entries = entries.filter((entry) => stateSet.has(entry.state));
    }
    if (colConditionFilter.length > 0) {
      const condSet = new Set(colConditionFilter);
      entries = entries.filter(
        (entry) =>
          entry.condition !== null &&
          entry.condition !== undefined &&
          condSet.has(entry.condition)
      );
    }
    return entries;
  }, [data, colTextFilters, colStateFilter, colConditionFilter]);

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

  const tableTotalPages =
    Math.ceil(tableSortedEntries.length / pageSize) || 0;

  const start = page * pageSize;
  const paginatedEntries = tableSortedEntries.slice(start, start + pageSize);

  return (
    <Card className="p-4 gap-4">
      <CardHeader className="p-0 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold uppercase tracking-wide">Log Entries</CardTitle>
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
        <div className="max-h-[32rem] overflow-auto">
          <Table className="min-w-[40rem]">
            <TableHeader>
              {/* Sortable column headers */}
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => onSort("entity_id")}
                  aria-sort={
                    sortKey === "entity_id"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {entityLabel} ID
                    <SortIcon
                      column="entity_id"
                      sortKey={sortKey}
                      sortDir={sortDir}
                    />
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => onSort("timestamp")}
                  aria-sort={
                    sortKey === "timestamp"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    Timestamp
                    <SortIcon
                      column="timestamp"
                      sortKey={sortKey}
                      sortDir={sortDir}
                    />
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => onSort("state")}
                  aria-sort={
                    sortKey === "state"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    State
                    <SortIcon
                      column="state"
                      sortKey={sortKey}
                      sortDir={sortDir}
                    />
                  </span>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => onSort("progress")}
                  aria-sort={
                    sortKey === "progress"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    {progressLabel}
                    <SortIcon
                      column="progress"
                      sortKey={sortKey}
                      sortDir={sortDir}
                    />
                  </span>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer select-none"
                  onClick={() => onSort("attempt_id")}
                  aria-sort={
                    sortKey === "attempt_id"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    Attempt
                    <SortIcon
                      column="attempt_id"
                      sortKey={sortKey}
                      sortDir={sortDir}
                    />
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => onSort("condition")}
                  aria-sort={
                    sortKey === "condition"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    Condition
                    <SortIcon
                      column="condition"
                      sortKey={sortKey}
                      sortDir={sortDir}
                    />
                  </span>
                </TableHead>
              </TableRow>
              {/* Filter row */}
              <TableRow>
                <TableHead className="p-1">
                  <Input
                    placeholder={`Search ${entityLabel.toLowerCase()}…`}
                    value={colTextFilters.entity_id ?? ""}
                    onChange={(e) =>
                      onColTextFilter("entity_id", e.target.value)
                    }
                    className="h-7 text-xs"
                  />
                </TableHead>
                <TableHead className="p-1">
                  <Input
                    placeholder="Search time…"
                    value={colTextFilters.timestamp ?? ""}
                    onChange={(e) =>
                      onColTextFilter("timestamp", e.target.value)
                    }
                    className="h-7 text-xs"
                  />
                </TableHead>
                <TableHead className="p-1">
                  <MultiSelect
                    options={data.uniqueStates}
                    selected={colStateFilter}
                    onChange={(val) => {
                      onColStateFilter(val);
                    }}
                    placeholder="All States"
                    className="min-w-[120px]"
                  />
                </TableHead>
                <TableHead className="p-1">
                  <Input
                    placeholder="Search…"
                    value={colTextFilters.progress ?? ""}
                    onChange={(e) =>
                      onColTextFilter("progress", e.target.value)
                    }
                    className="h-7 text-xs ml-auto w-20"
                  />
                </TableHead>
                <TableHead className="p-1">
                  <Input
                    placeholder="Search…"
                    value={colTextFilters.attempt_id ?? ""}
                    onChange={(e) =>
                      onColTextFilter("attempt_id", e.target.value)
                    }
                    className="h-7 text-xs ml-auto w-20"
                  />
                </TableHead>
                <TableHead className="p-1">
                  <MultiSelect
                    options={conditionOptions}
                    selected={colConditionFilter}
                    onChange={(val) => {
                      onColConditionFilter(val);
                    }}
                    placeholder="All Conditions"
                    className="min-w-[120px]"
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEntries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-body text-sm font-bold uppercase tracking-wider"
                  >
                    No entries match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEntries.map((entry, idx) => {
                  const eid = entry.entity_id || "—";
                  return (
                    <TableRow
                      key={`${eid}-${entry.timestamp}-${entry.state}-${entry.progress}-${entry.attempt_id}`}
                    >
                      <TableCell className="text-xs">
                        <span
                          className="inline-block rounded px-1.5 py-0.5 font-mono font-medium"
                          style={{ backgroundColor: getEntityColor(eid).bg, color: getEntityColor(eid).text }}
                        >
                          {eid}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-body">
                        {entry.timestamp
                          ? new Date(entry.timestamp).toLocaleString()
                          : "—"}
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
                          <span className="text-body">
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-hairline gap-3">
          <p className="text-xs text-body font-bold uppercase tracking-wider">
            Showing{" "}
            {tableSortedEntries.length > 0 ? page * pageSize + 1 : 0}–
            {Math.min(
              (page + 1) * pageSize,
              tableSortedEntries.length
            )}{" "}
            of{" "}
            {tableSortedEntries.length.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <PageSelector
              totalPages={tableTotalPages}
              currentPage={page}
              onSelect={onPage}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Selector with first/prev/page-jump/next/last                    */
/* ------------------------------------------------------------------ */
function PageSelector({
  totalPages,
  currentPage,
  onSelect,
}: {
  totalPages: number;
  currentPage: number;
  onSelect: (page: number) => void;
}) {
  const [inputVal, setInputVal] = useState(String(currentPage + 1));

  // Sync input when external page changes
  useEffect(() => {
    setInputVal(String(currentPage + 1));
  }, [currentPage]);

  const jumpToPage = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(target, totalPages - 1));
      if (clamped !== currentPage) onSelect(clamped);
      setInputVal(String(clamped + 1));
    },
    [currentPage, totalPages, onSelect]
  );

  const handleInputSubmit = useCallback(() => {
    const num = parseInt(inputVal, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      jumpToPage(num - 1);
    } else {
      setInputVal(String(currentPage + 1));
    }
  }, [inputVal, totalPages, currentPage, jumpToPage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleInputSubmit();
    },
    [handleInputSubmit]
  );

  if (totalPages <= 1) return null;

  // Build a sliding window of page buttons (show max 5 centered on current)
  const maxButtons = 5;
  let startPage = Math.max(0, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages - 1, startPage + maxButtons - 1);
  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(0, endPage - maxButtons + 1);
  }
  const pageButtons: number[] = [];
  for (let i = startPage; i <= endPage; i++) pageButtons.push(i);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* First */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={currentPage === 0}
        onClick={() => jumpToPage(0)}
      >
        <ChevronsLeft className="h-3.5 w-3.5" />
      </Button>
      {/* Previous */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={currentPage === 0}
        onClick={() => jumpToPage(currentPage - 1)}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>

      {/* Ellipsis before window */}
      {startPage > 0 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-xs"
            onClick={() => jumpToPage(0)}
          >
            1
          </Button>
          {startPage > 1 && (
            <span className="text-xs text-muted-foreground px-0.5">&hellip;</span>
          )}
        </>
      )}

      {/* Page number buttons */}
      {pageButtons.map((p) => (
        <Button
          key={p}
          variant={p === currentPage ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7 text-xs font-mono"
          onClick={() => jumpToPage(p)}
        >
          {p + 1}
        </Button>
      ))}

      {/* Ellipsis after window */}
      {endPage < totalPages - 1 && (
        <>
          {endPage < totalPages - 2 && (
            <span className="text-xs text-muted-foreground px-0.5">&hellip;</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-xs"
            onClick={() => jumpToPage(totalPages - 1)}
          >
            {totalPages}
          </Button>
        </>
      )}

      {/* Next */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={currentPage >= totalPages - 1}
        onClick={() => jumpToPage(currentPage + 1)}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
      {/* Last */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={currentPage >= totalPages - 1}
        onClick={() => jumpToPage(totalPages - 1)}
      >
        <ChevronsRight className="h-3.5 w-3.5" />
      </Button>

      {/* Jump-to input */}
      <span className="text-xs text-muted-foreground ml-1">Go to</span>
      <Input
        type="number"
        min={1}
        max={totalPages}
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={handleInputSubmit}
        onKeyDown={handleKeyDown}
        className="h-7 w-14 text-xs text-center font-mono"
      />
    </div>
  );
}
