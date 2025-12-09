import { EmployeeTable } from "./components/EmployeeTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage your employees</p>
        </div>
        {canCreate && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        )}
      </div>
      <EmployeeTable />
    </div>
  );
}

