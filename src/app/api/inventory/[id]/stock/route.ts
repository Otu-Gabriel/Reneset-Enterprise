import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { auditLogger, getRequestMetadata } from "@/lib/audit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.EDIT_INVENTORY)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { quantity, notes } = body;

    if (!quantity || isNaN(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "Valid quantity is required" },
        { status: 400 }
      );
    }

    // Get current product
    const currentProduct = await prisma.product.findUnique({
      where: { id: id },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!currentProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Calculate new stock
    const newStock = currentProduct.stock + parseInt(quantity);

    // Update product stock
    const updatedProduct = await prisma.product.update({
      where: { id: id },
      data: {
        stock: newStock,
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log audit with stock addition details
    const metadata = getRequestMetadata(request);
    await auditLogger.stockAdded(
      session.user.id,
      updatedProduct.id,
      updatedProduct.name,
      {
        quantityAdded: parseInt(quantity),
        previousStock: currentProduct.stock,
        newStock: newStock,
        notes: notes || null,
      },
      metadata
    );

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Error adding stock:", error);
    return NextResponse.json(
      { error: "Failed to add stock" },
      { status: 500 }
    );
  }
}

