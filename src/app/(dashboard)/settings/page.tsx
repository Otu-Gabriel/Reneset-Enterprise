import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsPageClient } from "./components/SettingsPageClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  // Users can always view their own profile, but need permissions for other sections
  const canViewAccountInfo = hasPermission(
    session.user.permissions,
    Permission.VIEW_ACCOUNT_INFO
  );
  const canManageSystemSettings = hasPermission(
    session.user.permissions,
    Permission.MANAGE_SYSTEM_SETTINGS
  );

  return (
    <SettingsPageClient
      canViewAccountInfo={canViewAccountInfo}
      canManageSystemSettings={canManageSystemSettings}
    />
  );
}

