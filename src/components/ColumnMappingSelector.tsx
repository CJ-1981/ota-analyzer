import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ColumnMapping } from "@/lib/types";

export function ColumnMappingSelector({
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
              {opt.optional && <SelectItem value="__none__">— not mapped —</SelectItem>}
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
