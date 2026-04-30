"use client";

import { useCallback, useEffect, useState } from "react";
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
import { ListOrdered, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

const PAGE_SIZE = 8;

interface TxRow {
  id: string;
  saleNumber: string;
  customerName: string;
  totalAmount: number;
  saleDate: string;
}

interface StockRow {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  category: string;
}

function TablePagination({
  page,
  totalPages,
  onPrev,
  onNext,
  disabled,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  disabled: boolean;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2.5 text-xs"
        onClick={onPrev}
        disabled={disabled || page === 1}
      >
        Previous
      </Button>
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2.5 text-xs"
        onClick={onNext}
        disabled={disabled || page === totalPages}
      >
        Next
      </Button>
    </div>
  );
}

export function DashboardPaginatedTables() {
  const formatCurrency = useCurrency();

  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txLoading, setTxLoading] = useState(true);
  const [txRows, setTxRows] = useState<TxRow[]>([]);

  const [stockPage, setStockPage] = useState(1);
  const [stockTotalPages, setStockTotalPages] = useState(1);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockRows, setStockRows] = useState<StockRow[]>([]);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/today-transactions?page=${txPage}&limit=${PAGE_SIZE}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setTxRows(data.transactions || []);
      setTxTotalPages(data.pagination?.totalPages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setTxLoading(false);
    }
  }, [txPage]);

  const fetchLowStock = useCallback(async () => {
    setStockLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/low-stock?page=${stockPage}&limit=${PAGE_SIZE}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setStockRows(data.products || []);
      setStockTotalPages(data.pagination?.totalPages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setStockLoading(false);
    }
  }, [stockPage]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchLowStock();
  }, [fetchLowStock]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="bg-card border-border/80 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">
            Today&apos;s transactions
          </CardTitle>
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              "bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary"
            )}
          >
            <ListOrdered className="h-3.5 w-3.5" aria-hidden />
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {txLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading…
            </div>
          ) : txRows.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No transactions today
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9 text-xs">ID</TableHead>
                    <TableHead className="h-9 text-xs">Customer</TableHead>
                    <TableHead className="h-9 text-xs">Time</TableHead>
                    <TableHead className="h-9 text-xs text-right">
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txRows.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="py-2 text-xs font-medium">
                        #{transaction.saleNumber}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate py-2 text-xs">
                        {transaction.customerName}
                      </TableCell>
                      <TableCell className="py-2 text-xs tabular-nums">
                        {new Date(transaction.saleDate).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-right text-xs tabular-nums">
                        {formatCurrency(transaction.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <TablePagination
            page={txPage}
            totalPages={txTotalPages}
            disabled={txLoading}
            onPrev={() => setTxPage((p) => Math.max(1, p - 1))}
            onNext={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
          />
        </CardContent>
      </Card>

      <Card className="bg-card border-border/80 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2 pt-4">
          <CardTitle className="text-sm font-semibold">
            Low stock alerts
          </CardTitle>
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              "bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {stockLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading…
            </div>
          ) : stockRows.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No products at or below minimum stock
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9 text-xs">Product</TableHead>
                    <TableHead className="h-9 text-xs">SKU</TableHead>
                    <TableHead className="h-9 text-xs text-right">
                      Stock
                    </TableHead>
                    <TableHead className="h-9 text-xs text-right">Min</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockRows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-[160px] truncate py-2 text-xs font-medium">
                        {p.name}
                      </TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground">
                        {p.sku}
                      </TableCell>
                      <TableCell className="py-2 text-right text-xs tabular-nums text-amber-700 dark:text-amber-400">
                        {p.stock}
                      </TableCell>
                      <TableCell className="py-2 text-right text-xs tabular-nums text-muted-foreground">
                        {p.minStock}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <TablePagination
            page={stockPage}
            totalPages={stockTotalPages}
            disabled={stockLoading}
            onPrev={() => setStockPage((p) => Math.max(1, p - 1))}
            onNext={() =>
              setStockPage((p) => Math.min(stockTotalPages, p + 1))
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
