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
      !hasPermission(session.user.permissions, Permission.CREATE_CATEGORIES)
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

    // Expected columns: Name, Description (optional)
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const metadata = getRequestMetadata(request);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const name = row.Name || row.name || row["Category Name"];
      const description = row.Description || row.description || null;

      if (!name) {
        results.failed++;
        results.errors.push(`Row ${i + 2}: Missing category name`);
        continue;
      }

      try {
        // Check if category already exists
        const existing = await prisma.category.findUnique({
          where: { name: String(name).trim() },
        });

        if (existing) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Category "${name}" already exists`);
          continue;
        }

        const category = await prisma.category.create({
          data: {
            name: String(name).trim(),
            description: description ? String(description).trim() : null,
          },
        });

        await auditLogger.categoryCreated(
          session.user.id,
          category.id,
          category.name,
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
    console.error("Error importing categories:", error);
    return NextResponse.json(
      { error: error.message || "Failed to import categories" },
      { status: 500 }
    );
  }
}


