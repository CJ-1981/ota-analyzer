import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FunnelStage } from "@/lib/analytics";
import { CHART_PALETTE } from "@/lib/chart-helpers";

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
