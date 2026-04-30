import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CustomersTable } from "./components/CustomersTable";
import { CustomerStatisticsCards } from "./components/CustomerStatisticsCards";

export default async function CustomersPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !hasPermission(session.user.permissions, Permission.VIEW_CUSTOMERS)
  ) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-xl">
          Customers
        </h1>
        <p className="text-muted-foreground">
          Manage your customers and view their purchase history
        </p>
      </div>
      <CustomerStatisticsCards />
      <CustomersTable />
    </div>
  );
}

