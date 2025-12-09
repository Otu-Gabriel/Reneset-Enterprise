"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Shield, User, Mail, Calendar, TrendingUp, DollarSign, Link as LinkIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { Permission } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AccountInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
  statistics: {
    salesCount: number;
    totalRevenue: number;
  };
}

export function AccountInformation() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);

  useEffect(() => {
    fetchAccountInfo();
  }, []);

  const fetchAccountInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/settings/profile");
      if (response.ok) {
        const data = await response.json();
        setAccountInfo(data);
      }
    } catch (error) {
      console.error("Error fetching account info:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case "MANAGER":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "EMPLOYEE":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const getPermissionCategory = (permission: Permission) => {
    if (permission === Permission.FULL_ACCESS) return "System";
    if (permission.toString().startsWith("VIEW_")) return "View";
    if (permission.toString().startsWith("CREATE_")) return "Create";
    if (permission.toString().startsWith("EDIT_")) return "Edit";
    if (permission.toString().startsWith("DELETE_")) return "Delete";
    return "Other";
  };

  const groupedPermissions = accountInfo?.permissions.reduce((acc, perm) => {
    const category = getPermissionCategory(perm);
    if (!acc[category]) acc[category] = [];
    acc[category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>) || {};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!accountInfo) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Failed to load account information</p>
        </CardContent>
      </Card>
    );
  }

  const canManageUsers = session?.user?.permissions?.includes(Permission.MANAGE_USERS) ||
    session?.user?.permissions?.includes(Permission.FULL_ACCESS);

  return (
    <div className="space-y-6">
      {/* Account Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Role</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountInfo.role}</div>
            <Badge className={getRoleBadgeColor(accountInfo.role)}>
              {accountInfo.role}
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountInfo.statistics.salesCount}</div>
            <p className="text-xs text-muted-foreground">Sales transactions</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(accountInfo.statistics.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">From your sales</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountInfo.permissions.length}</div>
            <p className="text-xs text-muted-foreground">Active permissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Details */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Your account information and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Name
                </TableCell>
                <TableCell>{accountInfo.name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email
                </TableCell>
                <TableCell>{accountInfo.email}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Role
                </TableCell>
                <TableCell>
                  <Badge className={getRoleBadgeColor(accountInfo.role)}>
                    {accountInfo.role}
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Account Created
                </TableCell>
                <TableCell>{formatDate(accountInfo.createdAt)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Last Updated
                </TableCell>
                <TableCell>{formatDate(accountInfo.updatedAt)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>Your assigned permissions and access levels</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedPermissions).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                    {category} Permissions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {perms.map((perm) => (
                      <Badge
                        key={perm}
                        variant="outline"
                        className="text-xs"
                      >
                        {perm.toString().replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No permissions assigned</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      {canManageUsers && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Administrative tools and resources</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/users">
              <Button variant="outline" className="w-full justify-start">
                <LinkIcon className="mr-2 h-4 w-4" />
                User Management
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

