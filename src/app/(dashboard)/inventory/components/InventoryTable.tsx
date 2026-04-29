"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  Edit,
  Trash2,
  Search,
  Eye,
  Plus,
  Download,
  Upload,
  Loader2,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

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
  baseUnit?: string;
  variations?: Array<{
    name: string;
    quantityInBaseUnit: number;
    price: number;
    cost?: number | null;
  }>;
  imageUrl: string | null;
  brand: {
    id: string;
    name: string;
  } | null;
}

type StockBreakdown =
  | { kind: "simple"; label: string }
  | {
      kind: "variations";
      parts: { qty: number; name: string }[];
      totalBase: number;
      baseUnit: string;
    };

const STOCK_PART_CHIP = [
  "border-primary/30 bg-primary/12 text-primary dark:bg-primary/18",
  "border-sky-500/30 bg-sky-500/12 text-sky-800 dark:text-sky-300 dark:bg-sky-500/15",
  "border-emerald-500/30 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 dark:bg-emerald-500/15",
  "border-amber-500/35 bg-amber-500/12 text-amber-900 dark:text-amber-300 dark:bg-amber-500/15",
  "border-violet-500/30 bg-violet-500/12 text-violet-800 dark:text-violet-300 dark:bg-violet-500/15",
] as const;

function getStockBreakdown(product: Product): StockBreakdown {
  if (!Array.isArray(product.variations) || product.variations.length === 0) {
    return {
      kind: "simple",
      label: `${product.stock} ${product.baseUnit || product.unit}`,
    };
  }
  const sorted = [...product.variations].sort(
    (a, b) => Number(b.quantityInBaseUnit) - Number(a.quantityInBaseUnit),
  );
  let remaining = product.stock;
  const parts: { qty: number; name: string }[] = [];
  sorted.forEach((variation) => {
    const size = Number(variation.quantityInBaseUnit);
    if (size <= 0) return;
    const qty = Math.floor(remaining / size);
    if (qty > 0) {
      parts.push({ qty, name: variation.name });
      remaining -= qty * size;
    }
  });
  if (!parts.length) {
    return {
      kind: "simple",
      label: `${product.stock} ${product.baseUnit || "item"}`,
    };
  }
  return {
    kind: "variations",
    parts,
    totalBase: product.stock,
    baseUnit: product.baseUnit || "base",
  };
}

function StockDisplayCell({ product }: { product: Product }) {
  const b = getStockBreakdown(product);
  if (b.kind === "simple") {
    return (
      <span className="text-sm tabular-nums text-foreground">{b.label}</span>
    );
  }
  return (
    <div className="min-w-[9rem] max-w-[17rem]">
      <div className="flex flex-wrap items-center gap-1">
        {b.parts.map((p, i) => (
          <span
            key={`${p.name}-${i}`}
            className={cn(
              "inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold leading-tight tabular-nums",
              STOCK_PART_CHIP[i % STOCK_PART_CHIP.length],
            )}
          >
            <span className="truncate">
              {p.qty} {p.name}
            </span>
          </span>
        ))}
      </div>
      <div className="mt-1.5 border-t border-border/70 pt-1.5 text-[11px] leading-snug text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground/90">
          {b.totalBase}
        </span>{" "}
        <span className="text-muted-foreground">{b.baseUnit}</span>
        <span className="ml-1 text-[10px] uppercase tracking-wide text-primary/90">
          total
        </span>
      </div>
    </div>
  );
}

