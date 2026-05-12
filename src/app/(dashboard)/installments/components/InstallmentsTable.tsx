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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { Loader2, DollarSign, Eye } from "lucide-react";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { InstallmentDetailsModal } from "./InstallmentDetailsModal";
import { useSession } from "next-auth/react";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { formatSaleNumberShort } from "@/lib/sale-number";

interface InstallmentPlan {
  id: string;
  sale: {
    saleNumber: string;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    totalAmount: number;
  };
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  numberOfInstallments: number;
  installmentAmount: number;
  frequency: string;
  startDate: string;
  status: string;
  statistics: {
    totalPaid: number;
    remainingAmount: number;
    paidInstallments: number;
    remainingInstallments: number;
    overduePayments: number;
    nextPaymentDue: string | null;
  };
}

interface InstallmentsTableProps {
  filters: {
    search: string;
    status: string;
  };
}

export function InstallmentsTable({ filters }: InstallmentsTableProps) {
  const formatCurrency = useCurrency();
  const { data: session } = useSession();
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const canRecordPayment =
    session?.user?.permissions &&
    hasPermission(session.user.permissions, Permission.RECORD_PAYMENTS);

  useEffect(() => {
    fetchPlans();
  }, [page, filters]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (filters.search) params.append("search", filters.search);
      if (filters.status) params.append("status", filters.status);

      const response = await fetch(`/api/installments?${params.toString()}`);
      const data = await response.json();
      setPlans(data.plans || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching installments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, overdueCount: number) => {
    if (status === "completed") {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
    }
    if (status === "defaulted") {
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Defaulted</Badge>;
    }
    if (overdueCount > 0) {
      return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Overdue</Badge>;
    }
    return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Active</Badge>;
  };

  const handleRecordPayment = (plan: InstallmentPlan) => {
    setSelectedPlan(plan);
    setPaymentOpen(true);
  };

  const handleViewDetails = (plan: InstallmentPlan) => {
    setSelectedPlan(plan);
    setDetailsOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Installments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No installment plans found
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell
                      className="font-medium tabular-nums"
                      title={plan.sale.saleNumber}
                    >
                      {formatSaleNumberShort(plan.sale.saleNumber)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plan.sale.customerName}</div>
                        {plan.sale.customerPhone && (
                          <div className="text-sm text-muted-foreground">
                            {plan.sale.customerPhone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(plan.totalAmount)}</TableCell>
                    <TableCell>
                      {formatCurrency(plan.statistics.totalPaid)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(plan.statistics.remainingAmount)}
                    </TableCell>
                    <TableCell>
                      {plan.statistics.paidInstallments} / {plan.numberOfInstallments}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(plan.status, plan.statistics.overduePayments)}
                    </TableCell>
                    <TableCell>
                      {plan.statistics.nextPaymentDue
                        ? formatDate(plan.statistics.nextPaymentDue)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(plan)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canRecordPayment && plan.status !== "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRecordPayment(plan)}
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Pay
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

      {selectedPlan && (
        <>
          <RecordPaymentModal
            open={paymentOpen}
            onOpenChange={setPaymentOpen}
            plan={selectedPlan}
            onPaymentRecorded={fetchPlans}
          />
          <InstallmentDetailsModal
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            planId={selectedPlan.id}
          />
        </>
      )}
    </>
  );
}

