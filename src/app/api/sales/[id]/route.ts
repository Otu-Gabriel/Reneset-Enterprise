import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { auditLogger, getRequestMetadata } from "@/lib/audit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getProductVariations(product: any): Array<{ name: string; quantityInBaseUnit: number; price: number }> {
  const raw = Array.isArray(product.variations) ? product.variations : [];
  const normalized = raw
    .map((v: any) => ({
      name: String(v?.name || "").trim(),
      quantityInBaseUnit: Number(v?.quantityInBaseUnit || 0),
      price: Number(v?.price || 0),
    }))
    .filter((v: any) => v.name && v.quantityInBaseUnit > 0 && v.price >= 0);

  if (normalized.length > 0) {
    return normalized;
  }

  return [
    {
      name: product.baseUnit || "item",
      quantityInBaseUnit: 1,
      price: Number(product.price || 0),
    },
  ];
}

function getVariation(product: any, saleUnit: string) {
  const variations = getProductVariations(product);
  return (
    variations.find((v) => v.name.toLowerCase() === String(saleUnit || "").toLowerCase()) ||
    variations.find((v) => v.quantityInBaseUnit === 1) ||
    variations[0]
  );
}

function getProductUnitPrice(product: any, saleUnit: string): number {
  return Number(getVariation(product, saleUnit)?.price || 0);
}

