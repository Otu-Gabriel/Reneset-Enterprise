import { PrismaClient, Permission, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Every `Permission` value from the generated Prisma client (mirrors `enum Permission`
 * in prisma/schema.prisma). Run `npx prisma generate` after editing the schema, then seed.
 *
 * Filters to strings so numeric reverse-keys from TS numeric enums cannot slip in.
 */
function allPermissionsFromSchema(): Permission[] {
  const values = Object.values(Permission).filter(
    (value): value is Permission => typeof value === "string"
  );
  return Array.from(new Set(values));
}

async function main() {
  console.log("Seeding database...");

  const allPermissions = allPermissionsFromSchema();

  // Create default admin user
  // const hashedPassword = await bcrypt.hash("admin123", 10);

  // const admin = await prisma.user.upsert({
  //   where: { email: "admin@example.com" },
  //   update: {
      // Update existing admin to have all permissions including new ones
  //     permissions: allPermissions,
  //     role: Role.ADMIN,
  //   },
  //   create: {
  //     email: "admin@example.com",
  //     password: hashedPassword,
  //     name: "Admin User",
  //     role: Role.ADMIN,
  //     permissions: allPermissions, // Give admin ALL permissions including MANAGE_USERS
  //   },
  // });

  // console.log("Created admin user:", admin.email);

  // Existing rows keep their permission array until updated; newly added enum values
  // are not appended automatically. Sync full set for admins / FULL_ACCESS accounts.
  const privilegedSync = await prisma.user.updateMany({
    where: {
      OR: [{ role: Role.ADMIN }, { permissions: { has: Permission.FULL_ACCESS } }],
    },
    data: { permissions: allPermissions },
  });
  console.log(
    `Synced ${allPermissions.length} permissions on ${privilegedSync.count} privileged user(s).`
  );

  // Create sample categories
  // const categories = ["Electronics", "Fashion", "Home & Garden"];

  // Create sample products
  // const products = [
  //   {
  //     name: "Laptop",
  //     description: "High-performance laptop",
  //     sku: "LAP-001",
  //     category: "Electronics",
  //     price: 999.99,
  //     cost: 600.0,
  //     stock: 50,
  //     minStock: 10,
  //     unit: "pcs",
  //   },
  //   {
  //     name: "T-Shirt",
  //     description: "Cotton t-shirt",
  //     sku: "TSH-001",
  //     category: "Fashion",
  //     price: 29.99,
  //     cost: 15.0,
  //     stock: 100,
  //     minStock: 20,
  //     unit: "pcs",
  //   },
  //   {
  //     name: "Garden Tool Set",
  //     description: "Complete garden tool set",
  //     sku: "GAR-001",
  //     category: "Home & Garden",
  //     price: 79.99,
  //     cost: 40.0,
  //     stock: 30,
  //     minStock: 5,
  //     unit: "pcs",
  //   },
  // ];

  // for (const product of products) {
  //   await prisma.product.upsert({
  //     where: { sku: product.sku },
  //     update: {},
  //     create: product,
  //   });
  // }

  // console.log("Created sample products");

  // Create sample employees
  // const employees = [
  //   {
  //     name: "John Doe",
  //     email: "john@example.com",
  //     phone: "+1234567890",
  //     position: "Sales Manager",
  //     department: "Sales",
  //     salary: 50000,
  //     status: "active",
  //   },
  //   {
  //     name: "Jane Smith",
  //     email: "jane@example.com",
  //     phone: "+1234567891",
  //     position: "Inventory Specialist",
  //     department: "Operations",
  //     salary: 45000,
  //     status: "active",
  //   },
  // ];

  // for (const employee of employees) {
  //   await prisma.employee.upsert({
  //     where: { email: employee.email },
  //     update: {},
  //     create: {
  //       ...employee,
  //       createdById: admin.id,
  //     },
  //   });
  // }

  // console.log("Created sample employees");
  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

