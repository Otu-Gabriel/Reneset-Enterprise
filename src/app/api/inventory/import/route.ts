import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission, Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { auditLogger, getRequestMetadata } from "@/lib/audit";
import { normalizeVariationsForStorage } from "@/lib/product-variations";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cellToString(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v).trim();
}

function rowToMap(row: Record<string, unknown>): Map<string, string> {
  const m = new Map<string, string>();
  for (const [k, v] of Object.entries(row)) {
    if (String(k).startsWith("__")) continue;
    const nk = String(k).trim().toLowerCase().replace(/[\s_]+/g, "");
    m.set(nk, cellToString(v));
  }
  return m;
}

function getFromMap(
  m: Map<string, string>,
  ...aliases: string[]
): string | undefined {
  for (const a of aliases) {
    const nk = a.toLowerCase().replace(/[\s_]+/g, "");
    const v = m.get(nk);
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
}

function skuFromMap(m: Map<string, string>): string {
  return String(getFromMap(m, "productsku", "sku") ?? "").trim();
}

function parseOptionalCost(s: string | undefined): number | null {
  if (s === undefined || s === "") return null;
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

type ParsedRow = { rowIndex: number; map: Map<string, string> };

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.CREATE_INVENTORY)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const lower = file.name.toLowerCase();
    let workbook: XLSX.WorkBook;

    if (lower.endsWith(".csv")) {
      const text = new TextDecoder("utf-8").decode(buffer);
      workbook = XLSX.read(text, { type: "string" });
    } else {
      workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as Record<
      string,
      unknown
    >[];

    if (data.length === 0) {
      return NextResponse.json(
        { error: "File is empty or has no data rows" },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const metadata = getRequestMetadata(request);

    const parsedRows: ParsedRow[] = data.map((raw, i) => ({
      rowIndex: i + 2,
      map: rowToMap(raw),
    }));

    const orderedSkus: string[] = [];
    const groups = new Map<string, ParsedRow[]>();

    for (const pr of parsedRows) {
      const sku = skuFromMap(pr.map);
      if (!sku) {
        results.failed++;
        results.errors.push(
          `Row ${pr.rowIndex}: Missing ProductSKU (or SKU)`
        );
        continue;
      }
      if (!groups.has(sku)) {
        groups.set(sku, []);
        orderedSkus.push(sku);
      }
      groups.get(sku)!.push(pr);
    }

    for (const sku of orderedSkus) {
      const groupRows = groups.get(sku)!;

      let productName = "";
      let categoryName = "";
      let baseUnit = "item";
      let brandName: string | undefined;
      let description: string | undefined;
      let stock = 0;
      let minStock = 0;
      let imageUrl: string | undefined;
      let fallbackCost: number | null = null;
      let stockSet = false;
      let minStockSet = false;

      for (const pr of groupRows) {
        const m = pr.map;
        if (!productName) {
          productName = String(
            getFromMap(m, "productname", "name", "product name") ?? ""
          ).trim();
        }
        if (!categoryName) {
          categoryName = String(
            getFromMap(m, "category", "categoryname") ?? ""
          ).trim();
        }
        const bu = getFromMap(m, "baseunit", "base unit");
        if (bu) baseUnit = bu.trim() || baseUnit;
        if (!brandName) {
          const b = getFromMap(m, "brand");
          if (b) brandName = b.trim();
        }
        if (!description) {
          const d = getFromMap(m, "description");
          if (d) description = d.trim();
        }
        const st = getFromMap(m, "stock");
        if (!stockSet && st !== undefined && st !== "") {
          const n = parseInt(st, 10);
          if (Number.isFinite(n)) {
            stock = n;
            stockSet = true;
          }
        }
        const ms = getFromMap(m, "minstock", "min stock");
        if (!minStockSet && ms !== undefined && ms !== "") {
          const n = parseInt(ms, 10);
          if (Number.isFinite(n)) {
            minStock = n;
            minStockSet = true;
          }
        }
        if (!imageUrl) {
          const im = getFromMap(m, "imageurl", "image url", "image");
          if (im) imageUrl = im.trim();
        }
        if (fallbackCost === null) {
          const fc = parseOptionalCost(
            getFromMap(
              m,
              "fallbackcost",
              "productcost",
              "fallback cost",
              "cost"
            )
          );
          if (fc !== null) fallbackCost = fc;
        }
      }

      if (!productName || !categoryName) {
        results.failed++;
        results.errors.push(
          `SKU "${sku}": Missing ProductName or Category (required on at least the first row of the group)`
        );
        continue;
      }

      const variationPayload: Array<{
        name: string;
        quantityInBaseUnit: number;
        price: number;
        cost: number | null;
      }> = [];

      let variationParseError: string | null = null;

      for (const pr of groupRows) {
        const m = pr.map;
        const vName = getFromMap(
          m,
          "variationname",
          "varname",
          "variation",
          "var name"
        );
        const vQty = getFromMap(
          m,
          "quantityinbaseunit",
          "baseqty",
          "qtyinbase",
          "base qty",
          "quantity in base unit"
        );
        const vPrice = getFromMap(
          m,
          "variationprice",
          "varprice",
          "sale price"
        );
        const vCostRaw = getFromMap(m, "variationcost", "varcost");
        const legacyPrice = getFromMap(m, "price");
        const rowCost = getFromMap(m, "cost");

        const hasNewVariation =
          vName !== undefined &&
          vQty !== undefined &&
          vPrice !== undefined;

        if (hasNewVariation) {
          const qty = parseInt(String(vQty), 10);
          const price = parseFloat(String(vPrice));
          if (
            !Number.isFinite(qty) ||
            qty < 1 ||
            !Number.isFinite(price) ||
            price < 0
          ) {
            variationParseError = `Row ${pr.rowIndex}: Invalid QuantityInBaseUnit or VariationPrice`;
            break;
          }
          variationPayload.push({
            name: String(vName).trim(),
            quantityInBaseUnit: qty,
            price,
            cost: parseOptionalCost(vCostRaw) ?? parseOptionalCost(rowCost),
          });
          continue;
        }

        const canLegacy =
          legacyPrice !== undefined &&
          variationPayload.length === 0 &&
          groupRows.length === 1;

        if (canLegacy) {
          const price = parseFloat(String(legacyPrice));
          if (!Number.isFinite(price) || price < 0) {
            variationParseError = `Row ${pr.rowIndex}: Invalid Price`;
            break;
          }
          const nm = String(
            getFromMap(m, "baseunit", "unit") || baseUnit || "item"
          ).trim();
          variationPayload.push({
            name: nm || "item",
            quantityInBaseUnit: 1,
            price,
            cost:
              parseOptionalCost(vCostRaw) ??
              parseOptionalCost(rowCost) ??
              fallbackCost,
          });
          continue;
        }

        if (groupRows.length > 1) {
          variationParseError = `Row ${pr.rowIndex}: Each additional row for the same SKU must include VariationName, QuantityInBaseUnit, and VariationPrice`;
          break;
        }

        variationParseError = `Row ${pr.rowIndex}: Missing VariationName, QuantityInBaseUnit, and VariationPrice (or use legacy Price on a single row)`;
        break;
      }

      if (variationParseError) {
        results.failed++;
        results.errors.push(`${variationParseError} (SKU ${sku})`);
        continue;
      }

      if (variationPayload.length === 0) {
        results.failed++;
        results.errors.push(`SKU "${sku}": No valid variations parsed`);
        continue;
      }

      const normalizedVariations =
        normalizeVariationsForStorage(variationPayload);

      if (normalizedVariations.length === 0) {
        results.failed++;
        results.errors.push(`SKU "${sku}": No valid variations after validation`);
        continue;
      }

      const primaryPrice =
        normalizedVariations.find((v) => v.quantityInBaseUnit === 1)
          ?.price ?? normalizedVariations[0].price;

      try {
        const existingSku = await prisma.product.findUnique({
          where: { sku },
        });

        if (existingSku) {
          results.failed++;
          results.errors.push(`SKU "${sku}" already exists`);
          continue;
        }

        let category = await prisma.category.findUnique({
          where: { name: categoryName },
        });

        if (!category) {
          category = await prisma.category.create({
            data: { name: categoryName },
          });
        }

        let brandId: string | null = null;
        if (brandName) {
          const brand = await prisma.brand.findFirst({
            where: {
              name: brandName,
              categoryId: category.id,
            },
          });

          if (!brand) {
            const newBrand = await prisma.brand.create({
              data: {
                name: brandName,
                categoryId: category.id,
              },
            });
            brandId = newBrand.id;
          } else {
            brandId = brand.id;
          }
        }

        const product = await prisma.product.create({
          data: {
            name: productName,
            sku,
            category: category.name,
            brandId,
            price: primaryPrice,
            cost: fallbackCost,
            description: description || null,
            baseUnit,
            unit: baseUnit,
            variations: normalizedVariations as unknown as Prisma.InputJsonValue,
            stock,
            minStock,
            imageUrl: imageUrl || null,
          },
        });

        await auditLogger.productCreated(
          session.user.id,
          product.id,
          product.name,
          metadata
        );

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(
          `SKU "${sku}": ${error.message || "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      message: `Import completed: ${results.success} succeeded, ${results.failed} failed`,
      results,
    });
  } catch (error: any) {
    console.error("Error importing products:", error);
    return NextResponse.json(
      { error: error.message || "Failed to import products" },
      { status: 500 }
    );
  }
}
