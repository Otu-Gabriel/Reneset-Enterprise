"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Permission, Role } from "@prisma/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
}

interface EditUserModalProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated?: () => void;
}

// Group permissions by category
const permissionGroups = {
  Dashboard: [Permission.VIEW_DASHBOARD],
  Sales: [
    Permission.VIEW_SALES,
    Permission.CREATE_SALES,
    Permission.EDIT_SALES,
    Permission.DELETE_SALES,
  ],
  Inventory: [
    Permission.VIEW_INVENTORY,
    Permission.CREATE_INVENTORY,
    Permission.EDIT_INVENTORY,
    Permission.DELETE_INVENTORY,
  ],
  Employees: [
    Permission.VIEW_EMPLOYEES,
    Permission.CREATE_EMPLOYEES,
    Permission.EDIT_EMPLOYEES,
    Permission.DELETE_EMPLOYEES,
  ],
  System: [
    Permission.VIEW_REPORTS,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_USERS,
    Permission.FULL_ACCESS,
  ],
};

export function EditUserModal({
  user,
  open,
  onOpenChange,
  onUserUpdated,
}: EditUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>(Role.EMPLOYEE);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [changePassword, setChangePassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setPermissions(user.permissions);
      setPassword("");
      setConfirmPassword("");
      setChangePassword(false);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (changePassword) {
      if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
      }

      if (password.length < 6) {
        alert("Password must be at least 6 characters long");
        return;
      }
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          role,
          permissions,
          ...(changePassword && password ? { password } : {}),
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        onUserUpdated?.();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission: Permission) => {
    if (permission === Permission.FULL_ACCESS) {
      setPermissions([Permission.FULL_ACCESS]);
    } else {
      const newPermissions = permissions.filter(
        (p) => p !== Permission.FULL_ACCESS
      );
      if (permissions.includes(permission)) {
        setPermissions(newPermissions.filter((p) => p !== permission));
      } else {
        setPermissions([...newPermissions, permission]);
      }
    }
  };

  const selectAllInGroup = (groupPermissions: Permission[]) => {
    const hasAll = groupPermissions.every((p) => permissions.includes(p));
    if (hasAll) {
      setPermissions(permissions.filter((p) => !groupPermissions.includes(p)));
    } else {
      const newPermissions = permissions.filter(
        (p) => p !== Permission.FULL_ACCESS
      ) as Permission[];
      const additionalPermissions = groupPermissions.filter(
        (p) => !newPermissions.includes(p as Permission)
      ) as Permission[];
      setPermissions([
        ...newPermissions,
        ...additionalPermissions,
      ] as Permission[]);
    }
  };

  const hasFullAccess = permissions.includes(Permission.FULL_ACCESS);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User - {user.name}</DialogTitle>
          <DialogDescription>
            Update user information and permissions
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="changePassword"
                checked={changePassword}
                onCheckedChange={(checked) =>
                  setChangePassword(checked as boolean)
                }
              />
              <Label htmlFor="changePassword" className="cursor-pointer">
                Change Password
              </Label>
            </div>
            {changePassword && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-password">New Password *</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={changePassword}
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-confirmPassword">
                    Confirm Password *
                  </Label>
                  <Input
                    id="edit-confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={changePassword}
                    minLength={6}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role">Role *</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as Role)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                <SelectItem value={Role.MANAGER}>Manager</SelectItem>
                <SelectItem value={Role.EMPLOYEE}>Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Permissions</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (hasFullAccess) {
                    setPermissions([]);
                  } else {
                    setPermissions([Permission.FULL_ACCESS]);
                  }
                }}
              >
                {hasFullAccess ? "Clear All" : "Select Full Access"}
              </Button>
            </div>
            <div className="space-y-4">
              {Object.entries(permissionGroups).map(
                ([groupName, groupPermissions]) => (
                  <div key={groupName} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold">{groupName}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => selectAllInGroup(groupPermissions)}
                      >
                        Select All
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-4">
                      {groupPermissions.map((permission) => (
                        <div
                          key={permission}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`edit-${permission}`}
                            checked={permissions.includes(permission)}
                            onCheckedChange={() => togglePermission(permission)}
                            disabled={
                              hasFullAccess &&
                              permission !== Permission.FULL_ACCESS
                            }
                          />
                          <Label
                            htmlFor={`edit-${permission}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {permission.replace(/_/g, " ")}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
