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
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-8 min-h-[44px] flex-1 px-2 text-xs sm:min-h-0 sm:flex-initial sm:px-2.5"
          onClick={onPrev}
          disabled={disabled || page === 1}
        >
          Previous
        </Button>
        <span className="shrink-0 text-center text-[11px] text-muted-foreground sm:text-xs">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 min-h-[44px] flex-1 px-2 text-xs sm:min-h-0 sm:flex-initial sm:px-2.5"
          onClick={onNext}
          disabled={disabled || page === totalPages}
        >
          Next
        </Button>
      </div>
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
    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
      <Card className="min-w-0 overflow-hidden bg-card border-border/80 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 p-3 pb-2 sm:p-6 sm:pb-2 sm:pt-5">
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
        <CardContent className="min-w-0 px-0 pb-4 pt-0 sm:px-6">
          {txLoading ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground sm:px-0">
              Loading…
            </div>
          ) : txRows.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground sm:px-0">
              No transactions today
            </div>
          ) : (
            <div className="min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
              <Table className="w-full min-w-[17.5rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 px-2 py-2 text-left text-xs sm:px-3">
                      ID
                    </TableHead>
                    <TableHead className="h-8 px-2 py-2 text-left text-xs sm:px-3">
                      Customer
                    </TableHead>
                    <TableHead className="h-8 px-2 py-2 text-left text-xs sm:px-3">
                      Time
                    </TableHead>
                    <TableHead className="h-8 px-2 py-2 text-right text-xs sm:px-3">
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txRows.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="px-2 py-1.5 text-xs font-medium sm:px-3">
                        #{transaction.saleNumber}
                      </TableCell>
                      <TableCell className="max-w-[120px] px-2 py-1.5 text-xs sm:max-w-none sm:px-3">
                        <span className="line-clamp-2 break-words sm:line-clamp-none">
                          {transaction.customerName}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-2 py-1.5 text-xs tabular-nums sm:px-3">
                        {new Date(transaction.saleDate).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-2 py-1.5 text-right text-xs tabular-nums sm:px-3">
                        {formatCurrency(transaction.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="px-3 sm:px-0">
            <TablePagination
              page={txPage}
              totalPages={txTotalPages}
              disabled={txLoading}
              onPrev={() => setTxPage((p) => Math.max(1, p - 1))}
              onNext={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden bg-card border-border/80 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 p-3 pb-2 sm:p-6 sm:pb-2 sm:pt-5">
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
        <CardContent className="min-w-0 px-0 pb-4 pt-0 sm:px-6">
          {stockLoading ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground sm:px-0">
              Loading…
            </div>
          ) : stockRows.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground sm:px-0">
              No products at or below minimum stock
            </div>
          ) : (
            <div className="min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
              <Table className="w-full min-w-[17.5rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 px-2 py-2 text-left text-xs sm:px-3">
                      Product
                    </TableHead>
                    <TableHead className="h-8 px-2 py-2 text-left text-xs sm:px-3">
                      SKU
                    </TableHead>
                    <TableHead className="h-8 px-2 py-2 text-right text-xs sm:px-3">
                      Stock
                    </TableHead>
                    <TableHead className="h-8 px-2 py-2 text-right text-xs sm:px-3">
                      Min
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockRows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-[7rem] px-2 py-1.5 text-xs font-medium sm:max-w-none sm:px-3">
                        <span className="line-clamp-2 break-words sm:line-clamp-none">
                          {p.name}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-2 py-1.5 text-xs text-muted-foreground sm:px-3">
                        {p.sku}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-2 py-1.5 text-right text-xs tabular-nums text-amber-700 dark:text-amber-400 sm:px-3">
                        {p.stock}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-2 py-1.5 text-right text-xs tabular-nums text-muted-foreground sm:px-3">
                        {p.minStock}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="px-3 sm:px-0">
            <TablePagination
              page={stockPage}
              totalPages={stockTotalPages}
              disabled={stockLoading}
              onPrev={() => setStockPage((p) => Math.max(1, p - 1))}
              onNext={() =>
                setStockPage((p) => Math.min(stockTotalPages, p + 1))
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
