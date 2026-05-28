"use client";

import { useMemo } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
        <div className="max-h-[32rem] overflow-y-auto">
          <Table>
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
                      <TableCell className="font-mono text-xs">
                        {eid}
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
        <div className="flex items-center justify-between pt-4 border-t border-hairline">
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
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => onPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= tableTotalPages - 1}
              onClick={() => onPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
