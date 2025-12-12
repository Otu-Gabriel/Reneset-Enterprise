import { prisma } from "@/lib/prisma";
import { AuditAction, AuditEntity } from "@prisma/client";
import { formatCurrencyWithSettings } from "@/lib/formatting";

interface AuditLogData {
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  description: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Creates an audit log entry
 * This function should be called after successful operations
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        description: data.description,
        details: data.details || {},
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  } catch (error) {
    // Don't throw errors for audit logging failures - log to console instead
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Helper to extract IP and user agent from NextRequest
 */
export function getRequestMetadata(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");

  return {
    ipAddress: forwardedFor || realIp || null,
    userAgent: userAgent || null,
  };
}

/**
 * Helper function to create audit logs for common operations
 * All methods accept optional ipAddress and userAgent parameters
 */
export const auditLogger = {
  async productCreated(
    userId: string,
    productId: string,
    productName: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.CREATE,
      entity: AuditEntity.PRODUCT,
      entityId: productId,
      description: `Created product: ${productName}`,
      details: { productId, productName },
      ...metadata,
    });
  },

  async productUpdated(
    userId: string,
    productId: string,
    productName: string,
    changes?: Record<string, any>,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.PRODUCT,
      entityId: productId,
      description: `Updated product: ${productName}`,
      details: { productId, productName, changes },
      ...metadata,
    });
  },

  async productDeleted(
    userId: string,
    productId: string,
    productName: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.DELETE,
      entity: AuditEntity.PRODUCT,
      entityId: productId,
      description: `Deleted product: ${productName}`,
      details: { productId, productName },
      ...metadata,
    });
  },

  async saleCreated(
    userId: string,
    saleId: string,
    saleNumber: string,
    totalAmount: number,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    const formattedAmount = await formatCurrencyWithSettings(totalAmount);
    await createAuditLog({
      userId,
      action: AuditAction.CREATE,
      entity: AuditEntity.SALE,
      entityId: saleId,
      description: `Created sale: ${saleNumber} (Total: ${formattedAmount})`,
      details: { saleId, saleNumber, totalAmount },
      ...metadata,
    });
  },

  async saleUpdated(
    userId: string,
    saleId: string,
    saleNumber: string,
    changes?: Record<string, any>,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.SALE,
      entityId: saleId,
      description: `Updated sale: ${saleNumber}`,
      details: { saleId, saleNumber, changes },
      ...metadata,
    });
  },

  async saleDeleted(
    userId: string,
    saleId: string,
    saleNumber: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.DELETE,
      entity: AuditEntity.SALE,
      entityId: saleId,
      description: `Deleted sale: ${saleNumber}`,
      details: { saleId, saleNumber },
      ...metadata,
    });
  },

  async employeeCreated(
    userId: string,
    employeeId: string,
    employeeName: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.CREATE,
      entity: AuditEntity.EMPLOYEE,
      entityId: employeeId,
      description: `Created employee: ${employeeName}`,
      details: { employeeId, employeeName },
      ...metadata,
    });
  },

  async employeeUpdated(
    userId: string,
    employeeId: string,
    employeeName: string,
    changes?: Record<string, any>,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.EMPLOYEE,
      entityId: employeeId,
      description: `Updated employee: ${employeeName}`,
      details: { employeeId, employeeName, changes },
      ...metadata,
    });
  },

  async employeeDeleted(
    userId: string,
    employeeId: string,
    employeeName: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.DELETE,
      entity: AuditEntity.EMPLOYEE,
      entityId: employeeId,
      description: `Deleted employee: ${employeeName}`,
      details: { employeeId, employeeName },
      ...metadata,
    });
  },

  async userCreated(
    userId: string,
    newUserId: string,
    userName: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.CREATE,
      entity: AuditEntity.USER,
      entityId: newUserId,
      description: `Created user: ${userName}`,
      details: { userId: newUserId, userName },
      ...metadata,
    });
  },

  async userUpdated(
    userId: string,
    targetUserId: string,
    userName: string,
    changes?: Record<string, any>,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.USER,
      entityId: targetUserId,
      description: `Updated user: ${userName}`,
      details: { userId: targetUserId, userName, changes },
      ...metadata,
    });
  },

  async userDeleted(
    userId: string,
    targetUserId: string,
    userName: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.DELETE,
      entity: AuditEntity.USER,
      entityId: targetUserId,
      description: `Deleted user: ${userName}`,
      details: { userId: targetUserId, userName },
      ...metadata,
    });
  },

  async categoryCreated(
    userId: string,
    categoryId: string,
    categoryName: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.CREATE,
      entity: AuditEntity.CATEGORY,
      entityId: categoryId,
      description: `Created category: ${categoryName}`,
      details: { categoryId, categoryName },
      ...metadata,
    });
  },

  async categoryUpdated(
    userId: string,
    categoryId: string,
    categoryName: string,
    changes?: Record<string, any>,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.CATEGORY,
      entityId: categoryId,
      description: `Updated category: ${categoryName}`,
      details: { categoryId, categoryName, changes },
      ...metadata,
    });
  },

  async categoryDeleted(
    userId: string,
    categoryId: string,
    categoryName: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.DELETE,
      entity: AuditEntity.CATEGORY,
      entityId: categoryId,
      description: `Deleted category: ${categoryName}`,
      details: { categoryId, categoryName },
      ...metadata,
    });
  },

  async brandCreated(
    userId: string,
    brandId: string,
    brandName: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.CREATE,
      entity: AuditEntity.BRAND,
      entityId: brandId,
      description: `Created brand: ${brandName}`,
      details: { brandId, brandName },
      ...metadata,
    });
  },

  async brandUpdated(
    userId: string,
    brandId: string,
    brandName: string,
    changes?: Record<string, any>,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.BRAND,
      entityId: brandId,
      description: `Updated brand: ${brandName}`,
      details: { brandId, brandName, changes },
      ...metadata,
    });
  },

  async brandDeleted(
    userId: string,
    brandId: string,
    brandName: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.DELETE,
      entity: AuditEntity.BRAND,
      entityId: brandId,
      description: `Deleted brand: ${brandName}`,
      details: { brandId, brandName },
      ...metadata,
    });
  },

  async profileUpdated(
    userId: string,
    changes?: Record<string, any>,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.PROFILE,
      entityId: userId,
      description: `Updated profile information`,
      details: { changes },
      ...metadata,
    });
  },

  async passwordChanged(
    userId: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.PASSWORD_CHANGE,
      entity: AuditEntity.PROFILE,
      entityId: userId,
      description: `Changed password`,
      ...metadata,
    });
  },

  async permissionChanged(
    userId: string,
    targetUserId: string,
    userName: string,
    oldPermissions: string[],
    newPermissions: string[]
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.PERMISSION_CHANGE,
      entity: AuditEntity.USER,
      entityId: targetUserId,
      description: `Changed permissions for user: ${userName}`,
      details: { targetUserId, userName, oldPermissions, newPermissions },
    });
  },

  async installmentCreated(
    userId: string,
    installmentId: string,
    saleNumber: string
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.CREATE,
      entity: AuditEntity.INSTALLMENT,
      entityId: installmentId,
      description: `Created installment plan for sale: ${saleNumber}`,
      details: { installmentId, saleNumber },
    });
  },

  async paymentRecorded(
    userId: string,
    paymentId: string,
    installmentPlanId: string,
    amount: number,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    const formattedAmount = await formatCurrencyWithSettings(amount);
    await createAuditLog({
      userId,
      action: AuditAction.CREATE,
      entity: AuditEntity.INSTALLMENT_PAYMENT,
      entityId: paymentId,
      description: `Recorded payment: ${formattedAmount}`,
      details: { paymentId, installmentPlanId, amount },
      ...metadata,
    });
  },

  async stockAdded(
    userId: string,
    productId: string,
    productName: string,
    stockDetails: {
      quantityAdded: number;
      previousStock: number;
      newStock: number;
      notes?: string | null;
    },
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.PRODUCT,
      entityId: productId,
      description: `Added ${stockDetails.quantityAdded} units to ${productName} (${stockDetails.previousStock} → ${stockDetails.newStock})`,
      details: {
        productId,
        productName,
        type: "stock_addition",
        quantityAdded: stockDetails.quantityAdded,
        previousStock: stockDetails.previousStock,
        newStock: stockDetails.newStock,
        notes: stockDetails.notes,
      },
      ...metadata,
    });
  },

  async reportExported(userId: string, reportType: string) {
    await createAuditLog({
      userId,
      action: AuditAction.EXPORT,
      entity: AuditEntity.SYSTEM,
      description: `Exported ${reportType} report`,
      details: { reportType },
    });
  },

  async login(userId: string) {
    await createAuditLog({
      userId,
      action: AuditAction.LOGIN,
      entity: AuditEntity.SYSTEM,
      description: `User logged in`,
    });
  },

  async logout(userId: string) {
    await createAuditLog({
      userId,
      action: AuditAction.LOGOUT,
      entity: AuditEntity.SYSTEM,
      description: `User logged out`,
    });
  },

  async customerCreated(
    userId: string,
    customerId: string,
    customerName: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.CREATE,
      entity: AuditEntity.CUSTOMER,
      entityId: customerId,
      description: `Created customer: ${customerName}`,
      details: { customerId, customerName },
      ...metadata,
    });
  },

  async customerUpdated(
    userId: string,
    customerId: string,
    customerName: string,
    changes?: Record<string, any>,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.CUSTOMER,
      entityId: customerId,
      description: `Updated customer: ${customerName}`,
      details: { customerId, customerName, changes },
      ...metadata,
    });
  },

  async customerDeleted(
    userId: string,
    customerId: string,
    customerName: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ) {
    await createAuditLog({
      userId,
      action: AuditAction.DELETE,
      entity: AuditEntity.CUSTOMER,
      entityId: customerId,
      description: `Deleted customer: ${customerName}`,
      details: { customerId, customerName },
      ...metadata,
    });
  },
};
