"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

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

interface ProductDetailsModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailsModal({
  product,
  open,
  onOpenChange,
}: ProductDetailsModalProps) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>Product Details</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Product Image */}
          {product.imageUrl && (
            <div className="relative w-full h-64 rounded-lg overflow-hidden bg-muted">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide image on error
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          {/* Product Information Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">SKU</p>
              <p className="text-base font-semibold">{product.sku}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Category
              </p>
              <p className="text-base font-semibold">{product.category}</p>
            </div>
            {product.brand && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Brand
                </p>
                <p className="text-base font-semibold">{product.brand.name}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Price</p>
              <p className="text-base font-semibold">
                {formatCurrency(product.price)}
              </p>
            </div>
            {product.cost !== null && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Cost
                </p>
                <p className="text-base font-semibold">
                  {formatCurrency(product.cost)}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Stock</p>
              <p className="text-base font-semibold">
                {product.stock} {product.unit}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Min Stock
              </p>
              <p className="text-base font-semibold">
                {product.minStock} {product.unit}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Status
              </p>
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  product.stock <= product.minStock
                    ? "bg-red-500/20 text-red-500"
                    : "bg-green-500/20 text-green-500"
                }`}
              >
                {product.stock <= product.minStock ? "Low Stock" : "In Stock"}
              </span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Description
              </p>
              <p className="text-base whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

