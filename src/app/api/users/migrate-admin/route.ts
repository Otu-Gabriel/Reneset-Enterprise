import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";

/**
 * Migration endpoint to update existing admin users with all permissions
 * This ensures admins have MANAGE_USERS and all other permissions
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.MANAGE_USERS)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all available permissions
    const allPermissions = Object.values(Permission);

    // Update all admin users to have all permissions
    const result = await prisma.user.updateMany({
      where: {
        role: "ADMIN",
      },
      data: {
        permissions: allPermissions,
      },
    });

    return NextResponse.json({
      message: `Updated ${result.count} admin user(s) with all permissions`,
      permissions: allPermissions,
    });
  } catch (error) {
    console.error("Error migrating admin permissions:", error);
    return NextResponse.json(
      { error: "Failed to migrate admin permissions" },
      { status: 500 }
    );
  }
}














