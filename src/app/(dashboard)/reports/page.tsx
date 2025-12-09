import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportsPageClient } from "./components/ReportsPageClient";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !hasPermission(session.user.permissions, Permission.VIEW_REPORTS)
  ) {
    redirect("/");
  }

  return <ReportsPageClient />;
}

