import { Permission, Role } from "@prisma/client";

export type { Permission, Role };

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: Permission[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sale {
  id: string;
  saleNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  totalAmount: number;
  status: string;
  saleDate: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
  unitCost?: number | null;
  lineCOGS?: number | null;
  product?: Product;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  department?: string;
  salary?: number;
  hireDate: Date;
  status: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  averagePrice: number;
  revenueChange: number;
  ordersChange: number;
  averagePriceChange: number;
}

export interface SalesOverviewData {
  date: string;
  current: number;
  previous: number;
}

export interface CategorySales {
  category: string;
  value: number;
  percentage: number;
}

