import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { auditLogger, getRequestMetadata } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !hasPermission(session.user.permissions, Permission.VIEW_EMPLOYEES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
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
      !hasPermission(session.user.permissions, Permission.EDIT_EMPLOYEES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      position,
      department,
      salary,
      status,
      address,
    } = body;

    // Check if email is being changed and if it already exists
    if (email) {
      const existingEmployee = await prisma.employee.findUnique({
        where: { email },
      });

      if (existingEmployee && existingEmployee.id !== params.id) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        );
      }
    }

    // Get old employee data for audit
    const oldEmployee = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(position && { position }),
        ...(department !== undefined && { department }),
        ...(salary !== undefined && {
          salary: salary ? parseFloat(salary) : null,
        }),
        ...(status && { status }),
        ...(address !== undefined && { address }),
        updatedById: session.user.id,
      },
    });

    // Log audit
    const metadata = getRequestMetadata(request);
    const changes: Record<string, any> = {};
    if (oldEmployee) {
      if (name && name !== oldEmployee.name) changes.name = { from: oldEmployee.name, to: name };
      if (status && status !== oldEmployee.status) changes.status = { from: oldEmployee.status, to: status };
      if (position && position !== oldEmployee.position) changes.position = { from: oldEmployee.position, to: position };
    }
    await auditLogger.employeeUpdated(
      session.user.id,
      employee.id,
      employee.name,
      changes,
      metadata
    );

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
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
      !hasPermission(session.user.permissions, Permission.DELETE_EMPLOYEES)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get employee data before deletion for audit
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    await prisma.employee.delete({
      where: { id: params.id },
    });

    // Log audit
    const metadata = getRequestMetadata(request);
    await auditLogger.employeeDeleted(
      session.user.id,
      employee.id,
      employee.name,
      metadata
    );

    return NextResponse.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}

