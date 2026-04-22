"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/hooks/useCurrency";
import { formatDate } from "@/lib/utils";
import { Edit, Trash2, Search, Plus, Eye, Download, Upload } from "lucide-react";
import { useSession } from "next-auth/react";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { CustomerDetailsModal } from "./CustomerDetailsModal";
import { AddCustomerModal } from "./AddCustomerModal";
import { EditCustomerModal } from "./EditCustomerModal";
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

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  notes: string | null;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  statistics: {
    totalSales: number;
    totalSpent: number;
    lastPurchaseDate: string | null;
  };
}

export function CustomersTable() {
  const formatCurrency = useCurrency();
  const { data: session } = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const canCreate =
    session?.user?.permissions &&
    hasPermission(session.user.permissions, Permission.CREATE_CUSTOMERS);
  const canEdit =
    session?.user?.permissions &&
    hasPermission(session.user.permissions, Permission.EDIT_CUSTOMERS);
  const canDelete =
    session?.user?.permissions &&
    hasPermission(session.user.permissions, Permission.DELETE_CUSTOMERS);

  useEffect(() => {
    fetchCustomers();
  }, [page, search, status]);

  // Extract customers from sales on mount if no customers exist
  useEffect(() => {
    const extractCustomers = async () => {
      try {
        const response = await fetch("/api/customers?limit=1");
        const data = await response.json();
        if (data.customers && data.customers.length === 0) {
          // Try to extract from sales
          const extractResponse = await fetch("/api/customers/extract", {
            method: "POST",
          });
          if (extractResponse.ok) {
            await extractResponse.json();
            // Refresh customers list
            fetchCustomers();
          }
        }
      } catch (error) {
        console.error("Error checking/extracting customers:", error);
      }
    };
    extractCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) params.append("search", search);
      if (status && status !== "all") params.append("status", status);

      const response = await fetch(`/api/customers?${params}`);
      const data = await response.json();
      setCustomers(data.customers || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchCustomers();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete customer");
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("Failed to delete customer");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (status && status !== "all") params.append("status", status);

      const response = await fetch(`/api/customers/export?${params.toString()}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `customers-export-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Failed to export customers");
      }
    } catch (error) {
      console.error("Error exporting customers:", error);
      alert("Failed to export customers");
    } finally {
      setExporting(false);
    }
  };

  const handleExtract = async () => {
    if (!confirm("This will extract customers from existing sales. Continue?")) {
      return;
    }

    setExtracting(true);
    try {
      const response = await fetch("/api/customers/extract", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        alert(
          `Extraction complete!\nCreated: ${data.summary.customersCreated}\nLinked: ${data.summary.salesLinked} sales`
        );
        fetchCustomers();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to extract customers");
      }
    } catch (error) {
      console.error("Error extracting customers:", error);
      alert("Failed to extract customers");
    } finally {
      setExtracting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert("Please select a file");
      return;
    }

    setImporting(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const response = await fetch("/api/customers/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setImportResults(data.results);
        fetchCustomers();
        if (data.results.failed === 0) {
          setImportOpen(false);
          setImportFile(null);
        }
      } else {
        alert(data.error || "Failed to import customers");
      }
    } catch (error) {
      console.error("Error importing customers:", error);
      alert("Failed to import customers");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <>
      <Card className="bg-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl sm:text-2xl sm:hidden">Customers</CardTitle>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search customers..."
                  className="pl-9 w-full sm:w-64"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleExtract}
                disabled={extracting}
                className="w-full sm:w-auto"
                title="Extract customers from existing sales"
              >
                {extracting ? "Extracting..." : "Extract from Sales"}
              </Button>
              <Button
                variant="brandOutline"
                onClick={handleExport}
                disabled={exporting}
                className="w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                {exporting ? "Exporting..." : "Export"}
              </Button>
              {canCreate && (
                <>
                  <AddCustomerModal onSuccess={fetchCustomers}>
                    <Button className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Customer
                    </Button>
                  </AddCustomerModal>
                  <Dialog open={importOpen} onOpenChange={setImportOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Import Customers from Excel</DialogTitle>
                        <DialogDescription>
                          Upload an Excel file with columns: Name, Email (optional), Phone (optional), Address (optional), City (optional), State (optional), Country (optional), Postal Code (optional), Notes (optional), Tags (optional), Status (optional)
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="file">Excel File</Label>
                          <Input
                            id="file"
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) =>
                              setImportFile(e.target.files?.[0] || null)
                            }
                          />
                        </div>
                        {importResults && (
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="font-medium mb-2">
                              Import Results: {importResults.success} succeeded,{" "}
                              {importResults.failed} failed
                            </p>
                            {importResults.errors.length > 0 && (
                              <div className="mt-2 max-h-40 overflow-y-auto">
                                <p className="text-sm font-medium text-red-600 mb-1">
                                  Errors:
                                </p>
                                <ul className="text-sm text-muted-foreground list-disc list-inside">
                                  {importResults.errors
                                    .slice(0, 10)
                                    .map((error, idx) => (
                                      <li key={idx}>{error}</li>
                                    ))}
                                  {importResults.errors.length > 10 && (
                                    <li>
                                      ... and {importResults.errors.length - 10}{" "}
                                      more
                                    </li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setImportOpen(false);
                            setImportFile(null);
                            setImportResults(null);
                          }}
                        >
                          Close
                        </Button>
                        <Button
                          onClick={handleImport}
                          disabled={importing || !importFile}
                        >
                          {importing ? "Importing..." : "Import"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead>Total Sales</TableHead>
                  <TableHead className="hidden lg:table-cell">Total Spent</TableHead>
                  <TableHead className="hidden md:table-cell">Last Purchase</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setDetailsOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">
                        {customer.name}
                        {customer.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {customer.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                              >
                                {tag}
                              </span>
                            ))}
                            {customer.tags.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{customer.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="text-sm">{customer.email}</div>
                          )}
                          {customer.phone && (
                            <div className="text-sm text-muted-foreground">
                              {customer.phone}
                            </div>
                          )}
                          {!customer.email && !customer.phone && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {customer.city || customer.state ? (
                          <div className="text-sm">
                            {[customer.city, customer.state]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{customer.statistics.totalSales}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatCurrency(customer.statistics.totalSpent)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {customer.statistics.lastPurchaseDate
                          ? formatDate(customer.statistics.lastPurchaseDate)
                          : "Never"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            customer.status === "active"
                              ? "bg-green-500/20 text-green-500"
                              : customer.status === "blocked"
                              ? "bg-red-500/20 text-red-500"
                              : "bg-gray-500/20 text-gray-500"
                          }`}
                        >
                          {customer.status}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setDetailsOpen(true);
                            }}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingCustomer(customer);
                                setEditOpen(true);
                              }}
                              title="Edit Customer"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(customer.id)}
                              title="Delete Customer"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <CustomerDetailsModal
        customerId={selectedCustomer?.id || null}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
      <EditCustomerModal
        customer={editingCustomer}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingCustomer(null);
        }}
        onSuccess={fetchCustomers}
      />
    </>
  );
}

