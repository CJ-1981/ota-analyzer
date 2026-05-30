import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SankeyLink } from "@/lib/analytics";
import { TOOLTIP_CONTENT_STYLE, getStateColor, getTooltipStyle } from "@/lib/chart-helpers";
import { useIsMobile } from "@/lib/useIsMobile";
import { useChartColors } from "@/lib/useChartColors";

export function FlowDiagram({
  links,
  stateOrder,
  entityLabel,
  entityLabelPlural,
}: {
  links: SankeyLink[];
  stateOrder: string[];
  entityLabel: string;
  entityLabelPlural?: string;
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
  const targetList = [...allTargets].sort((a, b) => {
    const idxA = stateOrder.indexOf(a);
    const idxB = stateOrder.indexOf(b);
    const orderA = idxA === -1 ? stateOrder.length : idxA;
    const orderB = idxB === -1 ? stateOrder.length : idxB;
    return orderA - orderB;
  });

  const isMobile = useIsMobile();
  const cc = useChartColors();

  return (
    <Card className="p-4 gap-4">
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-base font-bold uppercase tracking-wide">
          State Transition Flow
        </CardTitle>
        <CardDescription>
          Horizontal stacked view of state-to-state transitions
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-auto">
        <div className="min-w-[400px]">
        <ResponsiveContainer width="100%" height={isMobile ? Math.max(200, chartData.length * 44) : 350}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={isMobile
              ? { top: 0, right: 8, left: 2, bottom: 0 }
              : { left: 20, right: 20 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke={cc.gridStroke} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 11, fill: cc.tickFill }} />
            <YAxis
              dataKey="source"
              type="category"
              width={isMobile ? 80 : 110}
              tick={{ fontSize: isMobile ? 9 : 11, fill: cc.labelFill, fontWeight: 700 }}
              interval={0}
            />
            <Tooltip
              contentStyle={getTooltipStyle()}
              formatter={(value: number, name: string) => {
                const label = entityLabelPlural ?? `${entityLabel.toLowerCase()}s`;
                return [
                  `${value.toLocaleString()} ${label}`,
                  `→ ${name}`,
                ];
              }}
            />
            <Legend />
            {targetList.map((target) => (
              <Bar
                key={target}
                dataKey={target}
                stackId="a"
                fill={getStateColor(target)}
                name={target}
                radius={0}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
