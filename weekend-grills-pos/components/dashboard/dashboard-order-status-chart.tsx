'use client';

import { Cell, Pie, PieChart } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { DashboardSummary } from '@/types/pos';

const chartConfig = {
  inProgress: { label: 'In progress', color: 'hsl(25 95% 53%)' },
  completed: { label: 'Completed', color: 'hsl(142 71% 45%)' },
  cancelled: { label: 'Cancelled', color: 'hsl(0 72% 51%)' },
} satisfies ChartConfig;

type Props = {
  breakdown: DashboardSummary['statusBreakdown'];
};

export function DashboardOrderStatusChart({ breakdown }: Props) {
  const chartData = [
    { key: 'inProgress', value: breakdown.inProgress, fill: 'var(--color-inProgress)' },
    { key: 'completed', value: breakdown.completed, fill: 'var(--color-completed)' },
    { key: 'cancelled', value: breakdown.cancelled, fill: 'var(--color-cancelled)' },
  ].filter((d) => d.value > 0);

  const empty = chartData.length === 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-display text-base">Order Status</CardTitle>
        <CardDescription>Last 7 days by outcome</CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-72 w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="key"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="key" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
