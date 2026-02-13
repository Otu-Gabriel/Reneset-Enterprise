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
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmployeeReportProps {
  startDate: string;
  endDate: string;
}

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(217, 70%, 50%)",
  "hsl(217, 50%, 40%)",
  "hsl(250, 95%, 65%)",
  "hsl(250, 85%, 55%)",
];

export function EmployeeReport({ startDate, endDate }: EmployeeReportProps) {
  const formatCurrency = useCurrency();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: "employees" });
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/reports?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch employee report: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Verify we got valid data from the database
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid data received from server');
      }
      
      // Ensure summary data exists
      if (!result.summary) {
        throw new Error('Invalid report data: missing summary');
      }
      
      setData(result);
    } catch (error) {
      console.error("Error fetching employee report:", error);
      setError(error instanceof Error ? error.message : "Failed to load employee data");
      setData(null);
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

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-destructive font-medium">Error loading employee report</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={fetchData}
              className="text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
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
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Employee Report</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {startDate || endDate 
              ? `Showing employees hired between ${startDate || "start"} and ${endDate || "end"}`
              : "Showing all employees"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary?.totalEmployees || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.employees?.length || 0} {startDate || endDate ? "in date range" : "total"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.summary?.activeEmployees || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary?.totalEmployees 
                ? `${Math.round((data.summary.activeEmployees / data.summary.totalEmployees) * 100)}% of total`
                : "0% of total"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.summary?.inactiveEmployees || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary?.totalEmployees 
                ? `${Math.round((data.summary.inactiveEmployees / data.summary.totalEmployees) * 100)}% of total`
                : "0% of total"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Sales Employee</CardTitle>
          </CardHeader>
          <CardContent>
            {data.summary?.topSalesEmployee ? (
              <>
                <div className="text-lg font-bold truncate">
                  {data.summary.topSalesEmployee.name}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(data.summary.topSalesEmployee.totalRevenue)} revenue
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.summary.topSalesEmployee.salesCount} {data.summary.topSalesEmployee.salesCount === 1 ? "sale" : "sales"}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                <p className="text-xs text-muted-foreground mt-1">
                  No sales data available
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Employees by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {data.departmentBreakdown && data.departmentBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.departmentBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis
                    dataKey="department"
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: "12px" }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
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
                  />
                  <Bar dataKey="count" fill="hsl(217, 91%, 60%)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No department data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Employees by Position</CardTitle>
          </CardHeader>
          <CardContent>
            {data.positionBreakdown && data.positionBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.positionBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ position, count }) => `${position}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.positionBreakdown.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No position data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Sales Performance */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Sales Performance by Employee</CardTitle>
        </CardHeader>
        <CardContent>
          {data.employeeSales && data.employeeSales.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Sales Count</TableHead>
                  <TableHead>Total Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.employeeSales.map((employee: any) => (
                  <TableRow key={employee.userId || employee.email}>
                    <TableCell className="font-medium">{employee.name || "Unknown"}</TableCell>
                    <TableCell>{employee.email || "N/A"}</TableCell>
                    <TableCell>{employee.salesCount || 0}</TableCell>
                    <TableCell>{formatCurrency(employee.totalRevenue || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No sales data available for the selected period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>
            {startDate || endDate ? "Employees in Date Range" : "All Employees"}
            {data.employees && data.employees.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({data.employees.length} {data.employees.length === 1 ? "employee" : "employees"})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.employees && data.employees.length > 0 ? (
                data.employees.map((employee: any) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name || "N/A"}</TableCell>
                    <TableCell>{employee.email || "N/A"}</TableCell>
                    <TableCell>{employee.phone || "N/A"}</TableCell>
                    <TableCell>{employee.position || "N/A"}</TableCell>
                    <TableCell>{employee.department || "N/A"}</TableCell>
                    <TableCell>
                      {employee.salary ? formatCurrency(employee.salary) : "N/A"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          employee.status === "active"
                            ? "text-green-600 font-medium"
                            : "text-red-600 font-medium"
                        }
                      >
                        {employee.status || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {employee.hireDate ? formatDate(employee.hireDate) : "N/A"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={employee.address || ""}>
                      {employee.address || "N/A"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {startDate || endDate 
                      ? "No employees found in the selected date range"
                      : "No employees found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

