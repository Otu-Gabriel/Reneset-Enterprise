"use client";

import { useState } from "react";
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

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => void;
}

// Get all permissions
const allPermissions = Object.values(Permission);

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

export function AddUserModal({
  open,
  onOpenChange,
  onUserCreated,
}: AddUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>(Role.EMPLOYEE);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          permissions,
        }),
      });

      if (response.ok) {
        onOpenChange(false);
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setRole(Role.EMPLOYEE);
        setPermissions([]);
        onUserCreated?.();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission: Permission) => {
    if (permission === Permission.FULL_ACCESS) {
      // If FULL_ACCESS is selected, clear all others and select only FULL_ACCESS
      setPermissions([Permission.FULL_ACCESS]);
    } else {
      // Remove FULL_ACCESS if any other permission is selected
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
      setPermissions(
        permissions.filter((p) => !groupPermissions.includes(p)) as Permission[]
      );
    } else {
      const newPermissions = permissions.filter(
        (p) => p !== Permission.FULL_ACCESS
      ) as Permission[];
      setPermissions([
        ...newPermissions,
        ...(groupPermissions.filter(
          (p) => !newPermissions.includes(p)
        ) as Permission[]),
      ] as Permission[]);
    }
  };

  const hasFullAccess = permissions.includes(Permission.FULL_ACCESS);

  // Permission presets
  const applyPreset = (preset: "admin" | "manager" | "employee") => {
    switch (preset) {
      case "admin":
        setPermissions([Permission.FULL_ACCESS]);
        setRole(Role.ADMIN);
        break;
      case "manager":
        setPermissions([
          Permission.VIEW_DASHBOARD,
          Permission.VIEW_SALES,
          Permission.CREATE_SALES,
          Permission.EDIT_SALES,
          Permission.VIEW_INVENTORY,
          Permission.VIEW_EMPLOYEES,
          Permission.VIEW_REPORTS,
        ]);
        setRole(Role.MANAGER);
        break;
      case "employee":
        setPermissions([
          Permission.VIEW_DASHBOARD,
          Permission.VIEW_SALES,
          Permission.CREATE_SALES,
          Permission.VIEW_INVENTORY,
        ]);
        setRole(Role.EMPLOYEE);
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account with specific permissions
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <div className="flex gap-2">
              <Select
                value={role}
                onValueChange={(value) => setRole(value as Role)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                  <SelectItem value={Role.MANAGER}>Manager</SelectItem>
                  <SelectItem value={Role.EMPLOYEE}>Employee</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset("admin")}
                  title="Apply Admin Preset"
                >
                  Admin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset("manager")}
                  title="Apply Manager Preset"
                >
                  Manager
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset("employee")}
                  title="Apply Employee Preset"
                >
                  Employee
                </Button>
              </div>
            </div>
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
                            id={permission}
                            checked={permissions.includes(permission)}
                            onCheckedChange={() => togglePermission(permission)}
                            disabled={
                              hasFullAccess &&
                              permission !== Permission.FULL_ACCESS
                            }
                          />
                          <Label
                            htmlFor={permission}
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
              {loading ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
