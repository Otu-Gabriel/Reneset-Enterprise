"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/** Slightly smaller than legacy `text-xl sm:text-2xl` for dense report grids */
export const reportMetricValueClass =
  "text-base font-bold tabular-nums tracking-tight text-foreground sm:text-lg";

interface ReportMetricCardProps {
  title: string;
  icon: LucideIcon;
  /** Background + text color for the icon tile (e.g. bg-primary/15 text-primary) */
  iconClassName: string;
  className?: string;
  children: ReactNode;
}

/**
 * Summary tile for report tabs — title + trailing icon tile, body slots for value/subcopy.
 */
export function ReportMetricCard({
  title,
  icon: Icon,
  iconClassName,
  className,
  children,
}: ReportMetricCardProps) {
  return (
    <Card className={cn("bg-card", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
          {title}
        </CardTitle>
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            iconClassName
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