function getBaseQuantity(product: any, quantity: number, saleUnit: string): number {
  const variation = getVariation(product, saleUnit);
  return Math.max(1, Number(variation?.quantityInBaseUnit || 1)) * quantity;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.VIEW_SALES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json(sale);
  } catch (error) {
    console.error("Error fetching sale:", error);
    return NextResponse.json(
      { error: "Failed to fetch sale" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.EDIT_SALES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get existing sale with items
    const existingSale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!existingSale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      status,
      paymentMethod,
      notes,
      items,
    } = body;

    const oldStatus = existingSale.status;
    const newStatus = status || oldStatus;

    // If items are provided, update them
    if (items && Array.isArray(items)) {
      // Calculate new total
      let totalAmount = 0;
      const saleItems = [];

      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          return NextResponse.json(
            { error: `Product ${item.productId} not found` },
            { status: 404 }
          );
        }

        const saleUnit = item.saleUnit === "box" ? "box" : "item";
        const baseQuantity = getBaseQuantity(product, item.quantity, saleUnit);
        const itemDiscount = item.discount || 0;
        const unitPrice = getProductUnitPrice(product, saleUnit);
        const subtotal = unitPrice * item.quantity - itemDiscount;
        totalAmount += subtotal;

        saleItems.push({
          productId: item.productId,
          quantity: item.quantity,
          baseQuantity,
          saleUnit,
          price: unitPrice,
          subtotal,
          discount: itemDiscount,
        });
      }

      // First, restore stock for old items if the sale was completed
      // This ensures we're working with the correct baseline
      if (oldStatus === "completed") {
        for (const oldItem of existingSale.items) {
          await prisma.product.update({
            where: { id: oldItem.productId },
            data: {
              stock: {
                increment: oldItem.baseQuantity || oldItem.quantity,
              },
            },
          });
        }
      }

      // Delete old items and create new ones
      await prisma.saleItem.deleteMany({
        where: { saleId: params.id },
      });

      // Now handle stock based on new status and new items
      if (newStatus === "completed") {
        // Check stock availability for all new items
        for (const newItem of saleItems) {
          const product = await prisma.product.findUnique({
            where: { id: newItem.productId },
          });
          if (product && product.stock < (newItem.baseQuantity || newItem.quantity)) {
            // If insufficient stock, restore what we already restored and return error
            // (We already restored old items, so we need to restore them again if this fails)
            if (oldStatus === "completed") {
              for (const oldItem of existingSale.items) {
                await prisma.product.update({
                  where: { id: oldItem.productId },
                  data: {
                    stock: {
                      decrement: oldItem.baseQuantity || oldItem.quantity,
                    },
                  },
                });
              }
            }
            return NextResponse.json(
              {
                error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Required: ${newItem.baseQuantity || newItem.quantity}`,
              },
              { status: 400 }
            );
          }
        }

        // Deduct stock for new items
        for (const newItem of saleItems) {
          await prisma.product.update({
            where: { id: newItem.productId },
            data: {
              stock: {
                decrement: newItem.baseQuantity || newItem.quantity,
              },
            },
          });
        }
      } else if (newStatus === "cancelled" || newStatus === "returned") {
        // If status is cancelled/returned, stock was already restored above (if oldStatus was completed)
        // No additional action needed
      } else if (newStatus === "pending") {
        // If status is pending, stock was already restored above (if oldStatus was completed)
        // No additional action needed
      }

      // Update sale with new items
      const sale = await prisma.sale.update({
        where: { id: params.id },
        data: {
          customerName: customerName || existingSale.customerName,
          customerEmail: customerEmail ?? existingSale.customerEmail,
          customerPhone: customerPhone ?? existingSale.customerPhone,
          status: newStatus,
          paymentMethod: paymentMethod ?? existingSale.paymentMethod,
          notes: notes ?? existingSale.notes,
          totalAmount,
          items: {
            create: saleItems,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      // Log audit
      const metadata = getRequestMetadata(request);
      const changes: Record<string, any> = {};
      if (oldStatus !== newStatus) changes.status = { from: oldStatus, to: newStatus };
      if (customerName && customerName !== existingSale.customerName) changes.customerName = { from: existingSale.customerName, to: customerName };
      await auditLogger.saleUpdated(
        session.user.id,
        sale.id,
        sale.saleNumber,
        changes,
        metadata
      );

      return NextResponse.json(sale);
    } else {
      // Update sale without changing items - only handle status changes
      // Handle stock restoration if status changes to cancelled/returned
      if (
        (oldStatus === "completed" &&
          (newStatus === "cancelled" || newStatus === "returned")) ||
        (oldStatus === "pending" && newStatus === "cancelled")
      ) {
        // Restore stock for all items
        for (const item of existingSale.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.baseQuantity || item.quantity,
              },
            },
          });
        }
      }

      // Handle stock deduction if status changes from cancelled/returned/pending to completed
      if (
        (oldStatus === "cancelled" ||
          oldStatus === "returned" ||
          oldStatus === "pending") &&
        newStatus === "completed"
      ) {
        // Check stock availability first
        for (const item of existingSale.items) {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
          });
          if (product && product.stock < (item.baseQuantity || item.quantity)) {
            return NextResponse.json(
              {
                error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Required: ${item.baseQuantity || item.quantity}`,
              },
              { status: 400 }
            );
          }
        }

        // Deduct stock for all items
        for (const item of existingSale.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.baseQuantity || item.quantity,
              },
            },
          });
        }
      }

      // Update sale without changing items
      const sale = await prisma.sale.update({
        where: { id: params.id },
        data: {
          customerName: customerName || existingSale.customerName,
          customerEmail: customerEmail ?? existingSale.customerEmail,
          customerPhone: customerPhone ?? existingSale.customerPhone,
          status: newStatus,
          paymentMethod: paymentMethod ?? existingSale.paymentMethod,
          notes: notes ?? existingSale.notes,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      // Log audit
      const metadata = getRequestMetadata(request);
      const changes: Record<string, any> = {};
      if (oldStatus !== newStatus) changes.status = { from: oldStatus, to: newStatus };
      await auditLogger.saleUpdated(
        session.user.id,
        sale.id,
        sale.saleNumber,
        changes,
        metadata
      );

      return NextResponse.json(sale);
    }
  } catch (error) {
    console.error("Error updating sale:", error);
    return NextResponse.json(
      { error: "Failed to update sale" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.DELETE_SALES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get sale data before deletion for audit
    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    await prisma.sale.delete({
      where: { id: params.id },
    });

    // Log audit
    const metadata = getRequestMetadata(request);
    await auditLogger.saleDeleted(
      session.user.id,
      sale.id,
      sale.saleNumber,
      metadata
    );

    return NextResponse.json({ message: "Sale deleted successfully" });
  } catch (error) {
    console.error("Error deleting sale:", error);
    return NextResponse.json(
      { error: "Failed to delete sale" },
      { status: 500 }
    );
  }
}

