"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, X } from "lucide-react";
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

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

interface AddSaleModalProps {
  children: React.ReactNode;
  onSaleCreated?: () => void;
}

export function AddSaleModal({ children, onSaleCreated }: AddSaleModalProps) {
  const formatCurrency = useCurrency();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>(
    []
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("completed");
  const [isInstallment, setIsInstallment] = useState(false);
  const [downPayment, setDownPayment] = useState(0);
  const [numberOfInstallments, setNumberOfInstallments] = useState(3);
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [items, setItems] = useState<SaleItem[]>([
    { productId: "", quantity: 1, discount: 0 },
  ]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setItems([{ productId: "", quantity: 1, discount: 0 }]);
      setSelectedCategory("all");
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setSelectedCustomerId(null);
      setCustomerSearchQuery("");
      setCustomerSuggestions([]);
      setIsNewCustomer(true);
      setPaymentMethod("cash");
      setNotes("");
      setStatus("completed");
      setIsInstallment(false);
      setDownPayment(0);
      setNumberOfInstallments(3);
      setFrequency("monthly");
      setStartDate(new Date().toISOString().split("T")[0]);
    }
  }, [open]);

  // Debounced customer search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (customerSearchQuery.length >= 2 && !selectedCustomerId) {
        searchCustomers(customerSearchQuery);
      } else {
        setCustomerSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [customerSearchQuery, selectedCustomerId]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        customerInputRef.current &&
        !customerInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchCustomers = async (query: string) => {
    try {
      const response = await fetch(
        `/api/customers/search?q=${encodeURIComponent(query)}&limit=10`
      );
      const data = await response.json();
      setCustomerSuggestions(data.customers || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error searching customers:", error);
      setCustomerSuggestions([]);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerEmail(customer.email || "");
    setCustomerPhone(customer.phone || "");
    setCustomerSearchQuery(customer.name);
    setCustomerSuggestions([]);
    setShowSuggestions(false);
    setIsNewCustomer(false);
  };

  const handleCustomerNameChange = (value: string) => {
    setCustomerName(value);
    setCustomerSearchQuery(value);
    setSelectedCustomerId(null);
    setIsNewCustomer(true);
    if (value.length < 2) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const clearCustomerSelection = () => {
    setSelectedCustomerId(null);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerSearchQuery("");
    setCustomerSuggestions([]);
    setShowSuggestions(false);
    setIsNewCustomer(true);
    customerInputRef.current?.focus();
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/inventory?limit=1000");
      const data = await response.json();
      const uniqueCategories = Array.from(
        new Set(
          data.products?.map((p: Product) => p.category).filter(Boolean) || []
        )
      );
      setCategories(uniqueCategories as string[]);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProductBySku = async (sku: string, index: number) => {
    if (!sku || sku.trim().length === 0) return;

    try {
      const response = await fetch(
        `/api/inventory/search?q=${encodeURIComponent(sku)}&limit=1`
      );
      const data = await response.json();

      if (data.products && data.products.length > 0) {
        const product = data.products[0];
        // Check if SKU matches exactly (case-insensitive)
        if (product.sku.toLowerCase() === sku.toLowerCase()) {
          updateItem(index, "productId", product.id);
        }
      }
    } catch (error) {
      console.error("Error searching product by SKU:", error);
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

  // Fetch product details when needed
  const fetchProductDetails = async (
    productId: string
  ): Promise<Product | null> => {
    try {
      const response = await fetch(`/api/inventory/${productId}`);
      if (response.ok) {
        const product = await response.json();
        return {
          id: product.id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          sku: product.sku,
          category: product.category,
        };
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
    }
    return null;
  };

  // Calculate totals
  const calculateTotals = async () => {
    let subtotal = 0;
    let totalDiscount = 0;

    for (const item of items) {
      if (item.productId) {
        // Try to find in cached products first
        let product = products.find((p) => p.id === item.productId);

        // If not found, fetch it
        if (!product) {
          const fetchedProduct = await fetchProductDetails(item.productId);
          if (fetchedProduct) {
            product = fetchedProduct;
            setProducts([...products, fetchedProduct]);
          }
        }

        if (product) {
          const itemSubtotal = product.price * item.quantity;
          const itemDiscount = item.discount || 0;
          subtotal += itemSubtotal;
          totalDiscount += itemDiscount;
        }
      }
    }

    const total = subtotal - totalDiscount;
    return { subtotal, totalDiscount, total };
  };

  // Synchronous version for display (uses cached products)
  const calculateTotalsSync = () => {
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

  const { subtotal, totalDiscount, total } = calculateTotalsSync();

  // Calculate installment details
  const remainingAmount = total - downPayment;
  const installmentAmount =
    numberOfInstallments > 0 ? remainingAmount / numberOfInstallments : 0;

  // Generate payment schedule preview
  const getPaymentSchedule = () => {
    if (!isInstallment || numberOfInstallments === 0) return [];
    const schedule = [];
    const start = new Date(startDate);
    let daysToAdd = 0;

    switch (frequency) {
      case "weekly":
        daysToAdd = 7;
        break;
      case "bi-weekly":
        daysToAdd = 14;
        break;
      case "monthly":
        daysToAdd = 30;
        break;
      default:
        daysToAdd = 30;
    }

    for (let i = 0; i < numberOfInstallments; i++) {
      const dueDate = new Date(start);
      dueDate.setDate(dueDate.getDate() + i * daysToAdd);
      schedule.push({
        installmentNumber: i + 1,
        dueDate,
        amount: installmentAmount,
      });
    }

    return schedule;
  };

  const paymentSchedule = getPaymentSchedule();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: selectedCustomerId || undefined,
          customerName,
          customerEmail: customerEmail || undefined,
          customerPhone: customerPhone || undefined,
          paymentMethod,
          notes,
          status: isInstallment ? "installment" : status,
          items: items.filter((item) => item.productId && item.quantity > 0),
          ...(isInstallment && {
            installmentPlan: {
              downPayment,
              numberOfInstallments,
              frequency,
              startDate,
            },
          }),
        }),
      });

      if (response.ok) {
        setOpen(false);
        router.refresh();
        onSaleCreated?.();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create sale");
      }
    } catch (error) {
      console.error("Error creating sale:", error);
      alert("Failed to create sale");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Sale</DialogTitle>
          <DialogDescription>Create a new sales transaction</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label htmlFor="customerName">Customer Name *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="customerName"
                  ref={customerInputRef}
                  value={customerSearchQuery}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  onFocus={() => {
                    if (customerSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  placeholder="Type to search or enter new customer..."
                  required
                  className="pl-9 pr-9"
                />
                {selectedCustomerId && (
                  <button
                    type="button"
                    onClick={clearCustomerSelection}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title="Clear customer selection"
                    aria-label="Clear customer selection"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {showSuggestions && customerSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
                  >
                    {customerSuggestions.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="px-4 py-2 hover:bg-accent cursor-pointer border-b last:border-0"
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.email && <span>{customer.email}</span>}
                          {customer.email && customer.phone && <span> • </span>}
                          {customer.phone && <span>{customer.phone}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showSuggestions &&
                  customerSuggestions.length === 0 &&
                  customerSearchQuery.length >= 2 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-2 text-sm text-muted-foreground">
                      A new customer will be created.
                    </div>
                  )}
              </div>
              {selectedCustomerId && (
                <p className="text-xs text-muted-foreground">
                  ✓ Existing customer selected
                </p>
              )}
              {isNewCustomer &&
                customerName.length >= 2 &&
                !selectedCustomerId && (
                  <p className="text-xs text-blue-600">
                    ℹ New customer will be created
                  </p>
                )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Customer Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                disabled={!!selectedCustomerId}
                className={selectedCustomerId ? "bg-muted" : ""}
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
                disabled={!!selectedCustomerId}
                className={selectedCustomerId ? "bg-muted" : ""}
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
              <Select
                value={status}
                onValueChange={setStatus}
                disabled={isInstallment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="installment"
                checked={isInstallment}
                onCheckedChange={(checked) =>
                  setIsInstallment(checked as boolean)
                }
              />
              <Label htmlFor="installment" className="cursor-pointer">
                Create Installment Plan
              </Label>
            </div>
          </div>

          {/* Installment Plan Section */}
          {isInstallment && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
              <div className="font-semibold">Installment Plan Details</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="downPayment">Down Payment ($)</Label>
                  <Input
                    id="downPayment"
                    type="number"
                    min="0"
                    max={total}
                    step="0.01"
                    value={downPayment}
                    onChange={(e) =>
                      setDownPayment(
                        Math.min(total, parseFloat(e.target.value) || 0)
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Remaining: {formatCurrency(remainingAmount)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numberOfInstallments">
                    Number of Installments
                  </Label>
                  <Input
                    id="numberOfInstallments"
                    type="number"
                    min="1"
                    max="60"
                    value={numberOfInstallments}
                    onChange={(e) =>
                      setNumberOfInstallments(
                        Math.max(1, parseInt(e.target.value) || 1)
                      )
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Payment Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment Schedule Preview</Label>
                <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                  <div className="space-y-1 text-sm">
                    {paymentSchedule.map((payment) => (
                      <div
                        key={payment.installmentNumber}
                        className="flex justify-between items-center py-1 border-b last:border-0"
                      >
                        <span>
                          Installment {payment.installmentNumber} - Due:{" "}
                          {formatDate(payment.dueDate)}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between text-sm font-medium pt-2 border-t">
                  <span>Per Installment:</span>
                  <span>{formatCurrency(installmentAmount)}</span>
                </div>
              </div>
            </div>
          )}
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
                <Button type="button" size="sm" onClick={addItem}>
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
                      category={
                        selectedCategory && selectedCategory !== "all"
                          ? selectedCategory
                          : undefined
                      }
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
          <div className="flex justify-end">
            <Button
              type="button"
              // variant="outline"
              size="sm"
              onClick={addItem}
              className=""
            >
              Add Item
            </Button>
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
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Sale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
