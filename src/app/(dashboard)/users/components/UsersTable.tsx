"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { Edit, Trash2, Search, Shield, User, Plus, Eye } from "lucide-react";
import { useSession } from "next-auth/react";
import { Permission, Role } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { AddUserModal } from "./AddUserModal";
import { EditUserModal } from "./EditUserModal";
import { UserDetailsModal } from "./UserDetailsModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export function UsersTable() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const canEdit =
    session?.user?.permissions &&
    hasPermission(session.user.permissions, Permission.MANAGE_USERS);
  const canDelete =
    session?.user?.permissions &&
    hasPermission(session.user.permissions, Permission.MANAGE_USERS);

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) params.append("search", search);
      if (roleFilter && roleFilter !== "all") params.append("role", roleFilter);

      const response = await fetch(`/api/users?${params}`);
      const data = await response.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
    }
  };

  const handleEdit = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const user = await response.json();
        setSelectedUser(user);
        setEditOpen(true);
      }
    } catch (error) {
      console.error("Error fetching user for edit:", error);
    }
  };

  const handleViewDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const user = await response.json();
        setSelectedUser(user);
        setDetailsOpen(true);
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

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

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <>
      <Card className="bg-card">
        <CardHeader>
          <div className="flex items-center sm:flex-row flex-col gap-3 justify-between">
            <CardTitle>Users</CardTitle>
            <div className="flex items-center gap-4 flex-col w-full sm:w-auto sm:flex-row sm:flex-wrap">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search users..."
                  className="pl-9 w-full sm:w-64"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-auto">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                  <SelectItem value={Role.MANAGER}>Manager</SelectItem>
                  <SelectItem value={Role.EMPLOYEE}>Employee</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={() => setAddOpen(true)}
                disabled={!canEdit}
                title={!canEdit ? "You don't have permission to manage users" : ""}
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Sales Count</TableHead>
                <TableHead>Created</TableHead>
                {(canEdit || canDelete) && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewDetails(user.id)}
                >
                    <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        {user.name}
                        {session?.user?.id === user.id && (
                          <span className="text-xs text-muted-foreground">(You)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {user.permissions.length} permission
                          {user.permissions.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{user._count.sales}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(user.id)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(user.id)}
                              title="Edit User"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && session?.user?.id !== user.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(user.id)}
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <AddUserModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onUserCreated={fetchUsers}
      />
      <EditUserModal
        user={selectedUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUserUpdated={fetchUsers}
      />
      <UserDetailsModal
        user={selectedUser}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
}

