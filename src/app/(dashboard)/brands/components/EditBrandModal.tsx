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

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: Category | null;
}

interface EditBrandModalProps {
  brand: Brand;
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditBrandModal({
  brand,
  categories,
  open,
  onOpenChange,
  onSuccess,
}: EditBrandModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    /** "none" or category id */
    categoryId: "none" as string,
  });

  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name,
        description: brand.description || "",
        categoryId: brand.categoryId ?? "none",
      });
    }
  }, [brand]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/brands/${brand.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          categoryId:
            formData.categoryId === "none" ? null : formData.categoryId,
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update brand");
      }
    } catch (error) {
      console.error("Error updating brand:", error);
      alert("Failed to update brand");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Brand</DialogTitle>
          <DialogDescription>Update brand information</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="categoryId">Category (optional)</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) =>
                setFormData({ ...formData, categoryId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None — global brand</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Brand Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Brand"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

