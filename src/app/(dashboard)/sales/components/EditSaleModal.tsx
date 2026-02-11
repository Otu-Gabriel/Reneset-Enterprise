"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrency } from "@/hooks/useCurrency";
import { ProductSearchInput } from "@/components/ProductSearchInput";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku?: string;
  category?: string;
}

interface SaleItem {
  productId: string;
  quantity: number;
  discount: number;
}

interface Sale {
  id: string;
  saleNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  status: string;
  paymentMethod?: string;
  notes?: string;
  items: Array<{
    productId?: string;
    product: {
      id?: string;
      name: string;
      price?: number;
      stock?: number;
      sku?: string;
      cost?: number | null;
    };
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
  }>;
}

interface EditSaleModalProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaleUpdated?: () => void;
}

export function EditSaleModal({
  sale,
  open,
  onOpenChange,
  onSaleUpdated,
}: EditSaleModalProps) {
  const formatCurrency = useCurrency();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [status, setStatus] = useState("completed");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (sale) {
      setCustomerName(sale.customerName);
      setCustomerEmail(sale.customerEmail || "");
      setCustomerPhone(sale.customerPhone || "");
      setStatus(sale.status);
      setPaymentMethod(sale.paymentMethod || "cash");
      setNotes(sale.notes || "");
      const saleItems = sale.items.map((item) => ({
        productId: item.productId || item.product?.id || "",
        quantity: item.quantity,
        discount: item.discount || 0,
      }));
      setItems(saleItems);
      
      // Cache products from sale items
      const saleProducts = sale.items
        .map((item) => item.product)
        .filter((p) => p.id)
        .map((p) => ({
          id: p.id!,
          name: p.name,
          price: p.price || 0,
          stock: p.stock || 0,
          sku: p.sku,
        }));
      setProducts(saleProducts);
    }
  }, [sale]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/inventory?limit=1000");
      const data = await response.json();
      const uniqueCategories = Array.from(
        new Set(data.products?.map((p: Product) => p.category).filter(Boolean) || [])
      );
      setCategories(uniqueCategories as string[]);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const addItem = () => {
    setItems([...items, { productId: "", quantity: 1, discount: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof SaleItem,
    value: string | number
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;

    items.forEach((item) => {
      if (item.productId) {
        const product = products.find((p) => p.id === item.productId);
        if (product) {
          const itemSubtotal = product.price * item.quantity;
          const itemDiscount = item.discount || 0;
          subtotal += itemSubtotal;
          totalDiscount += itemDiscount;
        }
      }
    });

    const total = subtotal - totalDiscount;
    return { subtotal, totalDiscount, total };
  };

  const { subtotal, totalDiscount, total } = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/sales/${sale.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          status,
          paymentMethod,
          notes,
          items: items.filter((item) => item.productId && item.quantity > 0),
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        onSaleUpdated?.();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update sale");
      }
    } catch (error) {
      console.error("Error updating sale:", error);
      alert("Failed to update sale");
    } finally {
      setLoading(false);
    }
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sale - {sale.saleNumber}</DialogTitle>
          <DialogDescription>
            Update sale information and items
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Customer Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Customer Phone</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this sale..."
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <div className="flex gap-2">
                {categories.length > 0 && (
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                >
                  Add Item
                </Button>
              </div>
            </div>
            {items.map((item, index) => {
              const selectedProduct = products.find(
                (p) => p.id === item.productId
              );
              const stockWarning =
                selectedProduct &&
                item.quantity > selectedProduct.stock &&
                status === "completed";

              return (
                <div key={index} className="space-y-2 border rounded-lg p-4">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Product Search */}
                    <ProductSearchInput
                      value={item.productId}
                      onChange={(productId) =>
                        updateItem(index, "productId", productId)
                      }
                      onProductSelect={(product) => {
                        // Cache the product for totals calculation
                        if (!products.find((p) => p.id === product.id)) {
                          setProducts([...products, product]);
                        }
                      }}
                      category={selectedCategory && selectedCategory !== "all" ? selectedCategory : undefined}
                      inStockOnly={status === "completed"}
                      label="Product (scan barcode or search)"
                      placeholder="Scan barcode or type product name / SKU..."
                    />
                  </div>

                  {/* Quantity and Discount */}
                  <div className="flex gap-2 items-end">
                    <div className="w-32 space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        data-item-index={index}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "quantity",
                            parseInt(e.target.value) || 1
                          )
                        }
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label>Discount ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.discount || 0}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "discount",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    {selectedProduct && (
                      <div className="flex-1 text-sm text-muted-foreground pt-2">
                        <div>
                          Price: {formatCurrency(selectedProduct.price)} ×{" "}
                          {item.quantity} ={" "}
                          {formatCurrency(
                            selectedProduct.price * item.quantity -
                              (item.discount || 0)
                          )}
                        </div>
                      </div>
                    )}
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="mb-2"
                      >
                        ×
                      </Button>
                    )}
                  </div>

                  {/* Stock Warnings */}
                  {stockWarning && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      ⚠️ Insufficient stock! Available: {selectedProduct?.stock}
                      , Requested: {item.quantity}
                    </div>
                  )}
                  {selectedProduct &&
                    !stockWarning &&
                    selectedProduct.stock < 10 &&
                    status === "completed" && (
                      <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                        ⚠️ Low stock warning: Only {selectedProduct.stock} units
                        available
                      </div>
                    )}
                </div>
              );
            })}
          </div>
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Discount:</span>
              <span className="font-medium text-red-600">
                -{formatCurrency(totalDiscount)}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Sale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
