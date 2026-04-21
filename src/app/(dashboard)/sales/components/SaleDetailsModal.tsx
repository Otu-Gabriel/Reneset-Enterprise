"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Printer, X } from "lucide-react";

interface Sale {
  id: string;
  saleNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  totalAmount: number;
  saleDate: string;
  status: string;
  paymentMethod?: string;
  notes?: string;
  items: Array<{
    product: {
      name: string;
      sku: string;
    };
    quantity: number;
    saleUnit?: string;
    baseQuantity?: number;
    price: number;
    discount: number;
    subtotal: number;
  }>;
  user?: {
    name: string;
    email: string;
  };
}

interface SaleDetailsModalProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleDetailsModal({
  sale,
  open,
  onOpenChange,
}: SaleDetailsModalProps) {
  const formatCurrency = useCurrency();
  const { settings } = useSystemSettings();
  
  if (!sale) return null;

  const companyName = settings?.companyName || "GabyGod Technologies";
  const businessAddress = settings?.businessAddress || "Suhum, Eastern Region";
  const businessPhone = settings?.businessPhone || "0546880541 / 0550127317";

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${sale.saleNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .info {
              margin-bottom: 20px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              padding: 8px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            th {
              background-color: #f2f2f2;
            }
            .total {
              text-align: right;
              font-size: 18px;
              font-weight: bold;
              margin-top: 20px;
              padding-top: 10px;
              border-top: 2px solid #000;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${companyName}</h1>
            ${businessAddress ? `<p>${businessAddress}</p>` : ""}
            ${businessPhone ? `<p>Tel: ${businessPhone}</p>` : ""}
            <p style="margin-top: 10px; font-weight: bold;">Sales Receipt</p>
            <p>${sale.saleNumber}</p>
          </div>
          <div class="info">
            <div class="info-row">
              <strong>Date:</strong> ${formatDate(sale.saleDate)}
            </div>
            <div class="info-row">
              <strong>Customer:</strong> ${sale.customerName}
            </div>
            ${sale.customerEmail ? `<div class="info-row"><strong>Email:</strong> ${sale.customerEmail}</div>` : ""}
            ${sale.customerPhone ? `<div class="info-row"><strong>Phone:</strong> ${sale.customerPhone}</div>` : ""}
            <div class="info-row">
              <strong>Status:</strong> ${sale.status}
            </div>
            ${sale.paymentMethod ? `<div class="info-row"><strong>Payment Method:</strong> ${sale.paymentMethod.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</div>` : ""}
            ${sale.notes ? `<div class="info-row"><strong>Notes:</strong> ${sale.notes}</div>` : ""}
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Base Qty</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items
                .map(
                  (item) => `
                <tr>
                  <td>${item.product.name} (${item.product.sku})</td>
                  <td>${item.quantity} ${item.saleUnit || "item"}</td>
                  <td>${item.baseQuantity || item.quantity} item(s)</td>
                  <td>${formatCurrency(item.price)}</td>
                  <td>${formatCurrency(item.discount || 0)}</td>
                  <td>${formatCurrency(item.subtotal)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div class="total">
            Total: ${formatCurrency(sale.totalAmount)}
          </div>
          <div class="footer">
            <p>Thank you for your business!</p>
            ${sale.user ? `<p>Processed by: ${sale.user.name}</p>` : ""}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sale Details - {sale.saleNumber}</DialogTitle>
          <DialogDescription>Complete information about this sale</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="border-b pb-4 text-center">
            <h2 className="text-2xl font-bold">{companyName}</h2>
            {businessAddress && (
              <p className="text-sm text-muted-foreground">{businessAddress}</p>
            )}
            {businessPhone && (
              <p className="text-sm text-muted-foreground">Tel: {businessPhone}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Customer Information</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Name:</strong> {sale.customerName}</p>
                {sale.customerEmail && (
                  <p><strong>Email:</strong> {sale.customerEmail}</p>
                )}
                {sale.customerPhone && (
                  <p><strong>Phone:</strong> {sale.customerPhone}</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Sale Information</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Date:</strong> {formatDate(sale.saleDate)}</p>
                <p><strong>Status:</strong> 
                  <span
                    className={`ml-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      sale.status === "completed"
                        ? "bg-green-500/20 text-green-500"
                        : sale.status === "cancelled" || sale.status === "returned"
                        ? "bg-red-500/20 text-red-500"
                        : "bg-yellow-500/20 text-yellow-500"
                    }`}
                  >
                    {sale.status}
                  </span>
                </p>
                {sale.paymentMethod && (
                  <p><strong>Payment Method:</strong> {sale.paymentMethod.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
                )}
                {sale.user && (
                  <p><strong>Processed by:</strong> {sale.user.name}</p>
                )}
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Items</h3>
            <div className="border rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Product</th>
                    <th className="text-left p-3">SKU</th>
                    <th className="text-right p-3">Quantity</th>
                    <th className="text-right p-3">Base Qty</th>
                    <th className="text-right p-3">Price</th>
                    <th className="text-right p-3">Discount</th>
                    <th className="text-right p-3">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-3">{item.product.name}</td>
                      <td className="p-3 text-muted-foreground">{item.product.sku}</td>
                      <td className="p-3 text-right">
                        {item.quantity} {item.saleUnit || "item"}
                      </td>
                      <td className="p-3 text-right">
                        {item.baseQuantity || item.quantity} item(s)
                      </td>
                      <td className="p-3 text-right">{formatCurrency(item.price)}</td>
                      <td className="p-3 text-right text-red-600">
                        {formatCurrency(item.discount || 0)}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted">
                    <td colSpan={6} className="p-3 text-right font-semibold">
                      Total:
                    </td>
                    <td className="p-3 text-right font-bold text-lg">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              <p>Thank you for your business!</p>
              {sale.user && <p className="mt-1">Processed by: {sale.user.name}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

