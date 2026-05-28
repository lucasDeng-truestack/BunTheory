'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
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
  revenue: { label: 'Revenue (RM)', color: 'hsl(25 95% 53%)' },
  orders: { label: 'Orders', color: 'hsl(142 71% 45%)' },
} satisfies ChartConfig;

type Props = {
  data: DashboardSummary['revenueTrend'];
};

function formatDay(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

export function DashboardOrdersRevenueChart({ data }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatDay(d.date),
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-display text-base">Orders & Revenue</CardTitle>
        <CardDescription>Completed orders vs daily revenue</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-[16/9] max-h-72 w-full">
          <AreaChart data={chartData} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `RM${v}`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-revenue)"
              fill="var(--color-revenue)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="orders"
              stroke="var(--color-orders)"
              fill="var(--color-orders)"
              fillOpacity={0.12}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
