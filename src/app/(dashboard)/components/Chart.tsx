"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Clock, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";

interface SalesOverviewProps {
  data: Array<{
    hour: string;
    revenue: number;
  }>;
}

export function SalesOverview({ data }: SalesOverviewProps) {
  const formatCurrency = useCurrency();

  return (
    <Card className="bg-card border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
        <CardTitle className="text-sm font-semibold">
          Today&apos;s Sales by Hour
        </CardTitle>
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            "bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300"
          )}
        >
          <Clock className="h-3.5 w-3.5" aria-hidden />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis
              dataKey="hour"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 9 }}
              angle={-40}
              textAnchor="end"
              height={46}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 9 }}
              width={36}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--popover-foreground))",
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(25, 95%, 53%)"
              strokeWidth={2}
              name="Revenue"
              dot={{ fill: "hsl(25, 95%, 53%)", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface TopProductsTodayProps {
  data: Array<{ name: string; quantity: number }>;
}

export function TopProductsToday({ data }: TopProductsTodayProps) {
  if (data.length === 0) {
    return (
      <Card className="bg-card border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
          <CardTitle className="text-sm font-semibold">
            Most sold today (units)
          </CardTitle>
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
              "bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-300"
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
            No sales today
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    shortName:
      d.name.length > 14 ? `${d.name.slice(0, 12)}…` : d.name,
  }));

  return (
    <Card className="bg-card border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
        <CardTitle className="text-sm font-semibold">
          Most sold today (units)
        </CardTitle>
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            "bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-300"
          )}
        >
          <BarChart3 className="h-3.5 w-3.5" aria-hidden />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -14, bottom: 2 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis
              dataKey="shortName"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 9 }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={52}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 9 }}
              width={28}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--popover-foreground))",
                fontSize: "12px",
              }}
              formatter={(value: number) => [value, "Units"]}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.name ?? ""
              }
            />
            <Bar
              dataKey="quantity"
              name="Units sold"
              fill="hsl(199, 55%, 42%)"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface CategorySalesProps {
  data: Array<{
    category: string;
    value: number;
    percentage: number;
  }>;
}

// / Tooltip styles that work in light and dark mode (Recharts injects defaults that hide text in dark mode)
const CHART_TOOLTIP_STYLE = {
  content: {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--popover-foreground))",
  } as React.CSSProperties,
  label: { color: "hsl(var(--popover-foreground))" } as React.CSSProperties,
  item: { color: "hsl(var(--popover-foreground))" } as React.CSSProperties,
};

// Custom Pie chart tooltip so text is always visible (Recharts default content can ignore contentStyle in dark mode)
function PieChartTooltipContent(props: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload?: { category?: string } }>;
  formatter: (value: number) => string;
}) {
  const { active, payload, formatter } = props;
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const label = item.payload?.category ?? item.name ?? "";
  const value = formatter(item.value);
  return (
    <div
      style={{
        ...CHART_TOOLTIP_STYLE.content,
        padding: "8px 12px",
      }}
    >
      <div style={CHART_TOOLTIP_STYLE.label}>{label}</div>
      <div style={{ ...CHART_TOOLTIP_STYLE.item, fontWeight: 600 }}>{value}</div>
    </div>
  );
}


/* Brand-forward palette: orange + navy-teal + supporting accents */
const COLORS = [
  "hsl(25, 95%, 53%)",
  "hsl(199, 55%, 38%)",
  "hsl(25, 80%, 44%)",
  "hsl(199, 40%, 48%)",
  "hsl(142, 65%, 42%)",
  "hsl(45, 90%, 48%)",
  "hsl(25, 70%, 62%)",
  "hsl(199, 35%, 55%)",
  "hsl(168, 55%, 40%)",
  "hsl(32, 85%, 55%)",
];

export function SalesByCategory({ data }: CategorySalesProps) {
  const formatCurrency = useCurrency();
  
  if (data.length === 0) {
    return (
      <Card className="bg-card border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Today&apos;s Sales by Category
          </CardTitle>
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
              "bg-violet-500/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300"
            )}
          >
            <PieChartIcon className="h-3.5 w-3.5" aria-hidden />
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
            No sales data for today
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
        <CardTitle className="text-sm font-semibold">
          Today&apos;s Sales by Category
        </CardTitle>
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            "bg-violet-500/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300"
          )}
        >
          <PieChartIcon className="h-3.5 w-3.5" aria-hidden />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex flex-col items-center justify-center gap-3 lg:flex-row">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) =>
                  percentage > 5 ? `${percentage}%` : ""
                }
                outerRadius={72}
                innerRadius={44}
                fill="hsl(25, 95%, 53%)"
                dataKey="value"
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={
                  <PieChartTooltipContent formatter={formatCurrency} />
                }
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Custom Legend */}
          <div className="min-w-0 max-w-full space-y-2 sm:min-w-[160px]">
            <h4 className="mb-1 text-[10px] font-semibold text-foreground sm:text-xs">
              Categories
            </h4>
            {data.map((entry, index) => (
              <div key={entry.category} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 shrink-0 rounded-full shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10px] font-medium text-foreground sm:text-xs">
                    {entry.category}
                  </div>
                  <div className="text-[10px] font-medium text-primary sm:text-xs">
                    {formatCurrency(entry.value)}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({entry.percentage}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
