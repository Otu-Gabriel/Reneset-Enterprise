"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrency } from "@/hooks/useCurrency";
import { formatDate } from "@/lib/utils";
import {
  Loader2,
  Mail,
  Phone,
  MapPin,
  Tag,
  Calendar,
  DollarSign,
  ShoppingCart,
  CreditCard,
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  notes: string | null;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  statistics: {
    totalSales: number;
    totalSpent: number;
    averageOrderValue: number;
    lastPurchaseDate: string | null;
    firstPurchaseDate: string | null;
    activeInstallments: number;
    pendingPayments: number;
  };
  sales: Array<{
    id: string;
    saleNumber: string;
    totalAmount: number;
    status: string;
    paymentMethod: string | null;
    saleDate: string;
    items: Array<{
      product: {
        name: string;
        sku: string;
      };
      quantity: number;
      price: number;
      subtotal: number;
    }>;
    user: {
      name: string;
      email: string;
    } | null;
    installmentPlan: {
      id: string;
      status: string;
      remainingAmount: number;
      payments: Array<{
        status: string;
        dueDate: string;
        amount: number;
        paidAmount: number;
      }>;
    } | null;
  }>;
}

interface CustomerDetailsModalProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailsModal({
  customerId,
  open,
  onOpenChange,
}: CustomerDetailsModalProps) {
  const formatCurrency = useCurrency();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && customerId) {
      fetchCustomerDetails();
    } else {
      setCustomer(null);
    }
  }, [open, customerId]);

  const fetchCustomerDetails = async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/customers/${customerId}`);
      if (response.ok) {
        const data = await response.json();
        setCustomer(data);
      }
    } catch (error) {
      console.error("Error fetching customer details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!customerId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
          <DialogDescription>
            Complete information and purchase history
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : customer ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sales">Purchase History</TabsTrigger>
              <TabsTrigger value="installments">Installments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Name
                      </p>
                      <p className="text-base font-semibold">{customer.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Status
                      </p>
                      <Badge
                        className={
                          customer.status === "active"
                            ? "bg-green-500/20 text-green-500"
                            : customer.status === "blocked"
                              ? "bg-red-500/20 text-red-500"
                              : "bg-gray-500/20 text-gray-500"
                        }
                      >
                        {customer.status}
                      </Badge>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Email
                          </p>
                          <p className="text-base">{customer.email}</p>
                        </div>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Phone
                          </p>
                          <p className="text-base">{customer.phone}</p>
                        </div>
                      </div>
                    )}
                    {(customer.address || customer.city || customer.state) && (
                      <div className="flex items-start gap-2 md:col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Address
                          </p>
                          <p className="text-base">
                            {[
                              customer.address,
                              customer.city,
                              customer.state,
                              customer.postalCode,
                              customer.country,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      </div>
                    )}
                    {customer.tags.length > 0 && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          Tags
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {customer.tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {customer.notes && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Notes
                        </p>
                        <p className="text-base whitespace-pre-wrap">
                          {customer.notes}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Member Since
                        </p>
                        <p className="text-base">
                          {formatDate(customer.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Sales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      {customer.statistics.totalSales}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Lifetime Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      {formatCurrency(customer.statistics.totalSpent)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Avg Order Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(customer.statistics.averageOrderValue)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Active Installments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      {customer.statistics.activeInstallments}
                    </div>
                    {customer.statistics.pendingPayments > 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        {formatCurrency(customer.statistics.pendingPayments)}{" "}
                        pending
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Purchase Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Purchase Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {customer.statistics.firstPurchaseDate && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          First Purchase
                        </span>
                        <span className="text-sm font-medium">
                          {formatDate(customer.statistics.firstPurchaseDate)}
                        </span>
                      </div>
                    )}
                    {customer.statistics.lastPurchaseDate && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Last Purchase
                        </span>
                        <span className="text-sm font-medium">
                          {formatDate(customer.statistics.lastPurchaseDate)}
                        </span>
                      </div>
                    )}
                    {customer.statistics.totalSales > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Days Since Last Purchase
                        </span>
                        <span className="text-sm font-medium">
                          {customer.statistics.lastPurchaseDate
                            ? Math.floor(
                                (new Date().getTime() -
                                  new Date(
                                    customer.statistics.lastPurchaseDate
                                  ).getTime()) /
                                  (1000 * 60 * 60 * 24)
                              )
                            : "-"}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sales" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Purchase History ({customer.sales.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {customer.sales.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      No purchase history
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sale #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Sales Person</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customer.sales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell className="font-medium">
                                {sale.saleNumber}
                              </TableCell>
                              <TableCell>{formatDate(sale.saleDate)}</TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {sale.items.slice(0, 2).map((item, idx) => (
                                    <div key={idx} className="text-sm">
                                      {item.quantity}x {item.product.name}
                                    </div>
                                  ))}
                                  {sale.items.length > 2 && (
                                    <div className="text-xs text-muted-foreground">
                                      +{sale.items.length - 2} more
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {formatCurrency(sale.totalAmount)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    sale.status === "completed"
                                      ? "bg-green-500/20 text-green-500"
                                      : sale.status === "cancelled"
                                        ? "bg-red-500/20 text-red-500"
                                        : "bg-yellow-500/20 text-yellow-500"
                                  }
                                >
                                  {sale.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {sale.paymentMethod
                                  ? sale.paymentMethod
                                      .replace("_", " ")
                                      .replace(/\b\w/g, (l) => l.toUpperCase())
                                  : "-"}
                              </TableCell>
                              <TableCell>{sale.user?.name || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="installments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Installment Plans (
                    {
                      customer.sales.filter(
                        (s) =>
                          s.installmentPlan &&
                          s.installmentPlan.status === "active"
                      ).length
                    }
                    )
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {customer.sales.filter((s) => s.installmentPlan).length ===
                  0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      No installment plans
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {customer.sales
                        .filter((s) => s.installmentPlan)
                        .map((sale) => {
                          const plan = sale.installmentPlan!;
                          const pendingPayments = plan.payments.filter(
                            (p) =>
                              p.status === "pending" || p.status === "overdue"
                          );
                          const totalPending = pendingPayments.reduce(
                            (sum, p) => sum + (p.amount - p.paidAmount),
                            0
                          );

                          return (
                            <Card key={plan.id} className="bg-muted/50">
                              <CardHeader>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <CardTitle className="text-base">
                                      Sale #{sale.saleNumber}
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                      {formatDate(sale.saleDate)}
                                    </p>
                                  </div>
                                  <Badge
                                    className={
                                      plan.status === "active"
                                        ? "bg-yellow-500/20 text-yellow-500"
                                        : plan.status === "completed"
                                          ? "bg-green-500/20 text-green-500"
                                          : "bg-red-500/20 text-red-500"
                                    }
                                  >
                                    {plan.status}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      Total Amount
                                    </p>
                                    <p className="text-base font-semibold">
                                      {formatCurrency(sale.totalAmount)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      Remaining
                                    </p>
                                    <p className="text-base font-semibold">
                                      {formatCurrency(plan.remainingAmount)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      Pending Payments
                                    </p>
                                    <p className="text-base font-semibold text-red-600">
                                      {formatCurrency(totalPending)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">
                                      Payments
                                    </p>
                                    <p className="text-base font-semibold">
                                      {
                                        plan.payments.filter(
                                          (p) => p.status === "paid"
                                        ).length
                                      }{" "}
                                      / {plan.payments.length}
                                    </p>
                                  </div>
                                </div>
                                {pendingPayments.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium mb-2">
                                      Upcoming Payments
                                    </p>
                                    <div className="space-y-2">
                                      {pendingPayments
                                        .slice(0, 3)
                                        .map((payment, idx) => (
                                          <div
                                            key={idx}
                                            className="flex justify-between items-center p-2 bg-background rounded"
                                          >
                                            <div>
                                              <p className="text-sm font-medium">
                                                Installment #
                                                {payment.installmentNumber}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                Due:{" "}
                                                {formatDate(payment.dueDate)}
                                              </p>
                                            </div>
                                            <p className="text-sm font-semibold">
                                              {formatCurrency(
                                                payment.amount -
                                                  payment.paidAmount
                                              )}
                                            </p>
                                          </div>
                                        ))}
                                      {pendingPayments.length > 3 && (
                                        <p className="text-xs text-muted-foreground text-center">
                                          +{pendingPayments.length - 3} more
                                          payments
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

