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
    baseUnit: "item",
    cost: "",
    stock: "0",
    minStock: "0",
    imageUrl: "",
  });
  const [variations, setVariations] = useState([
    { name: "item", quantityInBaseUnit: "1", price: "", cost: "" },
  ]);
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
        baseUnit: formData.baseUnit,
        stock: formData.stock,
        minStock: formData.minStock,
        unit: formData.baseUnit,
      };
      const normalizedVariations = variations
        .map((variation) => {
          const costStr = String(variation.cost ?? "").trim();
          let cost: number | null = null;
          if (costStr !== "") {
            const c = Number(costStr);
            if (!Number.isNaN(c) && c >= 0) cost = c;
          }
          return {
            name: variation.name.trim(),
            quantityInBaseUnit: Number(variation.quantityInBaseUnit),
            price: Number(variation.price),
            cost,
          };
        })
        .filter((variation) => variation.name && variation.quantityInBaseUnit > 0 && variation.price >= 0);

      if (!normalizedVariations.length) {
        alert("Please add at least one valid variation with name, conversion, and price.");
        setLoading(false);
        return;
      }
      payload.variations = normalizedVariations;
      payload.price = normalizedVariations.find((v) => v.quantityInBaseUnit === 1)?.price ?? normalizedVariations[0].price;

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
          baseUnit: "item",
          cost: "",
          stock: "0",
          minStock: "0",
          imageUrl: "",
        });
        setVariations([{ name: "item", quantityInBaseUnit: "1", price: "", cost: "" }]);
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
        baseUnit: "item",
        cost: "",
        stock: "0",
        minStock: "0",
        imageUrl: "",
      });
      setVariations([{ name: "item", quantityInBaseUnit: "1", price: "", cost: "" }]);
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
            <Label htmlFor="baseUnit">Base Unit *</Label>
            <Input
              id="baseUnit"
              value={formData.baseUnit}
              onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
              placeholder="e.g. item"
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
              <Label htmlFor="cost">Fallback product cost</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) =>
                  setFormData({ ...formData, cost: e.target.value })
                }
                placeholder="Used when a variation has no cost"
              />
              <p className="text-xs text-muted-foreground">
                Set cost on each variation below for accurate profit; this fills gaps.
              </p>
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
          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Label>Variations (price & cost per sale unit)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setVariations((prev) => [
                    ...prev,
                    { name: "", quantityInBaseUnit: "1", price: "", cost: "" },
                  ])
                }
              >
                Add Variation
              </Button>
            </div>
            {variations.map((variation, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-end"
              >
                <Input
                  className="sm:col-span-3"
                  placeholder="Name (e.g. carton)"
                  value={variation.name}
                  onChange={(e) =>
                    setVariations((prev) =>
                      prev.map((v, i) => (i === index ? { ...v, name: e.target.value } : v))
                    )
                  }
                />
                <Input
                  className="sm:col-span-2"
                  type="number"
                  min="1"
                  placeholder="Base units"
                  value={variation.quantityInBaseUnit}
                  onChange={(e) =>
                    setVariations((prev) =>
                      prev.map((v, i) => (i === index ? { ...v, quantityInBaseUnit: e.target.value } : v))
                    )
                  }
                />
                <Input
                  className="sm:col-span-2"
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={variation.price}
                  onChange={(e) =>
                    setVariations((prev) =>
                      prev.map((v, i) => (i === index ? { ...v, price: e.target.value } : v))
                    )
                  }
                />
                <Input
                  className="sm:col-span-2"
                  type="number"
                  step="0.01"
                  placeholder="Cost"
                  value={variation.cost}
                  onChange={(e) =>
                    setVariations((prev) =>
                      prev.map((v, i) => (i === index ? { ...v, cost: e.target.value } : v))
                    )
                  }
                />
                <div className="flex gap-2 sm:col-span-3">
                  {variations.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setVariations((prev) => prev.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
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
