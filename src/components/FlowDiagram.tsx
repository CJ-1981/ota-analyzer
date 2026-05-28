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
import { TOOLTIP_CONTENT_STYLE, getStateColor } from "@/lib/chart-helpers";

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
      <CardContent className="p-0">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 20, right: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#757575" }} />
            <YAxis
              dataKey="source"
              type="category"
              width={110}
              tick={{ fontSize: 11, fill: "#000000", fontWeight: 700 }}
            />
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
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
      </CardContent>
    </Card>
  );
}
