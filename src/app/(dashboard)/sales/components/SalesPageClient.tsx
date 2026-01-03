"use client";

import { useRef, useState, useCallback } from "react";
import { SalesTable, SalesTableRef } from "./SalesTable";
import { AddSaleModal } from "./AddSaleModal";
import { SalesStatisticsCards, SalesStatisticsCardsRef } from "./SalesStatisticsCards";
import { Filters } from "./Filters";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface SalesPageClientProps {
  canCreate: boolean;
}

export function SalesPageClient({ canCreate }: SalesPageClientProps) {
  const salesTableRef = useRef<SalesTableRef>(null);
  const statisticsCardsRef = useRef<SalesStatisticsCardsRef>(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    productId: "",
  });

  const handleSaleCreated = () => {
    salesTableRef.current?.refresh();
    statisticsCardsRef.current?.refresh();
  };

  const handleSaleChanged = () => {
    statisticsCardsRef.current?.refresh();
  };

  const handleFilterChange = useCallback((newFilters: {
    search: string;
    status: string;
    productId: string;
  }) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales</h1>
          <p className="text-muted-foreground">
            Manage and track all sales transactions
          </p>
        </div>
        {canCreate && (
          <AddSaleModal onSaleCreated={handleSaleCreated}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Sale
            </Button>
          </AddSaleModal>
        )}
      </div>
      <SalesStatisticsCards ref={statisticsCardsRef} />
      <Filters onFilterChange={handleFilterChange} />
      <SalesTable ref={salesTableRef} filters={filters} onSaleChanged={handleSaleChanged} />
    </div>
  );
}

