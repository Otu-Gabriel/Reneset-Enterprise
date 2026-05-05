import { Permission } from "@prisma/client";

/**
 * Grouped permissions for user management UI (Add/Edit user).
 * Must cover every value in `enum Permission` in prisma/schema.prisma — the modals
 * only render checkboxes from this map, not from `Object.values(Permission)` alone.
 */
export const permissionGroups: Record<string, Permission[]> = {
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
    Permission.VIEW_PRODUCT_COST,
    Permission.EDIT_PRODUCT_COST,
  ],
  Categories: [
    Permission.VIEW_CATEGORIES,
    Permission.CREATE_CATEGORIES,
    Permission.EDIT_CATEGORIES,
    Permission.DELETE_CATEGORIES,
  ],
  Brands: [
    Permission.VIEW_BRANDS,
    Permission.CREATE_BRANDS,
    Permission.EDIT_BRANDS,
    Permission.DELETE_BRANDS,
  ],
  Customers: [
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMERS,
    Permission.EDIT_CUSTOMERS,
    Permission.DELETE_CUSTOMERS,
  ],
  "Installments & payments": [
    Permission.VIEW_INSTALLMENTS,
    Permission.CREATE_INSTALLMENTS,
    Permission.RECORD_PAYMENTS,
    Permission.MANAGE_INSTALLMENTS,
  ],
  Employees: [
    Permission.VIEW_EMPLOYEES,
    Permission.CREATE_EMPLOYEES,
    Permission.EDIT_EMPLOYEES,
    Permission.DELETE_EMPLOYEES,
  ],
  Reports: [Permission.VIEW_REPORTS, Permission.EXPORT_REPORTS],
  "Audit trail": [Permission.VIEW_AUDIT_LOGS],
  Profile: [Permission.EDIT_OWN_PROFILE, Permission.VIEW_ACCOUNT_INFO],
  "System & settings": [
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_SYSTEM_SETTINGS,
  ],
  Users: [Permission.MANAGE_USERS],
  Administrative: [Permission.FULL_ACCESS],
};
