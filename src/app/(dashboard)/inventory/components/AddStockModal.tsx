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
// Textarea component - using Input as fallback if Textarea doesn't exist

interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  unit: string;
}

interface AddStockModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddStockModal({
  product,
  open,
  onOpenChange,
  onSuccess,
}: AddStockModalProps) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  // Reset form when modal opens/closes or product changes
  useEffect(() => {
    if (open) {
      setQuantity("");
      setNotes("");
    }
  }, [open, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      alert("Please enter a valid quantity greater than 0");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/inventory/${product.id}/stock`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quantity: quantityNum,
          notes: notes.trim() || undefined,
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
        // Also trigger table refresh if available
        if ((window as any).refreshInventoryTable) {
          (window as any).refreshInventoryTable();
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add stock");
      }
    } catch (error) {
      console.error("Error adding stock:", error);
      alert("Failed to add stock");
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Stock</DialogTitle>
          <DialogDescription>
            Add new inventory to {product.name} ({product.sku})
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentStock">Current Stock</Label>
            <Input
              id="currentStock"
              value={`${product.stock} ${product.unit}`}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity to Add <span className="text-destructive">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              required
              autoFocus
            />
            <p className="text-sm text-muted-foreground">
              New stock will be:{" "}
              <span className="font-semibold">
                {quantity
                  ? `${product.stock + parseInt(quantity) || product.stock} ${product.unit}`
                  : `${product.stock} ${product.unit}`}
              </span>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Received from supplier, Purchase order #12345"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

