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
import { ChevronDown, Search, X } from "lucide-react";
import { ProductSearchInput } from "@/components/ProductSearchInput";
import { cn } from "@/lib/utils";

const DEFAULT_CUSTOMER_DISPLAY_NAME = ".............";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku?: string;
  category?: string;
  unit?: string;
  baseUnit?: string;
  variations?: Array<{
    name: string;
    quantityInBaseUnit: number;
    price: number;
    cost?: number | null;
  }>;
}

interface SaleItem {
  productId: string;
  quantity: number;
  discount: number;
  saleUnit: string;
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
    null,
  );
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>(
    [],
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("completed");
  const [isInstallment, setIsInstallment] = useState(false);
  const [downPayment, setDownPayment] = useState(0);
  const [numberOfInstallments, setNumberOfInstallments] = useState(3);
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [items, setItems] = useState<SaleItem[]>([
    { productId: "", quantity: 1, discount: 0, saleUnit: "item" },
  ]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setItems([{ productId: "", quantity: 1, discount: 0, saleUnit: "item" }]);
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
      setMoreDetailsOpen(false);
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
        `/api/customers/search?q=${encodeURIComponent(query)}&limit=10`,
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
          data.products?.map((p: Product) => p.category).filter(Boolean) || [],
        ),
      );
      setCategories(uniqueCategories as string[]);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { productId: "", quantity: 1, discount: 0, saleUnit: "item" },
    ]);
  };

  const cacheProductIfNeeded = async (productId: string) => {
    if (!productId) return;
    if (products.some((p) => p.id === productId)) return;
    const fetchedProduct = await fetchProductDetails(productId);
    if (fetchedProduct) {
      setProducts((prev) =>
        prev.some((p) => p.id === fetchedProduct.id) ? prev : [...prev, fetchedProduct],
      );
    }
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof SaleItem,
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  useEffect(() => {
    const missingIds = items
      .map((item) => item.productId)
      .filter((id): id is string => Boolean(id) && !products.some((p) => p.id === id));

    if (missingIds.length === 0) return;
    missingIds.forEach((id) => {
      cacheProductIfNeeded(id);
    });
  }, [items, products]);

  // Fetch product details when needed
  const fetchProductDetails = async (
    productId: string,
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
          unit: product.unit,
          baseUnit: product.baseUnit,
          variations: product.variations,
        };
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
    }
    return null;
  };

  const normalizeVariations = (product: Product) => {
    const raw = Array.isArray(product.variations) ? product.variations : [];
    const normalized = raw
      .map((variation) => ({
        name: String(variation.name || "").trim(),
        quantityInBaseUnit: Number(variation.quantityInBaseUnit || 0),
        price: Number(variation.price || 0),
      }))
      .filter((variation) => variation.name && variation.quantityInBaseUnit > 0);

    if (normalized.length > 0) return normalized;
    return [
      {
        name: product.baseUnit || product.unit || "item",
        quantityInBaseUnit: 1,
        price: Number(product.price || 0),
      },
    ];
  };

  const getVariation = (product: Product, saleUnit: string) => {
    const variations = normalizeVariations(product);
    return (
      variations.find((v) => v.name.toLowerCase() === saleUnit.toLowerCase()) ||
      variations.find((v) => v.quantityInBaseUnit === 1) ||
      variations[0]
    );
  };

  const getItemUnitPrice = (product: Product, saleUnit: string) => {
    const variation = getVariation(product, saleUnit);
    return variation ? variation.price : product.price;
  };

  const getBaseQuantity = (product: Product, item: SaleItem) => {
    const variation = getVariation(product, item.saleUnit);
    return item.quantity * (variation?.quantityInBaseUnit || 1);
  };

  const formatStockDisplay = (product: Product) => {
    return `${product.stock} ${product.baseUnit || product.unit || "items"}`;
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
          const itemSubtotal = getItemUnitPrice(product, item.saleUnit) * item.quantity;
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
          const itemSubtotal = getItemUnitPrice(product, item.saleUnit) * item.quantity;
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
      const trimmedForSave = selectedCustomerId
        ? customerName.trim()
        : customerSearchQuery.trim() || customerName.trim();
      const customerNameToSave =
        trimmedForSave || DEFAULT_CUSTOMER_DISPLAY_NAME;

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: selectedCustomerId || undefined,
          customerName: customerNameToSave,
          customerEmail: customerEmail || undefined,
          customerPhone: customerPhone || undefined,
          paymentMethod,
          notes,
          status: isInstallment ? "installment" : status,
          items: items
            .filter((item) => item.productId && item.quantity > 0)
            .map((item) => ({
              ...item,
              saleUnit: item.saleUnit,
            })),
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
          <div className="grid grid-cols-1 gap-4 bg-muted/50 p-4 rounded-lg sm:grid-cols-2">
            <div className="space-y-2 relative">
              <Label htmlFor="customerName">Customer Name</Label>
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
              <Label htmlFor="customerPhone">Customer Phone</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                disabled={!!selectedCustomerId}
                className={selectedCustomerId ? "bg-muted" : ""}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
            <button
              type="button"
              onClick={() => setMoreDetailsOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/50"
              aria-expanded={moreDetailsOpen}
            >
              <span>More</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  moreDetailsOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {moreDetailsOpen && (
              <div className="space-y-4 border-t border-border bg-muted/50 p-4">
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method *</Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={setPaymentMethod}
                    >
                      <SelectTrigger id="paymentMethod">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="mobile_money">
                          Mobile Money
                        </SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={status}
                      onValueChange={setStatus}
                      disabled={isInstallment}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-1">
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
            )}
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
                    value={downPayment === 0 ? "" : downPayment}
                    placeholder="0"
                    onChange={(e) => {
                      const raw = e.target.value;
                      setDownPayment(
                        raw === ""
                          ? 0
                          : Math.min(total, parseFloat(raw) || 0),
                      );
                    }}
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
                        Math.max(1, parseInt(e.target.value) || 1),
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
          <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
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
                {/* <Button type="button" size="sm" onClick={addItem}>
                  Add Item
                </Button> */}
              </div>
            </div>
            {items.map((item, index) => {
              const selectedProduct = products.find(
                (p) => p.id === item.productId,
              );
              const stockWarning =
                selectedProduct &&
                getBaseQuantity(selectedProduct, item) > selectedProduct.stock &&
                status === "completed";

              return (
                <div key={index} className="space-y-2 border rounded-lg p-4 bg-accent ">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Product Search */}
                    <ProductSearchInput
                      value={item.productId}
                      onChange={(productId) => {
                        updateItem(index, "productId", productId);
                        cacheProductIfNeeded(productId);
                      }}
                      onProductSelect={async (product) => {
                        setProducts((prev) => {
                          const existingIndex = prev.findIndex((p) => p.id === product.id);
                          if (existingIndex === -1) return [...prev, product];
                          const next = [...prev];
                          next[existingIndex] = { ...next[existingIndex], ...product };
                          return next;
                        });
                        await cacheProductIfNeeded(product.id);
                        const firstVariation =
                          normalizeVariations(product).find((v) => v.quantityInBaseUnit === 1) ||
                          normalizeVariations(product)[0];
                        if (firstVariation?.name) {
                          updateItem(index, "saleUnit", firstVariation.name);
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
                    {selectedProduct && normalizeVariations(selectedProduct).length > 0 && (
                      <div className="w-40 space-y-2">
                        <Label>Sell As</Label>
                        <Select
                          value={item.saleUnit}
                          onValueChange={(value) =>
                            updateItem(index, "saleUnit", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {normalizeVariations(selectedProduct).map((variation) => (
                              <SelectItem key={variation.name} value={variation.name}>
                                {variation.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
                            parseInt(e.target.value) || 1,
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
                        value={item.discount === 0 ? "" : item.discount}
                        placeholder="0"
                        onChange={(e) => {
                          const raw = e.target.value;
                          updateItem(
                            index,
                            "discount",
                            raw === "" ? 0 : parseFloat(raw) || 0,
                          );
                        }}
                      />
                    </div>
                    {selectedProduct && (
                      <div className="flex-1 text-sm text-muted-foreground pt-2">
                        <div>
                          Price: {formatCurrency(getItemUnitPrice(selectedProduct, item.saleUnit))} ×{" "}
                          {item.quantity} ={" "}
                          {formatCurrency(
                            getItemUnitPrice(selectedProduct, item.saleUnit) * item.quantity -
                              (item.discount || 0),
                          )}
                        </div>
                        <div>
                          Stock: {formatStockDisplay(selectedProduct)}
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
                      ⚠️ Insufficient stock! Available: {formatStockDisplay(selectedProduct!)}
                      , Requested: {getBaseQuantity(selectedProduct!, item)} item(s)
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
              Buy More
            </Button>
          </div>
          <div className="border-t pt-4 space-y-2 bg-muted/50 p-4 rounded-lg">
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
            <div className="flex justify-between text-base font-bold border-t pt-2 sm:text-lg">
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
