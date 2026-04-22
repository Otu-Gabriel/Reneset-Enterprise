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
  categoryId: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  category: string;
  price: number;
  cost: number | null;
  baseUnit?: string;
  variations?: Array<{
    name: string;
    quantityInBaseUnit: number;
    price: number;
    cost?: number | null;
  }>;
  stock: number;
  minStock: number;
  unit: string;
  imageUrl: string | null;
  brand: {
    id: string;
    name: string;
  } | null;
}

interface EditItemModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditItemModal({
  product,
  open,
  onOpenChange,
  onSuccess,
}: EditItemModalProps) {
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

  useEffect(() => {
    if (product && open) {
      fetchCategories();
    }
  }, [product, open]);

  // Set form data after categories are loaded
  useEffect(() => {
    if (product && open && categories.length > 0) {
      const category = categories.find((c) => c.name === product.category);
      setFormData({
        name: product.name,
        description: product.description || "",
        sku: product.sku,
        categoryId: category?.id || "",
        brandId: product.brand?.id || "",
        baseUnit: product.baseUnit || product.unit || "item",
        cost: product.cost?.toString() || "",
        stock: product.stock.toString(),
        minStock: product.minStock.toString(),
        imageUrl: product.imageUrl || "",
      });
      if (Array.isArray(product.variations) && product.variations.length > 0) {
        setVariations(
          product.variations.map((variation) => ({
            name: variation.name,
            quantityInBaseUnit: String(variation.quantityInBaseUnit),
            price: String(variation.price),
            cost:
              variation.cost != null && variation.cost !== undefined
                ? String(variation.cost)
                : "",
          })),
        );
      }
      if (product.imageUrl) {
        setImagePreview(product.imageUrl);
      }
      if (category) {
        fetchBrands(category.id);
      }
    }
  }, [product, open, categories]);

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  useEffect(() => {
    if (formData.categoryId) {
      fetchBrands(formData.categoryId);
    } else {
      setBrands([]);
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
    if (!product) return;

    setLoading(true);

    try {
      // Upload image first if a new file is provided
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

      if (formData.brandId) {
        payload.brandId = formData.brandId;
      }
      if (formData.cost) {
        payload.cost = formData.cost;
      }
      if (imageUrl) {
        payload.imageUrl = imageUrl;
      }

      const response = await fetch(`/api/inventory/${product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
        alert(error.error || "Failed to update product");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>Update product information</DialogDescription>
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
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseUnit">Base Unit *</Label>
            <Input
              id="baseUnit"
              value={formData.baseUnit}
              onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => {
                  setFormData({
                    ...formData,
                    categoryId: value,
                    brandId: "",
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
                  <SelectValue
                    placeholder={
                      formData.categoryId
                        ? "Select a brand"
                        : "Select category first"
                    }
                  />
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
                Prefer setting cost on each variation for accurate margins.
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
                  placeholder="Variation name"
                  value={variation.name}
                  onChange={(e) =>
                    setVariations((prev) =>
                      prev.map((v, i) => (i === index ? { ...v, name: e.target.value } : v)),
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
                      prev.map((v, i) => (i === index ? { ...v, quantityInBaseUnit: e.target.value } : v)),
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
                      prev.map((v, i) => (i === index ? { ...v, price: e.target.value } : v)),
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
                      prev.map((v, i) => (i === index ? { ...v, cost: e.target.value } : v)),
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
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading || uploading
                ? uploading
                  ? "Uploading..."
                  : "Updating..."
                : "Update Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

