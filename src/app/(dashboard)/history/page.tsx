import { HistoryPageClient } from "./components/HistoryPageClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !hasPermission(session.user.permissions, Permission.VIEW_AUDIT_LOGS)
  ) {
    redirect("/");
  }

  return <HistoryPageClient />;
}

