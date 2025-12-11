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
import { useCurrency } from "@/hooks/useCurrency";
import { Edit, Trash2, Search, Eye, Plus, Download, Upload } from "lucide-react";
import { useSession } from "next-auth/react";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductDetailsModal } from "./ProductDetailsModal";
import { EditItemModal } from "./EditItemModal";
import { AddStockModal } from "./AddStockModal";
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
  description: string | null;
  sku: string;
  category: string;
  price: number;
  cost: number | null;
  stock: number;
  minStock: number;
  unit: string;
  imageUrl: string | null;
  brand: {
    id: string;
    name: string;
  } | null;
}

export function InventoryTable() {
  const formatCurrency = useCurrency();
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [stockStatus, setStockStatus] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [addingStockProduct, setAddingStockProduct] = useState<Product | null>(null);
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const canEdit =
    session?.user?.permissions &&
    hasPermission(session.user.permissions, Permission.EDIT_INVENTORY);
  const canDelete =
    session?.user?.permissions &&
    hasPermission(session.user.permissions, Permission.DELETE_INVENTORY);
  const canCreate =
    session?.user?.permissions &&
    hasPermission(session.user.permissions, Permission.CREATE_INVENTORY);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page, search, category, stockStatus]);

  // Expose refresh function for external use
  useEffect(() => {
    (window as any).refreshInventoryTable = fetchProducts;
    return () => {
      delete (window as any).refreshInventoryTable;
    };
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) params.append("search", search);
      if (category && category !== "all") params.append("category", category);
      if (stockStatus && stockStatus !== "all") params.append("stockStatus", stockStatus);

      const response = await fetch(`/api/inventory?${params}`);
      const data = await response.json();
      setProducts(data.products || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/inventory?limit=1000");
      const data = await response.json();
      const uniqueCategories = [
        ...new Set(data.products?.map((p: Product) => p.category) || []),
      ];
      setCategories(uniqueCategories as string[]);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleRowClick = (product: Product) => {
    setSelectedProduct(product);
    setDetailsOpen(true);
  };

  const handleViewClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation(); // Prevent row click
    setSelectedProduct(product);
    setDetailsOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation(); // Prevent row click
    setEditingProduct(product);
    setEditOpen(true);
  };

  const handleAddStockClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation(); // Prevent row click
    setAddingStockProduct(product);
    setAddStockOpen(true);
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

      const response = await fetch("/api/inventory/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setImportResults(data.results);
        fetchProducts();
        if (data.results.failed === 0) {
          setImportOpen(false);
          setImportFile(null);
        }
      } else {
        alert(data.error || "Failed to import products");
      }
    } catch (error) {
      console.error("Error importing products:", error);
      alert("Failed to import products");
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category && category !== "all") params.append("category", category);
      if (stockStatus && stockStatus !== "all") params.append("stockStatus", stockStatus);

      const response = await fetch(`/api/inventory/export?${params.toString()}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `products-export-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Failed to export products");
      }
    } catch (error) {
      console.error("Error exporting products:", error);
      alert("Failed to export products");
    } finally {
      setExporting(false);
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
            <CardTitle className="text-xl sm:text-2xl">Products</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-9 w-full sm:w-64"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={stockStatus}
                onValueChange={(value) => {
                  setStockStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Status</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exporting}
                className="w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                {exporting ? "Exporting..." : "Export"}
              </Button>
              {canCreate && (
                <Dialog open={importOpen} onOpenChange={setImportOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import Products from Excel</DialogTitle>
                      <DialogDescription>
                        Upload an Excel file with columns: Name, SKU, Category, Price, Description (optional), Brand (optional), Cost (optional), Stock (optional), Min Stock (optional), Unit (optional), Image URL (optional)
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
                                {importResults.errors.slice(0, 10).map((error, idx) => (
                                  <li key={idx}>{error}</li>
                                ))}
                                {importResults.errors.length > 10 && (
                                  <li>
                                    ... and {importResults.errors.length - 10} more
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
                      <Button onClick={handleImport} disabled={importing || !importFile}>
                        {importing ? "Importing..." : "Import"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="hidden sm:table-cell">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">SKU</TableHead>
                <TableHead className="hidden lg:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Brand</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleRowClick(product)}
                  >
                    <TableCell className="hidden sm:table-cell">
                      {product.imageUrl ? (
                        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs">
                          No Image
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{product.sku}</TableCell>
                    <TableCell className="hidden lg:table-cell">{product.category}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {product.brand ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {product.brand.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell>
                      {product.stock} {product.unit}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          product.stock === 0
                            ? "bg-gray-500/20 text-gray-500"
                            : product.stock <= product.minStock
                            ? "bg-red-500/20 text-red-500"
                            : "bg-green-500/20 text-green-500"
                        }`}
                      >
                        {product.stock === 0
                          ? "Out of Stock"
                          : product.stock <= product.minStock
                          ? "Low Stock"
                          : "In Stock"}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleViewClick(e, product)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleAddStockClick(e, product)}
                              title="Add Stock"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleEditClick(e, product)}
                              title="Edit Product"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
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
      <ProductDetailsModal
        product={selectedProduct}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
      <EditItemModal
        product={editingProduct}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingProduct(null);
        }}
        onSuccess={fetchProducts}
      />
      <AddStockModal
        product={addingStockProduct}
        open={addStockOpen}
        onOpenChange={(open) => {
          setAddStockOpen(open);
          if (!open) setAddingStockProduct(null);
        }}
        onSuccess={fetchProducts}
      />
    </>
  );
}
