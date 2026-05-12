/** Section cards: tables, charts, filters (matches dashboard home lists / charts). */
export const dashboardSectionCardClass =
  "min-w-0 overflow-hidden bg-card border-border/80 shadow-sm";

/** Header row for section cards (titles + optional trailing icon/actions). */
export const dashboardSectionCardHeaderPadding =
  "p-3 pb-2 sm:p-6 sm:pb-2 sm:pt-5";

export const dashboardSectionCardHeaderClass =
  `flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 ${dashboardSectionCardHeaderPadding}`;

/** Title in section card headers. */
export const dashboardSectionCardTitleClass =
  "text-sm font-semibold leading-tight tracking-tight text-foreground";

/** Table body wrapper used under section headers (flush horizontal on mobile). */
export const dashboardSectionTableContentClass =
  "min-w-0 px-0 pb-4 pt-0 sm:px-6";

/** Chart body padding inside section cards (dashboard home charts). */
export const dashboardSectionChartContentClass =
  "min-w-0 px-3 pb-3 pt-0 sm:px-6";

/** KPI / metric tiles — aligns with dashboard `StatCard` footprint. */
export const dashboardKpiCardClass =
  "flex min-h-[118px] flex-col bg-card border-border/80 shadow-sm";

export const dashboardKpiCardHeaderClass =
  "flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3";

export const dashboardKpiCardTitleClass =
  "font-medium leading-tight text-muted-foreground text-[0.625rem] sm:text-[0.6875rem]";

export const dashboardKpiCardContentClass = "px-3 pb-3 pt-0";
