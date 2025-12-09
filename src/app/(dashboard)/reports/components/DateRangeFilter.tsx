"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, X } from "lucide-react";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClear: () => void;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
}: DateRangeFilterProps) {
  const hasDates = startDate || endDate;

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    onStartDateChange(start.toISOString().split("T")[0]);
    onEndDateChange(end.toISOString().split("T")[0]);
  };

  return (
    <Card className="bg-card">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Date Range</Label>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(7)}
              className="text-xs"
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(30)}
              className="text-xs"
            >
              Last 30 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(90)}
              className="text-xs"
            >
              Last 90 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(365)}
              className="text-xs"
            >
              Last Year
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="space-y-1">
              <Label htmlFor="startDate" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endDate" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="w-[150px]"
              />
            </div>
            {hasDates && (
              <Button
                variant="outline"
                size="icon"
                onClick={onClear}
                className="mt-6"
                title="Clear dates"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

