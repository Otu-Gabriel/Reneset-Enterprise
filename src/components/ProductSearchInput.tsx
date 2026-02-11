"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, X, Package, DollarSign, AlertCircle } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  category: string;
  brand?: {
    id: string;
    name: string;
  } | null;
}

interface ProductSearchInputProps {
  value: string;
  onChange: (productId: string) => void;
  onProductSelect?: (product: Product) => void;
  category?: string;
  inStockOnly?: boolean;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

export function ProductSearchInput({
  value,
  onChange,
  onProductSelect,
  category,
  inStockOnly = false,
  placeholder = "Search by name, SKU, or scan barcode...",
  label = "Product",
  disabled = false,
}: ProductSearchInputProps) {
  const formatCurrency = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch selected product details when value changes
  useEffect(() => {
    if (value && !selectedProduct) {
      fetchProductDetails(value);
    } else if (!value) {
      setSelectedProduct(null);
      setSearchQuery("");
    }
  }, [value]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length >= 1 && !selectedProduct) {
        searchProducts(searchQuery);
      } else {
        setProducts([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, category, inStockOnly, selectedProduct]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchProductDetails = async (productId: string) => {
    try {
      const response = await fetch(`/api/inventory/${productId}`);
      if (response.ok) {
        const product = await response.json();
        setSelectedProduct(product);
        setSearchQuery(product.name);
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
    }
  };

  const searchProducts = async (query: string): Promise<Product[]> => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        q: query,
        limit: "20",
      });
      if (category) params.append("category", category);
      if (inStockOnly) params.append("inStockOnly", "true");

      const response = await fetch(`/api/inventory/search?${params}`);
      const data = await response.json();
      const results: Product[] = data.products || [];
      setProducts(results);
      setShowSuggestions(true);
      return results;
    } catch (error) {
      console.error("Error searching products:", error);
      setProducts([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setProducts([]);
    setShowSuggestions(false);
    onChange(product.id);
    onProductSelect?.(product);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length === 0) {
      setSelectedProduct(null);
      onChange("");
      setProducts([]);
      setShowSuggestions(false);
    } else if (selectedProduct) {
      // User is typing a new search, clear selection
      setSelectedProduct(null);
      onChange("");
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setShowSuggestions(false);
      return;
    }

    if (e.key === "Enter") {
      const query = searchQuery.trim();
      if (!query) {
        return;
      }

      e.preventDefault();

      // Prefer already loaded results, otherwise fetch fresh ones
      let results = products;
      if (results.length === 0) {
        results = await searchProducts(query);
      }

      if (results.length === 0) {
        return;
      }

      // Try to find an exact match by SKU or name (case-insensitive)
      const lower = query.toLowerCase();
      const exact =
        results.find(
          (p) =>
            p.sku.toLowerCase() === lower || p.name.toLowerCase() === lower
        ) || null;

      if (exact) {
        handleProductSelect(exact);
        return;
      }

      // If only one result, select it automatically
      if (results.length === 1) {
        handleProductSelect(results[0]);
        return;
      }

      // Otherwise, just open the suggestion list
      setShowSuggestions(true);
      return;
    }

    if (e.key === "ArrowDown" && products.length > 0) {
      e.preventDefault();
      const firstItem = suggestionsRef.current?.querySelector(
        "[data-product-item]"
      ) as HTMLElement;
      firstItem?.focus();
    }
  };

  const clearSelection = () => {
    setSelectedProduct(null);
    setSearchQuery("");
    onChange("");
    setProducts([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (products.length > 0 || searchQuery.length >= 1) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-9"
        />
        {selectedProduct && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            title="Clear selection"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {showSuggestions && (products.length > 0 || loading) && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-80 overflow-auto"
          >
            {loading && (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {!loading && products.length === 0 && searchQuery.length >= 1 && (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                No products found
              </div>
            )}
            {products.map((product) => (
              <div
                key={product.id}
                data-product-item
                onClick={() => handleProductSelect(product)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleProductSelect(product);
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const next = (e.currentTarget as HTMLElement)
                      .nextElementSibling as HTMLElement;
                    next?.focus();
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const prev = (e.currentTarget as HTMLElement)
                      .previousElementSibling as HTMLElement;
                    prev?.focus();
                  }
                }}
                tabIndex={0}
                className="px-4 py-3 hover:bg-accent cursor-pointer border-b last:border-0 focus:bg-accent focus:outline-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{product.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        SKU: {product.sku}
                      </span>
                      {product.brand && (
                        <>
                          <span>•</span>
                          <span>{product.brand.name}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{product.category}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    <div className="font-semibold text-sm flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(product.price)}
                    </div>
                    <div
                      className={`text-xs flex items-center gap-1 ${
                        product.stock === 0
                          ? "text-red-600"
                          : product.stock < 10
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {product.stock === 0 ? (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          Out of stock
                        </>
                      ) : (
                        <>
                          <Package className="h-3 w-3" />
                          {product.stock} in stock
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedProduct && (
        <p className="text-xs text-muted-foreground">
          ✓ Selected: {selectedProduct.name} ({selectedProduct.sku}) - Stock:{" "}
          {selectedProduct.stock} - {formatCurrency(selectedProduct.price)}
        </p>
      )}
    </div>
  );
}

