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
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SalesOverviewProps {
  data: Array<{
    date: string;
    current: number;
    previous: number;
  }>;
}

export function SalesOverview({ data }: SalesOverviewProps) {
  const [period, setPeriod] = useState<"current" | "previous">("current");

  return (
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Sales Overview</CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod("current")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                period === "current"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              Last 7 days
            </button>
            <button
              onClick={() => setPeriod("previous")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                period === "previous"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              Previous period
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "12px" }}
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
            <Legend />
            <Line
              type="monotone"
              dataKey="current"
              stroke="hsl(250, 95%, 65%)"
              strokeWidth={2}
              name="Current Period"
            />
            <Line
              type="monotone"
              dataKey="previous"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              name="Previous Period"
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

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(217, 70%, 50%)",
  "hsl(217, 50%, 40%)",
];

export function SalesByCategory({ data }: CategorySalesProps) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Sales by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) => `${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
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
              <Legend
                formatter={(value, entry: any) => (
                  <span className="text-sm">
                    {value}: {entry.payload.percentage}%
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

