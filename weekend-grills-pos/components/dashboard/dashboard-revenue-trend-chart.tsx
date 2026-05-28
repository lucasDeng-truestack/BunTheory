'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { DashboardSummary } from '@/types/pos';

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--foreground))',
  },
} satisfies ChartConfig;

type Props = {
  data: DashboardSummary['revenueTrend'];
};

function formatDay(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

export function DashboardRevenueTrendChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatDay(d.date),
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-display text-base">Revenue Trend</CardTitle>
        <CardDescription>Daily revenue — last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-[16/9] max-h-72 w-full">
          <BarChart data={chartData} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [`RM ${Number(value).toFixed(2)}`, 'Revenue']}
                />
              }
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
