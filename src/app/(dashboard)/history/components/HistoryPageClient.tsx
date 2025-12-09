"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";

// Define enum values as constants for client-side use
const AuditAction = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  VIEW: "VIEW",
  EXPORT: "EXPORT",
  IMPORT: "IMPORT",
  PASSWORD_CHANGE: "PASSWORD_CHANGE",
  PERMISSION_CHANGE: "PERMISSION_CHANGE",
  STATUS_CHANGE: "STATUS_CHANGE",
} as const;

const AuditEntity = {
  PRODUCT: "PRODUCT",
  SALE: "SALE",
  EMPLOYEE: "EMPLOYEE",
  USER: "USER",
  CATEGORY: "CATEGORY",
  BRAND: "BRAND",
  INSTALLMENT: "INSTALLMENT",
  INSTALLMENT_PAYMENT: "INSTALLMENT_PAYMENT",
  PROFILE: "PROFILE",
  SETTINGS: "SETTINGS",
  SYSTEM: "SYSTEM",
} as const;

type AuditActionType = typeof AuditAction[keyof typeof AuditAction];
type AuditEntityType = typeof AuditEntity[keyof typeof AuditEntity];

interface AuditLog {
  id: string;
  action: AuditActionType;
  entity: AuditEntityType;
  entityId: string | null;
  description: string;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function HistoryPageClient() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) params.append("search", search);
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (entityFilter !== "all") params.append("entity", entityFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.auditLogs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [pagination.page, actionFilter, entityFilter, startDate, endDate]);

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchAuditLogs();
  };

  const clearFilters = () => {
    setSearch("");
    setActionFilter("all");
    setEntityFilter("all");
    setStartDate("");
    setEndDate("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getActionBadgeVariant = (action: AuditActionType) => {
    switch (action) {
      case AuditAction.CREATE:
        return "default";
      case AuditAction.UPDATE:
        return "secondary";
      case AuditAction.DELETE:
        return "destructive";
      case AuditAction.LOGIN:
      case AuditAction.LOGOUT:
        return "outline";
      default:
        return "outline";
    }
  };

  const getEntityBadgeColor = (entity: AuditEntityType) => {
    const colors: Record<string, string> = {
      [AuditEntity.PRODUCT]: "bg-blue-500/10 text-blue-500",
      [AuditEntity.SALE]: "bg-green-500/10 text-green-500",
      [AuditEntity.EMPLOYEE]: "bg-purple-500/10 text-purple-500",
      [AuditEntity.USER]: "bg-orange-500/10 text-orange-500",
      [AuditEntity.CATEGORY]: "bg-cyan-500/10 text-cyan-500",
      [AuditEntity.BRAND]: "bg-pink-500/10 text-pink-500",
      [AuditEntity.INSTALLMENT]: "bg-yellow-500/10 text-yellow-500",
      [AuditEntity.INSTALLMENT_PAYMENT]: "bg-indigo-500/10 text-indigo-500",
      [AuditEntity.PROFILE]: "bg-teal-500/10 text-teal-500",
      [AuditEntity.SETTINGS]: "bg-gray-500/10 text-gray-500",
      [AuditEntity.SYSTEM]: "bg-red-500/10 text-red-500",
    };
    return colors[entity] || "bg-gray-500/10 text-gray-500";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activity History</h1>
        <p className="text-muted-foreground">
          Comprehensive audit log of all system activities
        </p>
      </div>

      <Card className="p-4">
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Search descriptions or IDs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value={AuditAction.CREATE}>Create</SelectItem>
                <SelectItem value={AuditAction.UPDATE}>Update</SelectItem>
                <SelectItem value={AuditAction.DELETE}>Delete</SelectItem>
                <SelectItem value={AuditAction.LOGIN}>Login</SelectItem>
                <SelectItem value={AuditAction.LOGOUT}>Logout</SelectItem>
                <SelectItem value={AuditAction.EXPORT}>Export</SelectItem>
                <SelectItem value={AuditAction.PASSWORD_CHANGE}>Password Change</SelectItem>
                <SelectItem value={AuditAction.PERMISSION_CHANGE}>Permission Change</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value={AuditEntity.PRODUCT}>Product</SelectItem>
                <SelectItem value={AuditEntity.SALE}>Sale</SelectItem>
                <SelectItem value={AuditEntity.EMPLOYEE}>Employee</SelectItem>
                <SelectItem value={AuditEntity.USER}>User</SelectItem>
                <SelectItem value={AuditEntity.CATEGORY}>Category</SelectItem>
                <SelectItem value={AuditEntity.BRAND}>Brand</SelectItem>
                <SelectItem value={AuditEntity.INSTALLMENT}>Installment</SelectItem>
                <SelectItem value={AuditEntity.INSTALLMENT_PAYMENT}>Payment</SelectItem>
                <SelectItem value={AuditEntity.PROFILE}>Profile</SelectItem>
                <SelectItem value={AuditEntity.SETTINGS}>Settings</SelectItem>
                <SelectItem value={AuditEntity.SYSTEM}>System</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={clearFilters} variant="outline" size="icon" title="Clear filters">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground">
            No audit logs found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {log.user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getEntityBadgeColor(log.entity)}>
                          {log.entity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate" title={log.description}>
                          {log.description}
                        </div>
                        {log.entityId && (
                          <div className="text-xs text-muted-foreground mt-1">
                            ID: {log.entityId}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.ipAddress || "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} entries
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
                    }))
                  }
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.totalPages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

