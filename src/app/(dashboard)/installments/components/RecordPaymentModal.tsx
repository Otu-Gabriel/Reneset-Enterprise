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
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface InstallmentPayment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
}

interface InstallmentPlan {
  id: string;
  sale: {
    saleNumber: string;
    customerName: string;
  };
  statistics: {
    remainingAmount: number;
  };
}

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: InstallmentPlan;
  onPaymentRecorded: () => void;
}

export function RecordPaymentModal({
  open,
  onOpenChange,
  plan,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [payments, setPayments] = useState<InstallmentPayment[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && plan) {
      fetchPayments();
    }
  }, [open, plan]);

  const fetchPayments = async () => {
    try {
      setFetching(true);
      const response = await fetch(`/api/installments/${plan.id}/payments`);
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setFetching(false);
    }
  };

  const togglePayment = (paymentId: string) => {
    setSelectedPayments((prev) =>
      prev.includes(paymentId)
        ? prev.filter((id) => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const calculateTotalDue = () => {
    return selectedPayments.reduce((sum, paymentId) => {
      const payment = payments.find((p) => p.id === paymentId);
      if (payment) {
        return sum + (payment.amount - payment.paidAmount);
      }
      return sum;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amount = parseFloat(paymentAmount);
      if (!amount || amount <= 0) {
        alert("Please enter a valid payment amount");
        setLoading(false);
        return;
      }

      if (selectedPayments.length === 0) {
        alert("Please select at least one installment to pay");
        setLoading(false);
        return;
      }

      const totalDue = calculateTotalDue();
      if (amount > totalDue) {
        alert(`Payment amount cannot exceed total due: ${formatCurrency(totalDue)}`);
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/installments/${plan.id}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentIds: selectedPayments,
          amount,
          paymentMethod,
          notes,
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        setSelectedPayments([]);
        setPaymentAmount("");
        setPaymentMethod("cash");
        setNotes("");
        onPaymentRecorded();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to record payment");
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      alert("Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const pendingPayments = payments.filter(
    (p) => p.status === "pending" || p.status === "overdue" || p.status === "partial"
  );

  const totalDue = calculateTotalDue();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record payment for {plan.sale.customerName} - {plan.sale.saleNumber}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fetching ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Select Installments to Pay</Label>
                <div className="border rounded-md max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>#</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                            No pending payments
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendingPayments.map((payment) => {
                          const due = payment.amount - payment.paidAmount;
                          const isSelected = selectedPayments.includes(payment.id);
                          return (
                            <TableRow
                              key={payment.id}
                              className={isSelected ? "bg-muted" : ""}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => togglePayment(payment.id)}
                                  disabled={due <= 0}
                                />
                              </TableCell>
                              <TableCell>{payment.installmentNumber}</TableCell>
                              <TableCell>{formatDate(payment.dueDate)}</TableCell>
                              <TableCell>{formatCurrency(payment.amount)}</TableCell>
                              <TableCell>{formatCurrency(payment.paidAmount)}</TableCell>
                              <TableCell>{formatCurrency(due)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    payment.status === "overdue"
                                      ? "border-red-500 text-red-600"
                                      : payment.status === "partial"
                                      ? "border-yellow-500 text-yellow-600"
                                      : ""
                                  }
                                >
                                  {payment.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {selectedPayments.length > 0 && (
                  <div className="text-sm font-medium text-right">
                    Total Due: {formatCurrency(totalDue)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Payment Amount *</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    min="0.01"
                    max={totalDue}
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    placeholder={`Max: ${formatCurrency(totalDue)}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
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

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this payment..."
                />
              </div>
            </>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || selectedPayments.length === 0}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

