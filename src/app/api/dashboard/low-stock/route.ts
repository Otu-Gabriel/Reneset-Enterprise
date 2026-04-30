import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.VIEW_DASHBOARD)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "8", 10))
    );
    const skip = (page - 1) * limit;

    const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Product" p
      WHERE p.stock <= p."minStock"
    `;
    const total = Number(countResult[0]?.count ?? 0);

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        sku: string;
        stock: number;
        minStock: number;
        category: string;
      }>
    >`
      SELECT p.id, p.name, p.sku, p.stock, p."minStock" AS "minStock", p.category
      FROM "Product" p
      WHERE p.stock <= p."minStock"
      ORDER BY p.stock ASC, p.name ASC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const products = rows.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      stock: Number(p.stock),
      minStock: Number(p.minStock),
      category: p.category,
    }));

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("Dashboard low-stock:", error);
    return NextResponse.json(
      { error: "Failed to load low stock products" },
      { status: 500 }
    );
  }
}
