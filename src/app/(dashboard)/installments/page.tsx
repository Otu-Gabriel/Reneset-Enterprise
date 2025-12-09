import { InstallmentsPageClient } from "./components/InstallmentsPageClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function InstallmentsPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !hasPermission(session.user.permissions, Permission.VIEW_INSTALLMENTS)
  ) {
    redirect("/");
  }

  return <InstallmentsPageClient />;
}

