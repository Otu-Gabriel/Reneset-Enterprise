"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  Grid3x3,
  Users,
  FileText,
  Settings,
  Tag,
  Package,
  Shield,
  CreditCard,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    permission: Permission.VIEW_DASHBOARD,
  },
  {
    name: "Transactions",
    href: "/transactions",
    icon: TrendingUp,
    permission: Permission.VIEW_SALES,
  },
  {
    name: "Sales",
    href: "/sales",
    icon: Receipt,
    permission: Permission.VIEW_SALES,
  },
  {
    name: "Products",
    href: "/inventory",
    icon: Grid3x3,
    permission: Permission.VIEW_INVENTORY,
  },
  {
    name: "Categories",
    href: "/categories",
    icon: Tag,
    permission: Permission.VIEW_CATEGORIES,
  },
  {
    name: "Brands",
    href: "/brands",
    icon: Package,
    permission: Permission.VIEW_BRANDS,
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
    permission: Permission.VIEW_CUSTOMERS,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
    permission: Permission.VIEW_REPORTS,
  },
  {
    name: "History",
    href: "/history",
    icon: History,
    permission: Permission.VIEW_AUDIT_LOGS,
  },
  { name: "Settings", href: "/settings", icon: Settings, permission: null }, // Everyone can access settings (for profile)
];

const adminNavigation = [
  {
    name: "Users",
    href: "/users",
    icon: Shield,
    permission: Permission.MANAGE_USERS,
  },
  {
    name: "Installments",
    href: "/installments",
    icon: CreditCard,
    permission: Permission.VIEW_INSTALLMENTS,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Filter navigation based on permissions
  const visibleNav = navigation.filter(
    (item) =>
      !item.permission || // Settings is always visible
      (session?.user?.permissions &&
        hasPermission(session.user.permissions, item.permission))
  );

  // Filter admin navigation based on permissions
  const visibleAdminNav = adminNavigation.filter(
    (item) =>
      session?.user?.permissions &&
      hasPermission(session.user.permissions, item.permission)
  );

  // Combine regular navigation with admin navigation
  const allNavigation = [...visibleNav, ...visibleAdminNav];

  return (
    <div className="flex h-screen w-64 flex-col bg-secondary border-r border-border">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <Grid3x3 className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold text-foreground">
          Reneset Enterprise
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {allNavigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
