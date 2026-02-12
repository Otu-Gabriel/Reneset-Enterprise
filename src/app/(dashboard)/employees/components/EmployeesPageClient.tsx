"use client";

import { useState } from "react";
import { EmployeeTable } from "./EmployeeTable";
import { EmployeesHeader } from "./EmployeesHeader";

interface EmployeesPageClientProps {
  canCreate: boolean;
}

export function EmployeesPageClient({ canCreate }: EmployeesPageClientProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleEmployeeCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <EmployeesHeader canCreate={canCreate} onEmployeeCreated={handleEmployeeCreated} />
      <EmployeeTable refreshTrigger={refreshTrigger} />
    </div>
  );
}
