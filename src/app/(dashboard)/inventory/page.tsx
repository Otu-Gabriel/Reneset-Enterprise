import { InventoryTableWithAddButton } from "./components/InventoryTableWithAdd";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !hasPermission(session.user.permissions, Permission.VIEW_INVENTORY)
  ) {
    redirect("/");
  }

  const canCreate = hasPermission(
    session.user.permissions,
    Permission.CREATE_INVENTORY
  );

  return <InventoryTableWithAddButton canCreate={canCreate} />;
}