export function InventoryTable() {
  const getBaseVariationPrice = (product: Product) => {
    if (!Array.isArray(product.variations) || product.variations.length === 0) {
      return product.price;
    }
    const base = product.variations.find((v) => Number(v.quantityInBaseUnit) === 1);
    return Number((base || product.variations[0]).price || product.price);
  };

  const formatCurrency = useCurrency();
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const isFirstFetch = useRef(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  /** What the user types (instant). */
  const [searchInput, setSearchInput] = useState("");
  /** Debounced value used for API & export. */
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [stockStatus, setStockStatus] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [addingStockProduct, setAddingStockProduct] = useState<Product | null>(
    null
  );
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
    const id = setTimeout(() => {
      setSearch((prev) => {
        if (prev !== searchInput) {
          setPage(1);
        }
        return searchInput;
      });
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

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
      if (isFirstFetch.current) {
        setInitialLoading(true);
      } else {
        setIsRefreshing(true);
      }
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) params.append("search", search);
      if (category && category !== "all") params.append("category", category);
      if (stockStatus && stockStatus !== "all")
        params.append("stockStatus", stockStatus);

      const response = await fetch(`/api/inventory?${params}`);
      const data = await response.json();
      setProducts(data.products || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setInitialLoading(false);
      setIsRefreshing(false);
      isFirstFetch.current = false;
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/inventory?limit=1000");
      const data = await response.json();
      const uniqueCategories = Array.from(
        new Set(data.products?.map((p: Product) => p.category) || [])
      );
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

  const handleDownloadImportTemplate = async () => {
    try {
      const response = await fetch("/api/inventory/import/template", {
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Download failed");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "inventory-import-template.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert("Failed to download template");
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

      const response = await fetch("/api/inventory/import", {
        method: "POST",
        body: formData,
        credentials: "include",
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
      if (stockStatus && stockStatus !== "all")
        params.append("stockStatus", stockStatus);

      const response = await fetch(
        `/api/inventory/export?${params.toString()}`
      );
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

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm">Loading products…</p>
      </div>
    );
  }

  return (
    <>
      <Card className="bg-card border-border/80 shadow-sm">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-xl font-semibold text-foreground sm:text-2xl">
                Products
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Search, filter, and manage inventory &amp; stock levels
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
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
                <Dialog open={importOpen} onOpenChange={setImportOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Bulk import products</DialogTitle>
                      <DialogDescription asChild>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>
                            Use <strong>CSV</strong> or <strong>Excel</strong>{" "}
                            (.csv, .xlsx, .xls). Rows with the same{" "}
                            <strong>ProductSKU</strong> define one product and
                            its variations.
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-left">
                            <li>
                              <strong>Required (first row of each SKU):</strong>{" "}
                              ProductName, Category, and at least one variation
                              row (or legacy <strong>Price</strong> on a single
                              row).
                            </li>
                            <li>
                              <strong>Per variation:</strong> VariationName,
                              QuantityInBaseUnit, VariationPrice; optional
                              VariationCost.
                            </li>
                            <li>
                              <strong>Optional:</strong> BaseUnit, Brand,
                              Description, Stock, MinStock, FallbackCost
                              (product fallback when a variation has no cost),
                              ImageURL.
                            </li>
                            <li>
                              <strong>Legacy:</strong> one row per SKU with
                              columns Price (and optional Cost / VariationCost)
                              instead of variation columns — same as before,
                              now stored as a single base-unit variation.
                            </li>
                          </ul>
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full sm:w-auto"
                        onClick={handleDownloadImportTemplate}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download template (CSV)
                      </Button>
                      <div className="space-y-2">
                        <Label htmlFor="file">CSV or Excel file</Label>
                        <Input
                          id="file"
                          type="file"
                          accept=".csv,.xlsx,.xls"
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
                    <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-end">
                      <Button
                        type="button"
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
                        type="button"
                        onClick={handleImport}
                        disabled={importing || !importFile}
                      >
                        {importing ? "Importing..." : "Import"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 flex-1 sm:min-w-[220px] sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search name, SKU, category…"
                className="h-10 pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoComplete="off"
                aria-busy={isRefreshing}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-2">
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full sm:w-[11rem]">
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
                <SelectTrigger className="h-10 w-full sm:w-[11rem]">
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Status</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="relative overflow-x-auto">
            {isRefreshing && (
              <div
                className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-background/40 pt-12 backdrop-blur-[1px]"
                aria-live="polite"
              >
                <span className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Updating results…
                </span>
              </div>
            )}
            <Table
              className={`min-w-full ${isRefreshing ? "opacity-60 transition-opacity" : ""}`}
            >
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden sm:table-cell">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden w-[1%] whitespace-nowrap md:table-cell">
                    SKU
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Category
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Brand</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="min-w-[10rem]">Stock</TableHead>
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
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell align-top">
                        <span className="font-mono text-[11px] leading-snug text-muted-foreground">
                          {product.sku}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {product.category}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {product.brand ? (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {product.brand.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(getBaseVariationPrice(product))}</TableCell>
                      <TableCell className="align-top">
                        <StockDisplayCell product={product} />
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
