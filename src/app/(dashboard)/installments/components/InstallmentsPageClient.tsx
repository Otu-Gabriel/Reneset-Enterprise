"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InstallmentsTable } from "./InstallmentsTable";
import { Search, X } from "lucide-react";

export function InstallmentsPageClient() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
  });

  useEffect(() => {
    setFilters({
      search,
      status: status === "all" ? "" : status,
    });
  }, [search, status]);

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
  };

  const hasActiveFilters = search || (status && status !== "all");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Installment Plans</h1>
        <p className="text-muted-foreground">
          Manage customer installment payments and schedules
        </p>
      </div>

      <Card className="bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by customer name or sale number..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="defaulted">Defaulted</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="icon"
                onClick={clearFilters}
                title="Clear filters"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <InstallmentsTable filters={filters} />
    </div>
  );
}

