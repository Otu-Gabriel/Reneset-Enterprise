"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Product {
  id: string;
  name: string;
}

interface FiltersProps {
  onFilterChange: (filters: {
    search: string;
    status: string;
    productId: string;
  }) => void;
}

export function Filters({ onFilterChange }: FiltersProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [productId, setProductId] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportStatus, setExportStatus] = useState("all");
  const [exportProductId, setExportProductId] = useState("all");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    onFilterChange({
      search,
      status: status === "all" ? "" : status,
      productId: productId === "all" ? "" : productId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, productId]);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/inventory?limit=1000");
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportStartDate) params.append("startDate", exportStartDate);
      if (exportEndDate) params.append("endDate", exportEndDate);
      if (exportStatus && exportStatus !== "all") params.append("status", exportStatus);
      if (exportProductId && exportProductId !== "all") params.append("productId", exportProductId);

      const response = await fetch(`/api/sales/export?${params.toString()}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sales-export-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setExportOpen(false);
      } else {
        alert("Failed to export sales");
      }
    } catch (error) {
      console.error("Error exporting sales:", error);
      alert("Failed to export sales");
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setProductId("all");
  };

  const hasActiveFilters = search || (status && status !== "all") || (productId && productId !== "all");

  return (
    <>
      <Card className="bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by customer name or sale number..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="icon"
                onClick={clearFilters}
                title="Clear filters"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Sales to Excel</DialogTitle>
                  <DialogDescription>
                    Select the date range and filters for the export
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={exportStartDate}
                        onChange={(e) => setExportStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={exportEndDate}
                        onChange={(e) => setExportEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exportStatus">Status</Label>
                    <Select value={exportStatus} onValueChange={setExportStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exportProduct">Product</Label>
                    <Select
                      value={exportProductId}
                      onValueChange={setExportProductId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Products" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setExportOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleExport} disabled={exporting}>
                    {exporting ? "Exporting..." : "Export"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
