import { BrandsTable } from "./components/BrandsTable";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function BrandsPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !hasPermission(session.user.permissions, Permission.VIEW_BRANDS)
  ) {
    redirect("/");
  }

  const canCreate = hasPermission(
    session.user.permissions,
    Permission.CREATE_BRANDS
  );
  const canEdit = hasPermission(
    session.user.permissions,
    Permission.EDIT_BRANDS
  );
  const canDelete = hasPermission(
    session.user.permissions,
    Permission.DELETE_BRANDS
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-xl">
          Brands
        </h1>
        <p className="text-muted-foreground">
          Manage product brands and organize by category
        </p>
      </div>
      <BrandsTable canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}

