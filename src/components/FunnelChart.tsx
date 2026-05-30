import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FunnelStage } from "@/lib/analytics";
import { CHART_PALETTE } from "@/lib/chart-helpers";

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#000" : "#fff";
}

export function FunnelChart({
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
        <CardTitle className="text-base font-bold uppercase tracking-wide">
          Pipeline Funnel
        </CardTitle>
        <CardDescription>
          {entityLabel} progression through stages
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-auto">
        <div className="min-w-[300px]">
        <div className="space-y-2">
          {chartData.map((item, idx) => {
            const barColor = CHART_PALETTE[idx] || "#888";
            const labelColor = getContrastColor(barColor);
            return (
              <div key={item.stage} className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wide text-body w-28 text-right shrink-0 truncate">
                  {item.stage}
                </span>
                <div className="flex-1">
                  <div
                    className="h-8 flex items-center justify-end px-2 transition-all"
                    style={{
                      width: `${Math.max(Number(item.width_pct), 8)}%`,
                      backgroundColor: barColor,
                    }}
                  >
                    <span className="text-xs font-bold" style={{ color: labelColor }}>
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                </div>
                {item.dropoff > 0 && (
                  <span className="text-xs font-bold text-ink shrink-0 w-20 text-right">
                    -{item.dropoff.toLocaleString()} ({item.dropoff_pct}%)
                  </span>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </CardContent>
    </Card>
  );
}
