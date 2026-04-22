"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
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
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { Edit, Trash2, Eye } from "lucide-react";
import { useSession } from "next-auth/react";
import { Permission, Role } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { SaleDetailsModal } from "./SaleDetailsModal";
import { EditSaleModal } from "./EditSaleModal";
import { saleItemLineCogs } from "@/lib/product-variations";

interface Sale {
  id: string;
  saleNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  totalAmount: number;
  saleDate: string;
  status: string;
  paymentMethod?: string;
  notes?: string;
  items: Array<{
    productId?: string;
    product: {
      id?: string;
      name: string;
      sku: string;
      cost?: number | null;
    };
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
    lineCOGS?: number | null;
  }>;
  user?: {
    name: string;
    email: string;
  };
}

export interface SalesTableRef {
  refresh: () => void;
}

interface SalesTableProps {
  filters?: {
    search: string;
    status: string;
    productId: string;
  };
  onSaleChanged?: () => void; // Callback when sale is created, updated, or deleted
}

export const SalesTable = forwardRef<SalesTableRef, SalesTableProps>(
  ({ filters = { search: "", status: "", productId: "" }, onSaleChanged }, ref) => {
    const formatCurrency = useCurrency();
    const { data: session } = useSession();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const canEdit =
      session?.user?.permissions &&
      hasPermission(session.user.permissions, Permission.EDIT_SALES);
    const canDelete =
      session?.user?.permissions &&
      hasPermission(session.user.permissions, Permission.DELETE_SALES);
    const isAdmin =
      session?.user?.role === Role.ADMIN ||
      (session?.user?.permissions &&
        hasPermission(session.user.permissions, Permission.FULL_ACCESS));

    useImperativeHandle(ref, () => ({
      refresh: fetchSales,
    }));

    useEffect(() => {
      fetchSales();
    }, [page, filters]);

    const fetchSales = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", "10");
        if (filters.search) params.append("search", filters.search);
        if (filters.status) params.append("status", filters.status);
        if (filters.productId) params.append("productId", filters.productId);

        const response = await fetch(`/api/sales?${params.toString()}`);
        const data = await response.json();
        setSales(data.sales || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } catch (error) {
        console.error("Error fetching sales:", error);
      } finally {
        setLoading(false);
      }
    };

    const handleDelete = async (id: string) => {
      if (!confirm("Are you sure you want to delete this sale?")) return;

      try {
        const response = await fetch(`/api/sales/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          fetchSales();
          onSaleChanged?.();
        }
      } catch (error) {
        console.error("Error deleting sale:", error);
      }
    };

    const handleViewDetails = async (saleId: string) => {
      try {
        const response = await fetch(`/api/sales/${saleId}`);
        if (response.ok) {
          const sale = await response.json();
          setSelectedSale(sale);
          setDetailsOpen(true);
        }
      } catch (error) {
        console.error("Error fetching sale details:", error);
      }
    };

    const handleEdit = async (saleId: string) => {
      try {
        const response = await fetch(`/api/sales/${saleId}`);
        if (response.ok) {
          const sale = await response.json();
          setSelectedSale(sale);
          setEditOpen(true);
        }
      } catch (error) {
        console.error("Error fetching sale for edit:", error);
      }
    };

    const getProductNames = (items: Sale["items"]) => {
      return items.map((item) => item.product.name).join(", ");
    };

    const calculateProfit = (sale: Sale): number => {
      return sale.items.reduce(
        (total, item) => total + item.subtotal - saleItemLineCogs(item),
        0
      );
    };

    if (loading) {
      return <div className="text-center py-8">Loading...</div>;
    }

    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Sales Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No sales found
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(sale.id)}
                  >
                    <TableCell className="font-medium">
                      {sale.saleNumber}
                    </TableCell>
                    <TableCell>{sale.customerName}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {getProductNames(sale.items)}
                    </TableCell>
                    <TableCell>{formatDate(sale.saleDate)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{formatCurrency(sale.totalAmount)}</span>
                        {isAdmin && (
                          <span className="text-xs text-primary font-medium mt-1">
                            Profit: {formatCurrency(calculateProfit(sale))}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          sale.status === "completed"
                            ? "bg-green-500/20 text-green-500"
                            : "bg-yellow-500/20 text-yellow-500"
                        }`}
                      >
                        {sale.status}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(sale.id)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(sale.id)}
                            title="Edit Sale"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(sale.id)}
                            title="Delete Sale"
                          >
                            <Trash2 className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
        <SaleDetailsModal
          sale={selectedSale}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
        <EditSaleModal
          sale={selectedSale}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaleUpdated={() => {
            fetchSales();
            onSaleChanged?.();
          }}
        />
      </Card>
    );
  }
);

SalesTable.displayName = "SalesTable";
