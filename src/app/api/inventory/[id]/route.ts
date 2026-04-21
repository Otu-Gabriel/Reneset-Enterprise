import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { auditLogger, getRequestMetadata } from "@/lib/audit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.VIEW_INVENTORY)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
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
      !hasPermission(session.user.permissions, Permission.EDIT_INVENTORY)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      sku,
      categoryId,
      brandId,
      price,
      cost,
      baseUnit,
      variations,
      stock,
      minStock,
      unit,
      imageUrl,
    } = body;

    // Check if SKU is being changed and if it already exists
    if (sku) {
      const existingProduct = await prisma.product.findUnique({
        where: { sku },
      });

      if (existingProduct && existingProduct.id !== params.id) {
        return NextResponse.json(
          { error: "SKU already exists" },
          { status: 400 }
        );
      }
    }

    // Get category name from categoryId if provided
    let categoryName = undefined;
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 400 }
        );
      }
      categoryName = category.name;
    }

    // Validate brand if provided
    if (brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
      });

      if (!brand) {
        return NextResponse.json(
          { error: "Brand not found" },
          { status: 400 }
        );
      }

      // Get current product to check category if categoryId not provided
      let targetCategoryId = categoryId;
      if (!targetCategoryId) {
        const currentProduct = await prisma.product.findUnique({
          where: { id: params.id },
        });
        if (currentProduct) {
          // Find category by name
          const currentCategory = await prisma.category.findFirst({
            where: { name: currentProduct.category },
          });
          targetCategoryId = currentCategory?.id;
        }
      }

      if (targetCategoryId && brand.categoryId !== targetCategoryId) {
        return NextResponse.json(
          { error: "Brand does not belong to selected category" },
          { status: 400 }
        );
      }
    }

    // Get old product data for audit
    const oldProduct = await prisma.product.findUnique({
      where: { id: params.id },
    });

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(sku && { sku }),
        ...(categoryName && { category: categoryName }),
        ...(brandId !== undefined && { brandId: brandId || null }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(cost !== undefined && { cost: cost ? parseFloat(cost) : null }),
        ...(baseUnit !== undefined && { baseUnit: String(baseUnit) }),
        ...(variations !== undefined && { variations }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(minStock !== undefined && { minStock: parseInt(minStock) }),
        ...(unit && { unit }),
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

    // Log audit
    const metadata = getRequestMetadata(request);
    const changes: Record<string, any> = {};
    if (oldProduct) {
      if (name && name !== oldProduct.name) changes.name = { from: oldProduct.name, to: name };
      if (price !== undefined && parseFloat(price) !== oldProduct.price) changes.price = { from: oldProduct.price, to: parseFloat(price) };
      if (stock !== undefined && parseInt(stock) !== oldProduct.stock) changes.stock = { from: oldProduct.stock, to: parseInt(stock) };
    }
    await auditLogger.productUpdated(
      session.user.id,
      product.id,
      product.name,
      changes,
      metadata
    );

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
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
      !hasPermission(session.user.permissions, Permission.DELETE_INVENTORY)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get product data before deletion for audit
    const product = await prisma.product.findUnique({
      where: { id: params.id },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await prisma.product.delete({
      where: { id: params.id },
    });

    // Log audit
    const metadata = getRequestMetadata(request);
    await auditLogger.productDeleted(
      session.user.id,
      product.id,
      product.name,
      metadata
    );

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}

