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
import { useCurrency } from "@/hooks/useCurrency";

interface SalesOverviewProps {
  data: Array<{
    hour: string;
    revenue: number;
  }>;
}

export function SalesOverview({ data }: SalesOverviewProps) {
  const formatCurrency = useCurrency();
  
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Today's Sales by Hour</CardTitle>
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
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(250, 95%, 65%)"
              strokeWidth={2}
              name="Revenue"
              dot={{ fill: "hsl(250, 95%, 65%)", r: 4 }}
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


// Professional color palette with high contrast
const COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#84CC16", // Lime
  "#6366F1", // Indigo
];

export function SalesByCategory({ data }: CategorySalesProps) {
  const formatCurrency = useCurrency();
  
  if (data.length === 0) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Today's Sales by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No sales data for today
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Today's Sales by Category</CardTitle>
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
                fill="#8884d8"
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
          <div className="space-y-3 min-w-[200px]">
            <h4 className="text-sm font-semibold mb-2">Categories</h4>
            {data.map((entry, index) => (
              <div key={entry.category} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {entry.category}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(entry.value)} ({entry.percentage}%)
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
