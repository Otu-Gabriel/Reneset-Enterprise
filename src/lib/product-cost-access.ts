import {
  getProductVariations,
  normalizeVariationsForStorage,
  type ProductLike,
  type ProductVariationRow,
} from "./product-variations";

/** Remove top-level and per-variation cost from a product-shaped object (API response). */
export function redactProductCostFields<T extends Record<string, unknown>>(
  product: T
): T {
  const p = { ...product } as Record<string, unknown>;
  p.cost = null;
  if (Array.isArray(p.variations)) {
    p.variations = p.variations.map((row: unknown) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return row;
      const { cost: _omit, ...rest } = row as Record<string, unknown>;
      return rest;
    });
  }
  return p as T;
}

export function redactProductsCosts<T extends Record<string, unknown>>(
  products: T[],
  canViewCost: boolean
): T[] {
  if (canViewCost) return products;
  return products.map((prod) => redactProductCostFields({ ...prod }));
}

/** Strip `cost` from each variation row before normalize (client payload without edit permission). */
export function stripCostsFromVariationsInput(input: unknown): unknown {
  if (!Array.isArray(input)) return input;
  return input.map((v) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return v;
    const { cost: _c, ...rest } = v as Record<string, unknown>;
    return rest;
  });
}

/**
 * Normalize incoming variation rows for storage. When the user lacks EDIT_PRODUCT_COST,
 * preserve existing per-variation costs for matching rows; new rows get null cost.
 */
export function applyCostEditPolicyToVariations(
  incomingRaw: unknown,
  existingProduct: ProductLike,
  canEditCost: boolean
): ProductVariationRow[] {
  const base = canEditCost
    ? incomingRaw
    : stripCostsFromVariationsInput(incomingRaw);
  const normalized = normalizeVariationsForStorage(base);
  if (canEditCost) return normalized;

  const existing = getProductVariations(existingProduct);
  return normalized.map((row) => {
    const match = existing.find(
      (e) =>
        e.name.toLowerCase() === row.name.toLowerCase() &&
        e.quantityInBaseUnit === row.quantityInBaseUnit
    );
    return { ...row, cost: match?.cost ?? null };
  });
}

export function redactSaleForClient(
  sale: Record<string, unknown>,
  canViewCost: boolean
): Record<string, unknown> {
  if (canViewCost) return sale;
  const out = { ...sale };
  if (Array.isArray(out.items)) {
    out.items = out.items.map((item: unknown) => {
      if (!item || typeof item !== "object") return item;
      const i = item as Record<string, unknown>;
      const next: Record<string, unknown> = {
        ...i,
        unitCost: null,
        lineCOGS: null,
      };
      if (i.product && typeof i.product === "object") {
        next.product = redactProductCostFields({
          ...(i.product as Record<string, unknown>),
        });
      }
      return next;
    });
  }
  return out;
}
