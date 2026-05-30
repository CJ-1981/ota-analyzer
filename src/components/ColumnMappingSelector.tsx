import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RotateCcw } from "lucide-react";
import type { ColumnMapping } from "@/lib/types";

export type MappingField = {
  key: keyof ColumnMapping;
  label: string;
  description: string;
  optional: boolean;
  /** Regex patterns used by autoDetectColumns to match this field */
  patterns: RegExp[];
};

export const MAPPING_FIELDS: MappingField[] = [
  {
    key: "entityId",
    label: "Entity ID",
    description: "Unique identifier (e.g. VIN, user_id, order_id)",
    optional: false,
    patterns: [/^vin$/, /^vehicle_id$/, /^vehicle$/, /_id$/, /^id$/, /^order$/, /^user/],
  },
  {
    key: "timestamp",
    label: "Timestamp",
    description: "Date/time column (e.g. ts, timestamp, created_at)",
    optional: false,
    patterns: [/^timestamp$/, /^time$/, /^date$/, /^created/, /^updated/, /_at$/, /_time$/],
  },
  {
    key: "state",
    label: "State / Status",
    description: "Current state (e.g. status, stage, phase)",
    optional: false,
    patterns: [/^state$/, /^status$/, /^stage$/, /^phase$/, /^step$/],
  },
  {
    key: "progress",
    label: "Progress",
    description: "Completion percentage (e.g. pct, progress)",
    optional: true,
    patterns: [/^progress$/, /^pct$/, /^percent/, /^completion/, /^pct_complete$/],
  },
  {
    key: "sizeField",
    label: "Package Size",
    description: "Data size in MB (e.g. size, mb, bytes)",
    optional: true,
    patterns: [/^size$/, /^mb$/, /^bytes$/, /^package/, /^file_size$/],
  },
  {
    key: "condition",
    label: "Condition / Error",
    description: "Failure reason (e.g. error, reason, failure_code)",
    optional: true,
    patterns: [/^error$/, /^reason$/, /^condition$/, /^failure$/, /^code$/, /^error_code$/],
  },
];

/** Check whether a column name would be auto-detected for a given mapping field */
export function isAutoMatch(column: string, field: MappingField): boolean {
  const lower = column.toLowerCase();
  return field.patterns.some((pat) => pat.test(lower));
}

export function ColumnMappingSelector({
  columns,
  mapping,
  onChange,
  autoDetectedMapping,
}: {
  columns: string[];
  mapping: ColumnMapping;
  onChange: (m: ColumnMapping) => void;
  /** The mapping produced by autoDetectColumns — used to show match badges */
  autoDetectedMapping?: ColumnMapping | null;
}) {
  const set = (key: keyof ColumnMapping, val: string) => {
    onChange({ ...mapping, [key]: val === "__none__" ? undefined : val });
  };

  return (
    <div className="space-y-3">
      {/* Summary: auto-detect status */}
      {autoDetectedMapping && (
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span className="font-bold uppercase tracking-wider text-muted-foreground">
            Auto-detected:
          </span>
          <span className="flex flex-wrap gap-1">
            {MAPPING_FIELDS.map((f) => {
              const mapped = autoDetectedMapping[f.key];
              if (!mapped) {
                return f.optional ? null : (
                  <Badge key={f.key} variant="destructive" className="text-[10px] px-1.5 py-0">
                    {f.label}: not found
                  </Badge>
                );
              }
              return (
                <Badge key={f.key} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {f.label} → <span className="font-mono">{mapped}</span>
                </Badge>
              );
            })}
          </span>
        </div>
      )}

      {/* Dropdown selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MAPPING_FIELDS.map((field) => {
          const currentValue = mapping[field.key];
          const wasAutoDetected = autoDetectedMapping?.[field.key];
          const isAutoMatched = currentValue && isAutoMatch(currentValue, field);

          return (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                {field.label}
                {field.optional && (
                  <span className="text-muted-foreground/60">(optional)</span>
                )}
                {currentValue && wasAutoDetected === currentValue && (
                  <Sparkles className="h-3 w-3 text-amber-500" />
                )}
              </Label>
              <div className="text-[10px] text-muted-foreground/60 -mt-0.5">
                {field.description}
              </div>
              <Select
                value={currentValue || "__none__"}
                onValueChange={(v) => set(field.key, v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {field.optional && <SelectItem value="__none__">— not mapped —</SelectItem>}
                  {columns.map((c) => {
                    const matched = isAutoMatch(c, field);
                    return (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-1.5">
                          {c}
                          {matched && c !== currentValue && (
                            <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
