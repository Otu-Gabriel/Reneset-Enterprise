"use client";

import { useState, useEffect } from "react";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface SaleItem {
  productId: string;
  quantity: number;
  discount: number;
}

interface AddSaleModalProps {
  children: React.ReactNode;
  onSaleCreated?: () => void;
}

export function AddSaleModal({ children, onSaleCreated }: AddSaleModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
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
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/inventory?limit=1000");
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error);
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
          customerName,
          customerEmail,
          customerPhone,
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
        setCustomerName("");
        setCustomerEmail("");
        setCustomerPhone("");
        setPaymentMethod("cash");
        setNotes("");
        setStatus("completed");
        setIsInstallment(false);
        setDownPayment(0);
        setNumberOfInstallments(3);
        setFrequency("monthly");
        setStartDate(new Date().toISOString().split("T")[0]);
        setItems([{ productId: "", quantity: 1, discount: 0 }]);
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
                onCheckedChange={(checked) => setIsInstallment(checked as boolean)}
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
                      setDownPayment(Math.min(total, parseFloat(e.target.value) || 0))
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
              >
                Add Item
              </Button>
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
                <div key={index} className="space-y-2">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Product</Label>
                      <Select
                        value={item.productId}
                        onValueChange={(value) =>
                          updateItem(index, "productId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - Stock: {product.stock} - $
                              {product.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
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
                    <div className="w-24 space-y-2">
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
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
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
