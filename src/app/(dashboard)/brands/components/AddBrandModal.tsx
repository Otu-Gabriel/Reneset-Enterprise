"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface AddBrandModalProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

export function AddBrandModal({ children, onSuccess }: AddBrandModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    /** "none" = standalone (no category) */
    categoryId: "none",
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories?limit=1000");
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/brands", {
        method: "POST",
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
        setOpen(false);
        setFormData({
          name: "",
          description: "",
          categoryId: "none",
        });
        // Call the onSuccess callback to refresh the table
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create brand");
      }
    } catch (error) {
      console.error("Error creating brand:", error);
      alert("Failed to create brand");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Brand</DialogTitle>
          <DialogDescription>
            Add a global brand, or link it to a category if you use both.
          </DialogDescription>
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
              placeholder="e.g., Apple, Samsung, Nike"
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
              placeholder="Optional description"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? "Creating..." : "Create Brand"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

