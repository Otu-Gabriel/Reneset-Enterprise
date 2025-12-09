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
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { useSidebar } from "./SidebarContext";
import { Button } from "@/components/ui/button";

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
  const { isCollapsed, isMobileOpen, toggleSidebar, closeMobile } =
    useSidebar();

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
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 flex h-screen flex-col bg-secondary border-r border-border transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16 lg:w-16" : "w-64 lg:w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-border transition-all duration-300",
            isCollapsed ? "justify-center px-0" : "justify-between px-6"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 transition-all duration-300",
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            )}
          >
            <Grid3x3 className="h-6 w-6 text-primary flex-shrink-0" />
            <span className="text-lg font-semibold text-foreground whitespace-nowrap">
              Reneset Enterprise
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile close button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={closeMobile}
            >
              <X className="h-5 w-5" />
            </Button>
            {/* Desktop collapse button */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={toggleSidebar}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {allNavigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => {
                  // Close mobile sidebar when navigating
                  if (window.innerWidth < 1024) {
                    closeMobile();
                  }
                }}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span
                  className={cn(
                    "transition-all duration-300 whitespace-nowrap",
                    isCollapsed
                      ? "w-0 opacity-0 overflow-hidden"
                      : "w-auto opacity-100"
                  )}
                >
                  {item.name}
                </span>
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 text-sm text-white bg-gray-900 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
