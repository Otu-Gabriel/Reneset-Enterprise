import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  dashboardKpiCardClass,
  dashboardKpiCardContentClass,
  dashboardKpiCardHeaderClass,
  dashboardSectionCardClass,
  dashboardSectionCardHeaderClass,
  dashboardSectionCardHeaderPadding,
  dashboardSectionChartContentClass,
  dashboardSectionTableContentClass,
} from "@/lib/dashboard-card";
import { REPORT_CHART_HEIGHT } from "@/lib/reports-chart";

const CELL_WIDTH_ROTATION = ["w-[88%]", "w-[72%]", "w-[92%]", "w-[65%]", "w-[80%]", "w-[76%]", "w-[84%]", "w-[70%]", "w-[90%]"];

export type DataTableSkeletonSize = "default" | "compact";

export function DataTableSkeleton({
  columnCount,
  rowCount = 8,
  className,
  size = "default",
  columnLabels,
}: {
  columnCount: number;
  rowCount?: number;
  className?: string;
  size?: DataTableSkeletonSize;
  /** When length matches `columnCount`, real headers are shown; body stays skeleton. */
  columnLabels?: string[];
}) {
  const headClass =
    size === "compact"
      ? "h-8 px-2 py-2 text-left text-xs font-semibold text-foreground sm:px-3"
      : "font-semibold text-foreground";
  const cellClass =
    size === "compact"
      ? "px-2 py-1.5 text-xs sm:px-3"
      : undefined;

  const showLabels =
    columnLabels && columnLabels.length === columnCount;

  return (
    <div
      className="w-full"
      aria-busy="true"
      aria-label="Loading table"
    >
      <Table className={className}>
        <TableHeader>
          <TableRow>
            {showLabels
              ? columnLabels!.map((label, i) => (
                  <TableHead key={i} className={headClass}>
                    {label}
                  </TableHead>
                ))
              : Array.from({ length: columnCount }).map((_, i) => (
                  <TableHead key={i} className={headClass}>
                    <Skeleton
                      className={cn(
                        "h-4 max-w-[120px]",
                        size === "compact" ? "max-w-[72px]" : undefined,
                      )}
                      style={{ width: `${48 + (i % 5) * 12}%` }}
                    />
                  </TableHead>
                ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowCount }).map((_, ri) => (
            <TableRow key={ri}>
              {Array.from({ length: columnCount }).map((_, ci) => (
                <TableCell key={ci} className={cellClass}>
                  <Skeleton
                    className={cn(
                      "h-4",
                      CELL_WIDTH_ROTATION[(ri + ci) % CELL_WIDTH_ROTATION.length],
                    )}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export type TablePageToolbarVariant =
  | "simple"
  | "inventory"
  | "filters"
  | "employee";

function ToolbarSkeleton({ variant }: { variant: TablePageToolbarVariant }) {
  switch (variant) {
    case "inventory":
      return (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
      );
    case "filters":
      return (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-7 w-44" />
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Skeleton className="h-10 w-full sm:w-64 sm:flex-1 sm:min-w-[180px]" />
            <Skeleton className="h-10 w-full sm:w-48" />
            <Skeleton className="h-10 w-full sm:w-36" />
            <Skeleton className="h-10 w-full sm:w-36" />
            <Skeleton className="h-10 w-full sm:w-36" />
          </div>
        </div>
      );
    case "employee":
      return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-10 w-full max-w-64" />
        </div>
      );
    case "simple":
    default:
      return (
        <div className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-9 w-28" />
        </div>
      );
  }
}

export function TablePageSkeleton({
  columnCount,
  rowCount = 10,
  toolbar = "simple",
  cardClassName,
  columnLabels,
}: {
  columnCount: number;
  rowCount?: number;
  toolbar?: TablePageToolbarVariant;
  cardClassName?: string;
  columnLabels?: string[];
}) {
  return (
    <Card
      className={cn(dashboardSectionCardClass, cardClassName)}
      aria-busy="true"
      aria-label="Loading"
    >
      <CardHeader
        className={cn(
          toolbar === "inventory" &&
            "space-y-4 p-3 pb-4 sm:p-6 sm:pb-4 sm:pt-5",
          toolbar === "filters" &&
            cn(dashboardSectionCardHeaderPadding, "pb-3 sm:pb-4"),
          (toolbar === "simple" || toolbar === "employee") &&
            dashboardSectionCardHeaderClass,
        )}
      >
        <ToolbarSkeleton variant={toolbar} />
      </CardHeader>
      <CardContent
        className={cn(
          dashboardSectionTableContentClass,
          toolbar === "filters" && "relative",
        )}
      >
        <DataTableSkeleton
          columnCount={columnCount}
          rowCount={rowCount}
          columnLabels={columnLabels}
        />
      </CardContent>
    </Card>
  );
}

export function CardTableSkeleton({
  columnCount,
  rowCount = 8,
  className,
  columnLabels,
}: {
  columnCount: number;
  rowCount?: number;
  className?: string;
  columnLabels?: string[];
}) {
  return (
    <Card
      className={cn(dashboardSectionCardClass, className)}
      aria-busy="true"
      aria-label="Loading"
    >
      <CardContent className={cn(dashboardSectionTableContentClass, "pt-6")}>
        <DataTableSkeleton
          columnCount={columnCount}
          rowCount={rowCount}
          columnLabels={columnLabels}
        />
      </CardContent>
    </Card>
  );
}

/** Compact KPI row used above sales / customers / users lists */
export function StatCardsSkeleton({
  count = 4,
}: {
  count?: number;
}) {
  return (
    <div
      className="grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Loading statistics"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={dashboardKpiCardClass}>
          <CardHeader className={dashboardKpiCardHeaderClass}>
            <Skeleton className="h-4 w-28 max-w-[70%]" />
            <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
          </CardHeader>
          <CardContent className={dashboardKpiCardContentClass}>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ReportPageSkeleton({
  summaryCards = 4,
  summaryGridClassName = "md:grid-cols-4",
  chartCards = 2,
  tables = [{ columns: 5, rows: 8 }],
}: {
  summaryCards?: number;
  summaryGridClassName?: string;
  chartCards?: number;
  tables?: Array<{ columns: number; rows?: number }>;
}) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading report">
      <div className={cn("grid gap-4", summaryGridClassName)}>
        {Array.from({ length: summaryCards }).map((_, i) => (
          <Card key={i} className={dashboardKpiCardClass}>
            <CardHeader className={dashboardKpiCardHeaderClass}>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
            </CardHeader>
            <CardContent className={dashboardKpiCardContentClass}>
              <Skeleton className="h-8 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: chartCards }).map((_, i) => (
          <Card key={i} className={dashboardSectionCardClass}>
            <CardHeader className={dashboardSectionCardHeaderClass}>
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
            </CardHeader>
            <CardContent className={dashboardSectionChartContentClass}>
              <Skeleton
                className="w-full rounded-lg"
                style={{ height: REPORT_CHART_HEIGHT }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
      {tables.map((t, i) => (
        <Card key={i} className={dashboardSectionCardClass}>
          <CardHeader className={dashboardSectionCardHeaderPadding}>
            <Skeleton className="h-5 w-52" />
          </CardHeader>
          <CardContent className={dashboardSectionTableContentClass}>
            <DataTableSkeleton
              columnCount={t.columns}
              rowCount={t.rows ?? 8}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
