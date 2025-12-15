"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { Loader2, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InstallmentPayment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  paymentDate: string | null;
  status: string;
  paymentMethod: string | null;
  notes: string | null;
}

interface InstallmentPlan {
  id: string;
  sale: {
    saleNumber: string;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    totalAmount: number;
    items: Array<{
      product: {
        name: string;
      };
      quantity: number;
      price: number;
      subtotal: number;
    }>;
  };
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  numberOfInstallments: number;
  installmentAmount: number;
  frequency: string;
  startDate: string;
  status: string;
  notes: string | null;
  statistics: {
    totalPaid: number;
    remainingAmount: number;
    paidInstallments: number;
    remainingInstallments: number;
    overduePayments: number;
  };
  payments: InstallmentPayment[];
}

interface InstallmentDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
}

export function InstallmentDetailsModal({
  open,
  onOpenChange,
  planId,
}: InstallmentDetailsModalProps) {
  const formatCurrency = useCurrency();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<InstallmentPlan | null>(null);

  useEffect(() => {
    if (open && planId) {
      fetchPlanDetails();
    }
  }, [open, planId]);

  const fetchPlanDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/installments/${planId}`);
      if (response.ok) {
        const data = await response.json();
        setPlan(data);
      }
    } catch (error) {
      console.error("Error fetching plan details:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            Paid
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            Overdue
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            Partial
          </Badge>
        );
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (loading || !plan) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Installment Plan Details</DialogTitle>
          <DialogDescription>
            {plan.sale.saleNumber} - {plan.sale.customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(plan.totalAmount)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(plan.statistics.totalPaid)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Remaining</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(plan.statistics.remainingAmount)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {plan.statistics.paidInstallments} /{" "}
                  {plan.numberOfInstallments}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round(
                    (plan.statistics.paidInstallments /
                      plan.numberOfInstallments) *
                      100
                  )}
                  % Complete
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Plan Information */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Customer:</span>
                  <div className="font-medium">{plan.sale.customerName}</div>
                  {plan.sale.customerEmail && (
                    <div className="text-muted-foreground">
                      {plan.sale.customerEmail}
                    </div>
                  )}
                  {plan.sale.customerPhone && (
                    <div className="text-muted-foreground">
                      {plan.sale.customerPhone}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Frequency:</span>
                  <div className="font-medium capitalize">{plan.frequency}</div>
                  <span className="text-muted-foreground">Start Date:</span>
                  <div className="font-medium">
                    {formatDate(plan.startDate)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Down Payment:</span>
                  <div className="font-medium">
                    {formatCurrency(plan.downPayment)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Per Installment:
                  </span>
                  <div className="font-medium">
                    {formatCurrency(plan.installmentAmount)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sale Items */}
          <Card>
            <CardHeader>
              <CardTitle>Sale Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.sale.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.product.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.price)}</TableCell>
                      <TableCell>{formatCurrency(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Payment Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.installmentNumber}</TableCell>
                      <TableCell>{formatDate(payment.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        {formatCurrency(payment.paidAmount)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(payment.amount - payment.paidAmount)}
                      </TableCell>
                      <TableCell>
                        {payment.paymentDate
                          ? formatDate(payment.paymentDate)
                          : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Payment History */}
          <PaymentHistorySection planId={planId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PaymentHistoryItem {
  paymentId: string;
  installmentNumber: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string | null;
  notes: string | null;
  recordedBy: {
    name: string;
    email: string;
    recordedAt: string;
  } | null;
}

interface PaymentHistorySectionProps {
  planId: string;
}

function PaymentHistorySection({ planId }: PaymentHistorySectionProps) {
  const formatCurrency = useCurrency();
  const [loading, setLoading] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>(
    []
  );

  useEffect(() => {
    fetchPaymentHistory();
  }, [planId]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/installments/${planId}/payment-history`
      );
      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data.paymentHistory || []);
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (paymentHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No payment history available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Installment #</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Recorded By</TableHead>
              <TableHead>Recorded At</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentHistory.map((item) => (
              <TableRow key={item.paymentId}>
                <TableCell className="font-medium">
                  #{item.installmentNumber}
                </TableCell>
                <TableCell className="font-semibold text-green-600">
                  {formatCurrency(item.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {item.paymentMethod || "N/A"}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(item.paymentDate)}</TableCell>
                <TableCell>
                  {item.recordedBy ? (
                    <div>
                      <div className="font-medium">{item.recordedBy.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.recordedBy.email}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unknown</span>
                  )}
                </TableCell>
                <TableCell>
                  {item.recordedBy ? (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(item.recordedBy.recordedAt)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate" title={item.notes || ""}>
                    {item.notes || "-"}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
