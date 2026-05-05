"use client";

import { useState } from "react";
import { InventoryTable } from "./InventoryTable";
import { AddItemModal } from "./AddItemModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface InventoryTableWithAddButtonProps {
  canCreate: boolean;
  canViewProductCost: boolean;
  canEditProductCost: boolean;
}

export function InventoryTableWithAddButton({
  canCreate,
  canViewProductCost,
  canEditProductCost,
}: InventoryTableWithAddButtonProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    // Trigger table refresh
    if ((window as any).refreshInventoryTable) {
      setTimeout(() => {
        (window as any).refreshInventoryTable();
      }, 100);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-xl">
          Inventory
        </h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        {canCreate && (
          <AddItemModal
            onSuccess={handleRefresh}
            canEditProductCost={canEditProductCost}
          >
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </AddItemModal>
        )}
      </div>
      <InventoryTable
        key={refreshKey}
        canViewProductCost={canViewProductCost}
        canEditProductCost={canEditProductCost}
      />
    </>
  );
}

