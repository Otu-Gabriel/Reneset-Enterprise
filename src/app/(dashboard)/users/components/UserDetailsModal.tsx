"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { X, Shield, User, Mail, Calendar, TrendingUp } from "lucide-react";
import { Permission, Role } from "@prisma/client";
import { Label } from "@/components/ui/label";
import { permissionGroups } from "@/lib/permission-groups";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
  _count: {
    sales: number;
  };
}

interface UserDetailsModalProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailsModal({
  user,
  open,
  onOpenChange,
}: UserDetailsModalProps) {
  if (!user) return null;

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return "bg-purple-500/20 text-purple-500";
      case Role.MANAGER:
        return "bg-blue-500/20 text-blue-500";
      case Role.EMPLOYEE:
        return "bg-green-500/20 text-green-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const hasFullAccess = user.permissions.includes(Permission.FULL_ACCESS);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details - {user.name}</DialogTitle>
          <DialogDescription>Complete user information and permissions</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <span
                className={`mt-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getRoleBadgeColor(
                  user.role
                )}`}
              >
                {user.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </div>
              <p className="font-medium">{user.email}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Role</span>
              </div>
              <p className="font-medium">{user.role}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created</span>
              </div>
              <p className="font-medium">{formatDate(user.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Total Sales</span>
              </div>
              <p className="font-medium">{user._count.sales} sales</p>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissions ({user.permissions.length})
              </h3>
              {hasFullAccess && (
                <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">
                  Full Access Enabled
                </span>
              )}
            </div>
            <div className="space-y-3">
              {Object.entries(permissionGroups).map(([groupName, groupPermissions]) => {
                const userPermissionsInGroup = groupPermissions.filter((p) =>
                  user.permissions.includes(p)
                );
                
                if (hasFullAccess || userPermissionsInGroup.length > 0) {
                  return (
                    <div key={groupName} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold text-sm">{groupName}</Label>
                        <span className="text-xs text-muted-foreground">
                          {hasFullAccess
                            ? groupPermissions.length
                            : userPermissionsInGroup.length}{" "}
                          / {groupPermissions.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pl-4">
                        {groupPermissions.map((permission) => {
                          const hasPermission =
                            hasFullAccess || user.permissions.includes(permission);
                          return (
                            <div
                              key={permission}
                              className={`flex items-center space-x-2 text-sm ${
                                hasPermission
                                  ? "text-foreground"
                                  : "text-muted-foreground opacity-50"
                              }`}
                            >
                              <div
                                className={`h-2 w-2 rounded-full ${
                                  hasPermission ? "bg-green-500" : "bg-gray-300"
                                }`}
                              />
                              <span>{permission.replace(/_/g, " ")}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

