"use client";

import { useState, useEffect, useRef } from "react";
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
import { useCurrency } from "@/hooks/useCurrency";
import { Edit, Trash2, Search, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { EditEmployeeModal } from "./EditEmployeeModal";

const SEARCH_DEBOUNCE_MS = 400;

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  department?: string;
  salary?: number;
  hireDate: string;
  status: string;
}

interface EmployeeTableProps {
  refreshTrigger?: number;
}

export function EmployeeTable({ refreshTrigger }: EmployeeTableProps = {}) {
  const formatCurrency = useCurrency();
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const isFirstFetch = useRef(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const canEdit =
    session?.user?.permissions &&
    hasPermission(session.user.permissions, Permission.EDIT_EMPLOYEES);
  const canDelete =
    session?.user?.permissions &&
    hasPermission(session.user.permissions, Permission.DELETE_EMPLOYEES);

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch((prev) => {
        if (prev !== searchInput) {
          setPage(1);
        }
        return searchInput;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    fetchEmployees();
  }, [page, search, refreshTrigger]);

  const fetchEmployees = async () => {
    try {
      if (isFirstFetch.current) {
        setInitialLoading(true);
      } else {
        setIsRefreshing(true);
      }
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) params.append("search", search);

      const response = await fetch(`/api/employees?${params}`);
      const data = await response.json();
      setEmployees(data.employees || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setInitialLoading(false);
      setIsRefreshing(false);
      isFirstFetch.current = false;
    }
  };

  const handleEdit = async (employee: Employee) => {
    if (!canEdit) {
      alert("You don't have permission to edit employees");
      return;
    }
    try {
      // Fetch full employee data to ensure we have all fields
      const response = await fetch(`/api/employees/${employee.id}`);
      if (response.ok) {
        const fullEmployee = await response.json();
        setEditingEmployee(fullEmployee);
        setEditModalOpen(true);
      } else {
        console.error("Failed to fetch employee details");
        // Fallback to using the employee from table
        setEditingEmployee(employee);
        setEditModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching employee details:", error);
      // Fallback to using the employee from table
      setEditingEmployee(employee);
      setEditModalOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      alert("You don't have permission to delete employees");
      return;
    }
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchEmployees();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete employee");
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      alert("Failed to delete employee");
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm">Loading employees…</p>
      </div>
    );
  }

  return (
    <>
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Employees</CardTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-9 w-64 max-w-full"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
              aria-busy={isRefreshing}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="relative overflow-x-auto">
          {isRefreshing && (
            <div
              className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-background/40 pt-12 backdrop-blur-[1px]"
              aria-live="polite"
            >
              <span className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                Updating results…
              </span>
            </div>
          )}
        <Table
          className={isRefreshing ? "opacity-60 transition-opacity" : ""}
        >
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No employees found
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>{employee.department || "-"}</TableCell>
                  <TableCell>
                    {employee.salary ? formatCurrency(employee.salary) : "-"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        employee.status === "active"
                          ? "bg-green-500/20 text-green-500"
                          : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {employee.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(employee)}
                        disabled={!canEdit}
                        title={
                          canEdit ? "Edit Employee" : "No permission to edit"
                        }
                        className={
                          !canEdit ? "opacity-50 cursor-not-allowed" : ""
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(employee.id)}
                        disabled={!canDelete}
                        title={
                          canDelete
                            ? "Delete Employee"
                            : "No permission to delete"
                        }
                        className={
                          !canDelete ? "opacity-50 cursor-not-allowed" : ""
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
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
    <EditEmployeeModal
        employee={editingEmployee}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={() => {
          fetchEmployees();
          setEditingEmployee(null);
      }}
    />
    </>
  );
}
