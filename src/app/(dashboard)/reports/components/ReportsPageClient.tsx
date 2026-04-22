"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeFilter } from "./DateRangeFilter";
import { SalesReport } from "./SalesReport";
import { InventoryReport } from "./InventoryReport";
import { EmployeeReport } from "./EmployeeReport";
import { FinancialReport } from "./FinancialReport";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";

type ReportType = "sales" | "inventory" | "employees" | "financial";

export function ReportsPageClient() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<ReportType>("sales");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const canExport = session?.user?.permissions &&
    hasPermission(session.user.permissions, Permission.EXPORT_REPORTS);

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: activeTab,
      });
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/reports/export?${params.toString()}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${activeTab}-report-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Failed to export report");
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      alert("Failed to export report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            View and analyze your business reports
          </p>
        </div>
        {canExport && (
          <Button
            onClick={handleExport}
            disabled={loading}
            variant="brandOutline"
          >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export
            </>
          )}
          </Button>
        )}
      </div>

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onClear={() => {
          setStartDate("");
          setEndDate("");
        }}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-6">
          <SalesReport startDate={startDate} endDate={endDate} />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <InventoryReport startDate={startDate} endDate={endDate} />
        </TabsContent>

        <TabsContent value="employees" className="mt-6">
          <EmployeeReport startDate={startDate} endDate={endDate} />
        </TabsContent>

        <TabsContent value="financial" className="mt-6">
          <FinancialReport startDate={startDate} endDate={endDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

