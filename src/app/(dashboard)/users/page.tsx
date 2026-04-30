import { UsersTable } from "./components/UsersTable";
import { UserStatisticsCards } from "./components/UserStatisticsCards";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !hasPermission(session.user.permissions, Permission.MANAGE_USERS)
  ) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-xl">
          User Management
        </h1>
        <p className="text-muted-foreground">
          Manage system users, roles, and permissions
        </p>
      </div>
      <UserStatisticsCards />
      <UsersTable />
    </div>
  );
}

