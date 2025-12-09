import { SalesPageClient } from "./components/SalesPageClient";
import { Filters } from "./components/Filters";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SalesPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !hasPermission(session.user.permissions, Permission.VIEW_SALES)
  ) {
    redirect("/");
  }

  const canCreate = hasPermission(
    session.user.permissions,
    Permission.CREATE_SALES
  );

  return (
    <div className="space-y-6">
      <SalesPageClient canCreate={canCreate} />
    </div>
  );
}

