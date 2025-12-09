import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Permission } from "@prisma/client";
import { hasPermission } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CustomersPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !hasPermission(session.user.permissions, Permission.VIEW_CUSTOMERS)
  ) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="text-muted-foreground">Manage your customers</p>
      </div>
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Customers feature coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

