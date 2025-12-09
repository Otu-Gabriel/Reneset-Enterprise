import { CategoriesTable } from "./components/CategoriesTable";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !hasPermission(session.user.permissions, Permission.VIEW_CATEGORIES)
  ) {
    redirect("/");
  }

  const canCreate = hasPermission(
    session.user.permissions,
    Permission.CREATE_CATEGORIES
  );
  const canEdit = hasPermission(
    session.user.permissions,
    Permission.EDIT_CATEGORIES
  );
  const canDelete = hasPermission(
    session.user.permissions,
    Permission.DELETE_CATEGORIES
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="text-muted-foreground">
          Manage product categories and organize your inventory
        </p>
      </div>
      <CategoriesTable canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
