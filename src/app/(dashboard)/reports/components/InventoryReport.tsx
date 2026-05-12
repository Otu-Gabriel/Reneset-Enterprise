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
import { useCurrency } from "@/hooks/useCurrency";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { AlertTriangle, Archive, LayoutGrid, Package, Tags, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportPageSkeleton } from "@/components/ui/table-skeletons";
import { ReportMetricCard, reportMetricValueClass } from "./ReportMetricCard";
import {
  REPORT_CHART_HEIGHT,
  REPORT_CHART_ANGLED_XAXIS_HEIGHT,
} from "@/lib/reports-chart";

interface InventoryReportProps {
  startDate: string;
  endDate: string;
}

const COLORS = [
  "hsl(25, 95%, 53%)",
  "hsl(199, 55%, 38%)",
  "hsl(25, 80%, 44%)",
  "hsl(199, 40%, 48%)",
  "hsl(142, 65%, 42%)",
];

export function InventoryReport({ startDate, endDate }: InventoryReportProps) {
  const { data: session } = useSession();
  const formatCurrency = useCurrency();
  const [data, setData] = useState<any>(null);
  const isAdmin = session?.user?.role === Role.ADMIN;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "inventory" });
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/reports?${params.toString()}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching inventory report:", error);
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
        tables={[{ columns: 5, rows: 8 }, { columns: 3, rows: 8 }]}
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
      <div
        className={cn(
          "grid gap-4",
          isAdmin ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4"
        )}
      >
        <ReportMetricCard
          title="Total Products"
          icon={Package}
          iconClassName="bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary"
        >
          <div className={reportMetricValueClass}>{data.summary.totalProducts}</div>
        </ReportMetricCard>
        <ReportMetricCard
          title="Total Stock Value"
          icon={Wallet}
          iconClassName="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300"
        >
          <div className={reportMetricValueClass}>
            {formatCurrency(data.summary.totalStockValue)}
          </div>
        </ReportMetricCard>
        <ReportMetricCard
          title="Low Stock Items"
          icon={AlertTriangle}
          iconClassName="bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300"
        >
          <div
            className={cn(
              reportMetricValueClass,
              "text-amber-700 dark:text-amber-400"
            )}
          >
            {data.summary.lowStockCount}
          </div>
        </ReportMetricCard>
        <ReportMetricCard
          title="Out of Stock"
          icon={Archive}
          iconClassName="bg-red-500/15 text-red-700 dark:bg-red-500/25 dark:text-red-300"
        >
          <div
            className={cn(reportMetricValueClass, "text-red-600 dark:text-red-400")}
          >
            {data.summary.outOfStockCount}
          </div>
        </ReportMetricCard>
        {isAdmin && (
          <>
            <ReportMetricCard
              title="Total Categories"
              icon={LayoutGrid}
              className="border-primary/20"
              iconClassName="bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary"
            >
              <div className={cn(reportMetricValueClass, "text-primary")}>
                {data.summary.totalCategories ?? 0}
              </div>
            </ReportMetricCard>
            <ReportMetricCard
              title="Total Brands"
              icon={Tags}
              className="border-primary/20"
              iconClassName="bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-300"
            >
              <div className={cn(reportMetricValueClass, "text-primary")}>
                {data.summary.totalBrands ?? 0}
              </div>
            </ReportMetricCard>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Inventory by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={REPORT_CHART_HEIGHT}>
              <BarChart data={data.categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="category"
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
                  }}
                  formatter={(value: number, name: string) =>
                    name === "Product Count"
                      ? [Number(value).toLocaleString(), name]
                      : [formatCurrency(value), name]
                  }
                />
                <Bar dataKey="value" fill="hsl(25, 95%, 53%)" name="Stock Value" />
                <Bar dataKey="count" fill="hsl(199, 55%, 38%)" name="Product Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Most Sold Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={REPORT_CHART_HEIGHT}>
              <BarChart data={data.mostSoldProducts.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
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
                  }}
                />
                <Bar dataKey="quantity" fill="hsl(25, 95%, 53%)" name="Quantity Sold" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {data.lowStockItems.length > 0 && (
        <Card className="bg-card border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Minimum Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lowStockItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.stock}</TableCell>
                    <TableCell>{item.minStock}</TableCell>
                    <TableCell>
                      <span className="text-yellow-600 font-medium">
                        {item.stock === 0 ? "Out of Stock" : "Low Stock"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Most Sold Products Table */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Most Sold Products</CardTitle>
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
              {data.mostSoldProducts.slice(0, 10).map((product: any) => (
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

