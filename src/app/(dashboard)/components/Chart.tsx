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
} from "recharts";
import { Clock, PieChart as PieChartIcon } from "lucide-react";
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Today&apos;s Sales by Hour
        </CardTitle>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            "bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300"
          )}
        >
          <Clock className="h-4 w-4" aria-hidden />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis
              dataKey="hour"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "12px" }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "12px" }}
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
              dot={{ fill: "hsl(25, 95%, 53%)", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Today&apos;s Sales by Category
          </CardTitle>
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              "bg-violet-500/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300"
            )}
          >
            <PieChartIcon className="h-4 w-4" aria-hidden />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No sales data for today
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Today&apos;s Sales by Category
        </CardTitle>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            "bg-violet-500/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300"
          )}
        >
          <PieChartIcon className="h-4 w-4" aria-hidden />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) =>
                  percentage > 5 ? `${percentage}%` : ""
                }
                outerRadius={100}
                innerRadius={40}
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
          <div className="min-w-[200px] space-y-3">
            <h4 className="mb-2 text-sm font-semibold text-foreground">
              Categories
            </h4>
            {data.map((entry, index) => (
              <div key={entry.category} className="flex items-center gap-3">
                <div
                  className="h-4 w-4 shrink-0 rounded-full shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">
                    {entry.category}
                  </div>
                  <div className="text-xs font-medium text-primary">
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
