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
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import { ReportPageSkeleton } from "@/components/ui/table-skeletons";
import { REPORT_CHART_HEIGHT } from "@/lib/reports-chart";
import { DollarSign, Percent, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { ReportMetricCard, reportMetricValueClass } from "./ReportMetricCard";

interface FinancialReportProps {
  startDate: string;
  endDate: string;
}

export function FinancialReport({ startDate, endDate }: FinancialReportProps) {
  const formatCurrency = useCurrency();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "financial" });
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/reports?${params.toString()}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching financial report:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ReportPageSkeleton
        summaryCards={4}
        summaryGridClassName="md:grid-cols-2 lg:grid-cols-4"
        chartCards={2}
        tables={[{ columns: 5, rows: 8 }]}
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

  const showCostMetrics = data.canViewProductCost === true;
  const isProfit = showCostMetrics && data.summary.grossProfit >= 0;

  return (
    <div className="space-y-6">
      {!showCostMetrics && (
        <p className="text-sm text-muted-foreground rounded-lg border bg-muted/30 px-4 py-3">
          Revenue and installments are shown. Cost, gross profit, and margin require the{" "}
          <span className="font-medium text-foreground">VIEW_PRODUCT_COST</span> permission.
        </p>
      )}
      {/* Summary Cards */}
      <div
        className={`grid gap-4 ${showCostMetrics ? "md:grid-cols-4" : "md:grid-cols-1 sm:grid-cols-2"}`}
      >
        <ReportMetricCard
          title="Total Revenue"
          icon={DollarSign}
          iconClassName="bg-amber-500/15 text-amber-800 dark:bg-amber-500/25 dark:text-amber-200"
        >
          <div className={reportMetricValueClass}>
            {formatCurrency(data.summary.totalRevenue)}
          </div>
        </ReportMetricCard>
        {showCostMetrics && (
          <>
            <ReportMetricCard
              title="Total Cost"
              icon={Receipt}
              iconClassName="bg-rose-500/15 text-rose-700 dark:bg-rose-500/25 dark:text-rose-300"
            >
              <div className={reportMetricValueClass}>
                {formatCurrency(data.summary.totalCost)}
              </div>
            </ReportMetricCard>
            <ReportMetricCard
              title="Gross Profit"
              icon={Wallet}
              iconClassName={
                isProfit
                  ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300"
                  : "bg-red-500/15 text-red-700 dark:bg-red-500/25 dark:text-red-300"
              }
            >
              <div
                className={cn(
                  reportMetricValueClass,
                  isProfit
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {formatCurrency(data.summary.grossProfit)}
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                {isProfit ? (
                  <TrendingUp
                    className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  />
                ) : (
                  <TrendingDown
                    className="h-3.5 w-3.5 shrink-0 text-red-500 dark:text-red-400"
                    aria-hidden
                  />
                )}
                {isProfit ? "Above cost line" : "Below cost line"}
              </p>
            </ReportMetricCard>
            <ReportMetricCard
              title="Profit Margin"
              icon={Percent}
              iconClassName={
                isProfit
                  ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300"
                  : "bg-red-500/15 text-red-700 dark:bg-red-500/25 dark:text-red-300"
              }
            >
              <div
                className={cn(
                  reportMetricValueClass,
                  isProfit
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {data.summary.profitMargin.toFixed(2)}%
              </div>
            </ReportMetricCard>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>
              {showCostMetrics ? "Monthly Revenue & Cost" : "Monthly Revenue"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={REPORT_CHART_HEIGHT}>
              <LineChart data={data.monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="month"
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
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(25, 95%, 53%)"
                  strokeWidth={2}
                  name="Revenue"
                />
                {showCostMetrics && (
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={2}
                  name="Cost"
                />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {showCostMetrics && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Monthly Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={REPORT_CHART_HEIGHT}>
              <BarChart data={data.monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="month"
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
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar
                  dataKey="profit"
                  name="Profit"
                >
                  {data.monthlyBreakdown.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.profit >= 0 ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Monthly Breakdown Table */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Monthly Financial Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Revenue</TableHead>
                {showCostMetrics && (
                  <>
                <TableHead>Cost</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Margin</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.monthlyBreakdown.map((month: any) => (
                <TableRow key={month.month}>
                  <TableCell className="font-medium">{month.month}</TableCell>
                  <TableCell>{formatCurrency(month.revenue)}</TableCell>
                  {showCostMetrics && (
                  <>
                  <TableCell>{formatCurrency(month.cost)}</TableCell>
                  <TableCell
                    className={
                      month.profit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"
                    }
                  >
                    {formatCurrency(month.profit)}
                  </TableCell>
                  <TableCell
                    className={
                      month.margin >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"
                    }
                  >
                    {month.margin.toFixed(2)}%
                  </TableCell>
                  </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

