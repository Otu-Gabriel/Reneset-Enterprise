"use client";

import { Search, Bell, LogOut,Menu,ChevronsLeft, ChevronsRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSidebar } from "./SidebarContext";

export function Navbar() {
  const { isCollapsed, toggleSidebar, toggleMobile } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-sidebar-border bg-sidebar px-4 sm:px-6 text-sidebar-foreground">
      <div className="flex flex-1 items-center gap-2 sm:gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-sidebar-foreground hover:bg-foreground/5 hover:text-sidebar-foreground"
          onClick={toggleMobile}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:flex text-sidebar-foreground hover:bg-foreground/5 hover:text-sidebar-foreground"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronsRight className="h-5 w-5" />
          ) : (
            <ChevronsLeft className="h-5 w-5" />
          )}
        </Button>

        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search"
            className="pl-9 w-full border-border/60 bg-background text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:ring-primary dark:border-border dark:bg-card dark:text-card-foreground dark:placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <ThemeToggle className="text-sidebar-foreground hover:bg-foreground/5" />
        <Button
          variant="ghost"
          size="icon"
          className="relative hidden sm:flex text-sidebar-foreground hover:bg-foreground/5 hover:text-sidebar-foreground"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-sidebar-foreground hover:bg-foreground/5 hover:text-sidebar-foreground"
          onClick={() => signOut()}
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

