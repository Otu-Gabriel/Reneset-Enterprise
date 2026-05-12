"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import {
  REPORT_CHART_HEIGHT,
  REPORT_CHART_ANGLED_XAXIS_HEIGHT,
  REPORT_PIE_OUTER_RADIUS,
  REPORT_PIE_INNER_RADIUS,
} from "@/lib/reports-chart";
import { ReportPageSkeleton } from "@/components/ui/table-skeletons";
import { ReportMetricCard, reportMetricValueClass } from "./ReportMetricCard";
import { DollarSign, ShoppingCart, BadgePercent } from "lucide-react";

interface SalesReportProps {
  startDate: string;
  endDate: string;
}

// Tooltip styles that work in light and dark mode (Recharts injects defaults that hide text in dark mode)
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

export function SalesReport({ startDate, endDate }: SalesReportProps) {
  const formatCurrency = useCurrency();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "sales" });
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/reports?${params.toString()}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching sales report:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ReportPageSkeleton
        summaryCards={3}
        summaryGridClassName="md:grid-cols-3"
        chartCards={2}
        tables={[{ columns: 3, rows: 8 }]}
      />
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <ReportMetricCard
          title="Total Revenue"
          icon={DollarSign}
          iconClassName="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300"
        >
          <div className={reportMetricValueClass}>
            {formatCurrency(data.summary.totalRevenue)}
          </div>
        </ReportMetricCard>
        <ReportMetricCard
          title="Total Orders"
          icon={ShoppingCart}
          iconClassName="bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-300"
        >
          <div className={reportMetricValueClass}>{data.summary.totalOrders}</div>
        </ReportMetricCard>
        <ReportMetricCard
          title="Average Order Value"
          icon={BadgePercent}
          iconClassName="bg-violet-500/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300"
        >
          <div className={reportMetricValueClass}>
            {formatCurrency(data.summary.averageOrderValue)}
          </div>
        </ReportMetricCard>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Daily Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={REPORT_CHART_HEIGHT}>
              <LineChart data={data.dailySales}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--muted))"
                />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: "0.75rem" }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: "0.75rem" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(25, 95%, 53%)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>
              Sales by Category
              {startDate || endDate
                ? ` (${startDate ? formatDate(startDate) : "Start"} - ${endDate ? formatDate(endDate) : "End"})`
                : " (All Time)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data.categorySales || data.categorySales.length === 0 ? (
              <div
                className="flex items-center justify-center text-muted-foreground"
                style={{ height: REPORT_CHART_HEIGHT }}
              >
                No sales data for selected period
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 lg:flex-row">
                <ResponsiveContainer width="100%" height={REPORT_CHART_HEIGHT}>
                  <PieChart>
                    <Pie
                      data={data.categorySales}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => {
                        const total = data.categorySales.reduce(
                          (sum: number, item: any) => sum + item.value,
                          0
                        );
                        const percentage =
                          total > 0
                            ? Math.round((entry.value / total) * 100)
                            : 0;
                        return percentage > 5 ? `${percentage}%` : "";
                      }}
                      outerRadius={REPORT_PIE_OUTER_RADIUS}
                      innerRadius={REPORT_PIE_INNER_RADIUS}
                      fill="hsl(25, 95%, 53%)"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {data.categorySales.map((entry: any, index: number) => (
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

                {/* Custom Legend - same style as dashboard */}
                <div className="space-y-3 min-w-[200px]">
                  <h4 className="text-sm font-semibold mb-2">Categories</h4>
                  {(() => {
                    const total = data.categorySales.reduce(
                      (sum: number, item: any) => sum + item.value,
                      0
                    );
                    return data.categorySales.map(
                      (entry: any, index: number) => {
                        const percentage =
                          total > 0
                            ? Math.round((entry.value / total) * 100)
                            : 0;
                        return (
                          <div
                            key={entry.category || entry.name}
                            className="flex items-center gap-3"
                          >
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {entry.category || entry.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatCurrency(entry.value)} ({percentage}%)
                              </div>
                            </div>
                          </div>
                        );
                      }
                    );
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={REPORT_CHART_HEIGHT}>
              <BarChart data={data.topProducts.slice(0, 10)}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--muted))"
                />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: "0.75rem" }}
                  angle={-45}
                  textAnchor="end"
                  height={REPORT_CHART_ANGLED_XAXIS_HEIGHT}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: "0.75rem" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="revenue" fill="hsl(25, 95%, 53%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={REPORT_CHART_HEIGHT}>
              <BarChart data={data.paymentMethods}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--muted))"
                />
                <XAxis
                  dataKey="method"
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: "0.75rem" }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: "0.75rem" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="value" fill="hsl(199, 55%, 38%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Quantity Sold</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topProducts.slice(0, 10).map((product: any) => (
                <TableRow key={product.name}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.quantity}</TableCell>
                  <TableCell>{formatCurrency(product.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
