/**
 * Normalizes product variation JSON and resolves price/cost per sale unit.
 * Stock is always in base units; each variation defines quantityInBaseUnit and optional cost per sale unit.
 */

export type ProductVariationRow = {
  name: string;
  quantityInBaseUnit: number;
  price: number;
  cost: number | null;
};

export type ProductLike = {
  variations?: unknown;
  baseUnit?: string | null;
  price?: number | null;
  cost?: number | null;
};

export function normalizeSaleUnit(raw: unknown): string {
  const s = String(raw ?? "").trim();
  return s.length > 0 ? s : "item";
}

export function getProductVariations(product: ProductLike): ProductVariationRow[] {
  const raw = Array.isArray(product.variations) ? product.variations : [];
  const normalized = raw
    .map((v: any) => {
      const costRaw = v?.cost;
      let cost: number | null = null;
      if (costRaw !== undefined && costRaw !== null && costRaw !== "") {
        const c = Number(costRaw);
        if (Number.isFinite(c) && c >= 0) cost = c;
      }
      return {
        name: String(v?.name || "").trim(),
        quantityInBaseUnit: Number(v?.quantityInBaseUnit || 0),
        price: Number(v?.price || 0),
        cost,
      };
    })
    .filter((v) => v.name && v.quantityInBaseUnit > 0 && v.price >= 0);

  if (normalized.length > 0) return normalized;

  const fallbackCost =
    product.cost != null && product.cost !== undefined && Number.isFinite(Number(product.cost))
      ? Math.max(0, Number(product.cost))
      : null;

  return [
    {
      name: String(product.baseUnit || "item"),
      quantityInBaseUnit: 1,
      price: Number(product.price || 0),
      cost: fallbackCost,
    },
  ];
}

export function getVariation(product: ProductLike, saleUnit: string): ProductVariationRow {
  const variations = getProductVariations(product);
  const unit = normalizeSaleUnit(saleUnit);
  return (
    variations.find((v) => v.name.toLowerCase() === unit.toLowerCase()) ||
    variations.find((v) => v.quantityInBaseUnit === 1) ||
    variations[0]
  );
}

export function getProductUnitPrice(product: ProductLike, saleUnit: string): number {
  return Number(getVariation(product, saleUnit)?.price || 0);
}

/** Cost for one sale unit of the resolved variation; falls back to product.cost. */
export function getProductUnitCost(product: ProductLike, saleUnit: string): number {
  const v = getVariation(product, saleUnit);
  if (v.cost !== null && v.cost !== undefined && Number.isFinite(v.cost)) {
    return Math.max(0, v.cost);
  }
  const fallback =
    product.cost != null && product.cost !== undefined && Number.isFinite(Number(product.cost))
      ? Number(product.cost)
      : 0;
  return Math.max(0, fallback);
}

export function getBaseQuantity(product: ProductLike, quantity: number, saleUnit: string): number {
  const variation = getVariation(product, saleUnit);
  return Math.max(1, Number(variation?.quantityInBaseUnit || 1)) * quantity;
}

export function computeLineCOGS(
  product: ProductLike,
  quantity: number,
  saleUnit: string
): { unitCost: number; lineCOGS: number } {
  const unit = normalizeSaleUnit(saleUnit);
  const unitCost = getProductUnitCost(product, unit);
  return { unitCost, lineCOGS: unitCost * quantity };
}

/** COGS for reporting: prefer snapshot on SaleItem; else legacy product.cost × quantity. */
export function saleItemLineCogs(item: {
  lineCOGS?: number | null;
  quantity: number;
  product?: { cost?: number | null } | null;
}): number {
  if (item.lineCOGS != null && item.lineCOGS !== undefined && Number.isFinite(Number(item.lineCOGS))) {
    return Number(item.lineCOGS);
  }
  const c = item.product?.cost ?? 0;
  return Number(c) * item.quantity;
}

export function normalizeVariationsForStorage(input: unknown): ProductVariationRow[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((v: any) => {
      const name = String(v?.name || "").trim();
      const quantityInBaseUnit = Number(v?.quantityInBaseUnit || 0);
      const price = Number(v?.price || 0);
      let cost: number | null = null;
      const costRaw = v?.cost;
      if (costRaw !== undefined && costRaw !== null && costRaw !== "") {
        const c = Number(costRaw);
        if (Number.isFinite(c) && c >= 0) cost = c;
      }
      return { name, quantityInBaseUnit, price, cost };
    })
    .filter((v) => v.name && v.quantityInBaseUnit > 0 && v.price >= 0);
}
