"use client";

import { useState, useEffect, useMemo } from "react";
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
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
  categoryId: string;
}

interface AddItemModalProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

export function AddItemModal({ children, onSuccess }: AddItemModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    categoryId: "",
    brandId: "",
    price: "",
    cost: "",
    stock: "0",
    minStock: "0",
    unit: "pcs",
    imageUrl: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);

  // Auto-generate SKU from product name
  const generateSKU = (name: string) => {
    if (!name) return "";
    // Remove special characters, convert to uppercase, replace spaces with hyphens
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 20);
  };

  // Update SKU when name changes (if not manually edited)
  useEffect(() => {
    if (!skuManuallyEdited && formData.name) {
      setFormData((prev) => ({
        ...prev,
        sku: generateSKU(formData.name),
      }));
    }
  }, [formData.name, skuManuallyEdited]);

  // Fetch categories when modal opens
  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  // Fetch brands when category changes
  useEffect(() => {
    if (formData.categoryId) {
      fetchBrands(formData.categoryId);
    } else {
      setBrands([]);
      setFormData((prev) => ({ ...prev, brandId: "" }));
    }
  }, [formData.categoryId]);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories?limit=1000");
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchBrands = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/brands?categoryId=${categoryId}&limit=1000`);
      const data = await response.json();
      setBrands(data.brands || []);
    } catch (error) {
      console.error("Error fetching brands:", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append("file", imageFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.url;
      } else {
        throw new Error("Failed to upload image");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload image first if provided
      let imageUrl = formData.imageUrl;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          setLoading(false);
          return;
        }
      }

      const payload: any = {
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
        categoryId: formData.categoryId,
        price: formData.price,
        stock: formData.stock,
        minStock: formData.minStock,
        unit: formData.unit,
      };

      // Add optional fields only if they have values
      if (formData.brandId) {
        payload.brandId = formData.brandId;
      }
      if (formData.cost) {
        payload.cost = formData.cost;
      }
      if (imageUrl) {
        payload.imageUrl = imageUrl;
      }

      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setOpen(false);
        setFormData({
          name: "",
          description: "",
          sku: "",
          categoryId: "",
          brandId: "",
          price: "",
          cost: "",
          stock: "0",
          minStock: "0",
          unit: "pcs",
          imageUrl: "",
        });
        setImageFile(null);
        setImagePreview(null);
        setSkuManuallyEdited(false);
        if (onSuccess) {
          onSuccess();
        }
        // Also trigger table refresh if available
        if ((window as any).refreshInventoryTable) {
          (window as any).refreshInventoryTable();
        }
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create product");
      }
    } catch (error) {
      console.error("Error creating product:", error);
      alert("Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        name: "",
        description: "",
        sku: "",
        categoryId: "",
        brandId: "",
        price: "",
        cost: "",
        stock: "0",
        minStock: "0",
        unit: "pcs",
        imageUrl: "",
      });
      setSkuManuallyEdited(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Add a new product to your inventory
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="e.g., iPhone 15 Pro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => {
                  setFormData({ ...formData, sku: e.target.value });
                  setSkuManuallyEdited(true);
                }}
                required
                placeholder="Auto-generated from name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Product description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => {
                  setFormData({
                    ...formData,
                    categoryId: value,
                    brandId: "", // Reset brand when category changes
                  });
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandId">Brand</Label>
              <Select
                value={formData.brandId}
                onValueChange={(value) =>
                  setFormData({ ...formData, brandId: value })
                }
                disabled={!formData.categoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.categoryId ? "Select a brand" : "Select category first"} />
                </SelectTrigger>
                <SelectContent>
                  {brands.length === 0 && formData.categoryId ? (
                    <SelectItem value="none" disabled>
                      No brands available
                    </SelectItem>
                  ) : (
                    brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                required
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) =>
                  setFormData({ ...formData, cost: e.target.value })
                }
                placeholder="0.00 (optional)"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStock">Min Stock</Label>
              <Input
                id="minStock"
                type="number"
                value={formData.minStock}
                onChange={(e) =>
                  setFormData({ ...formData, minStock: e.target.value })
                }
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                placeholder="pcs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Product Image</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="cursor-pointer"
              />
              {imagePreview && (
                <div className="relative w-32 h-32 rounded-md overflow-hidden bg-muted mt-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setSkuManuallyEdited(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading || uploading
                ? uploading
                  ? "Uploading..."
                  : "Creating..."
                : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
