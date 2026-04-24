"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
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
import { useSystemSettings } from "@/hooks/useSystemSettings";
import Image from "next/image";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    permission: Permission.VIEW_DASHBOARD,
  },
  
  {
    name: "Sales",
    href: "/sales",
    icon: Receipt,
    permission: Permission.VIEW_SALES,
  },
  {
    name: "Installments",
    href: "/installments",
    icon: CreditCard,
    permission: Permission.VIEW_INSTALLMENTS,
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
];

const adminNavigation = [
  {
    name: "Users",
    href: "/users",
    icon: Shield,
    permission: Permission.MANAGE_USERS,
  },
  {
    name: "Employees",
    href: "/employees",
    icon: Users,
    permission: Permission.VIEW_EMPLOYEES,
  },
  { name: "Settings", href: "/settings", icon: Settings, permission: null }, // Everyone can access settings (for profile)

  
  
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isCollapsed, isMobileOpen, toggleSidebar, closeMobile } =
    useSidebar();
  const { settings } = useSystemSettings();
  
  const companyName = settings?.companyName || "GabyGod-Inventory";
  const logoUrl = settings?.logoUrl;

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
      !item.permission || // Settings is always visible
      (item.permission &&
        session?.user?.permissions &&
        hasPermission(session.user.permissions, item.permission))
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
          "fixed lg:sticky top-0 left-0 z-50 flex h-screen flex-col overflow-x-hidden bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16 lg:w-16" : "w-64 lg:w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex h-16 min-w-0 items-center border-b border-sidebar-border transition-all duration-300",
            isCollapsed ? "justify-center px-0" : "justify-between px-4 sm:px-6"
          )}
        >
          <div
            className={cn(
              "flex min-w-0 items-center gap-2 transition-all duration-300",
              isCollapsed ? "w-0 opacity-0" : "w-auto min-w-0 flex-1 opacity-100"
            )}
          >
            {logoUrl ? (
              <div className="h-8 w-8 flex-shrink-0 relative">
                <Image
                  src={logoUrl}
                  alt={companyName}
                  fill
                  className="object-contain rounded-lg"
                />
              </div>
            ) : (
              <Grid3x3 className="h-6 w-6 text-primary flex-shrink-0" />
            )}
            <span className="truncate text-lg font-semibold text-primary">
              {companyName}
            </span>
          </div>
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            {isMobileOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-sidebar-foreground hover:bg-foreground/5 hover:text-sidebar-foreground"
                onClick={closeMobile}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
            {/* Desktop collapse button */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex text-sidebar-foreground hover:bg-foreground/5 hover:text-sidebar-foreground"
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
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 min-h-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-muted hover:bg-foreground/5 hover:text-sidebar-foreground"
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
                  <div className="absolute left-full ml-2 px-2 py-1 text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none bg-popover text-popover-foreground border border-border shadow-md">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer — branded panel (readable hierarchy, subtle depth; no heavy wave fill) */}
        <div
          className={cn(
            "shrink-0 border-t border-sidebar-border bg-sidebar",
            isCollapsed ? "py-2.5" : "p-3 pb-4"
          )}
        >
          {isCollapsed ? (
            <div
              className="flex justify-center"
              aria-hidden
            >
              <div className="h-9 w-1 rounded-full bg-gradient-to-b from-primary via-primary/75 to-primary/25 shadow-[0_0_14px_rgba(249,115,22,0.35)]" />
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card/50 px-3 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div
                className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-primary/25 blur-2xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-primary/15 blur-xl"
                aria-hidden
              />
              <div className="relative flex gap-3">
                <div
                  className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-gradient-to-b from-primary to-primary/55"
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Operations hub
                  </p>
                  <p className="text-xs leading-relaxed text-sidebar-muted">
                    Inventory, sales, and reporting in one place.
                  </p>
                  <p className="truncate pt-0.5 text-[10px] text-sidebar-muted/70">
                    © {new Date().getFullYear()}{" "}
                    <span className="text-sidebar-muted/90">GabyGod Technologies</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
