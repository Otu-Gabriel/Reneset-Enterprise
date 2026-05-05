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
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";

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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
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
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold tabular-nums sm:text-2xl">
              {formatCurrency(data.summary.totalRevenue)}
            </div>
          </CardContent>
        </Card>
        {showCostMetrics && (
          <>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold tabular-nums sm:text-2xl">
              {formatCurrency(data.summary.totalCost)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">Gross Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold tabular-nums sm:text-2xl flex items-center gap-2 ${isProfit ? "text-green-600" : "text-red-600"}`}>
              {isProfit ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              {formatCurrency(data.summary.grossProfit)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold tabular-nums sm:text-2xl ${isProfit ? "text-green-600" : "text-red-600"}`}>
              {data.summary.profitMargin.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
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
            <ResponsiveContainer width="100%" height={300}>
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
            <ResponsiveContainer width="100%" height={300}>
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

