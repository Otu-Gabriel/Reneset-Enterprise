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
import { formatCurrency } from "@/lib/utils";
import { Edit, Trash2, Search, Eye } from "lucide-react";
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
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const canEdit =
    session?.user?.permissions &&
    hasPermission(session.user.permissions, Permission.EDIT_INVENTORY);
  const canDelete =
    session?.user?.permissions &&
    hasPermission(session.user.permissions, Permission.DELETE_INVENTORY);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page, search, category]);

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

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <>
      <Card className="bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Products</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-9 w-64"
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
                <SelectTrigger className="w-48">
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
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
                    <TableCell>
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
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>
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
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          product.stock <= product.minStock
                            ? "bg-red-500/20 text-red-500"
                            : "bg-green-500/20 text-green-500"
                        }`}
                      >
                        {product.stock <= product.minStock
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleEditClick(e, product)}
                            title="Edit Product"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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
    </>
  );
}
