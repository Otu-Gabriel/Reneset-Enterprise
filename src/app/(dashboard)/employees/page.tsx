import { EmployeeTable } from "./components/EmployeeTable";
import { EmployeesHeader } from "./components/EmployeesHeader";
import { EmployeesPageClient } from "./components/EmployeesPageClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !hasPermission(session.user.permissions, Permission.VIEW_EMPLOYEES)
  ) {
    redirect("/");
  }

  const canCreate = hasPermission(
    session.user.permissions,
    Permission.CREATE_EMPLOYEES
  );

  return <EmployeesPageClient canCreate={canCreate} />;
}

