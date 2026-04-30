"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddEmployeeModal } from "./AddEmployeeModal";
import { useRouter } from "next/navigation";

interface EmployeesHeaderProps {
  canCreate: boolean;
  onEmployeeCreated?: () => void;
}

export function EmployeesHeader({
  canCreate,
  onEmployeeCreated,
}: EmployeesHeaderProps) {
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
    onEmployeeCreated?.();
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-xl">
          Employees
        </h1>
        <p className="text-muted-foreground">Manage your employees</p>
      </div>
      {canCreate && (
        <AddEmployeeModal onSuccess={handleSuccess}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </AddEmployeeModal>
      )}
    </div>
  );
}
