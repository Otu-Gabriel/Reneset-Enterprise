import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { auditLogger, getRequestMetadata } from "@/lib/audit";
import * as XLSX from "xlsx";

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

    // Read file buffer
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (data.length === 0) {
      return NextResponse.json(
        { error: "Excel file is empty" },
        { status: 400 }
      );
    }

    // Expected columns: Name, SKU, Category, Price, Description (optional), Brand (optional), Cost (optional), Stock (optional), Min Stock (optional), Unit (optional), Image URL (optional)
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const metadata = getRequestMetadata(request);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const name = row.Name || row.name || row["Product Name"];
      const sku = row.SKU || row.sku;
      const categoryName = row.Category || row.category || row["Category Name"];
      const price = row.Price || row.price;
      const description = row.Description || row.description || null;
      const brandName = row.Brand || row.brand || null;
      const cost = row.Cost || row.cost || null;
      const stock = row.Stock || row.stock || 0;
      const minStock = row["Min Stock"] || row["minStock"] || row["Min Stock"] || 0;
      const unit = row.Unit || row.unit || "pcs";
      const imageUrl = row["Image URL"] || row["imageUrl"] || row["Image URL"] || null;

      if (!name || !sku || !categoryName || price === undefined) {
        results.failed++;
        results.errors.push(
          `Row ${i + 2}: Missing required fields (Name, SKU, Category, Price)`
        );
        continue;
      }

      try {
        // Check if SKU already exists
        const existingSku = await prisma.product.findUnique({
          where: { sku: String(sku).trim() },
        });

        if (existingSku) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: SKU "${sku}" already exists`);
          continue;
        }

        // Find or create category
        let category = await prisma.category.findUnique({
          where: { name: String(categoryName).trim() },
        });

        if (!category) {
          // Create category if it doesn't exist
          category = await prisma.category.create({
            data: {
              name: String(categoryName).trim(),
            },
          });
        }

        // Find brand if provided
        let brandId: string | null = null;
        if (brandName) {
          const brand = await prisma.brand.findFirst({
            where: {
              name: String(brandName).trim(),
              categoryId: category.id,
            },
          });

          if (!brand) {
            // Create brand if it doesn't exist
            const newBrand = await prisma.brand.create({
              data: {
                name: String(brandName).trim(),
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
            name: String(name).trim(),
            sku: String(sku).trim(),
            category: category.name,
            brandId,
            price: parseFloat(String(price)),
            cost: cost ? parseFloat(String(cost)) : null,
            description: description ? String(description).trim() : null,
            stock: parseInt(String(stock)) || 0,
            minStock: parseInt(String(minStock)) || 0,
            unit: String(unit).trim() || "pcs",
            imageUrl: imageUrl ? String(imageUrl).trim() : null,
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
        results.errors.push(`Row ${i + 2}: ${error.message || "Unknown error"}`);
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








