export type UserRole = "owner" | "cashier";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICategory {
  _id: string;
  name: string;
  description?: string;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type ProductUnit = "pcs" | "box" | "kg" | "liter" | "bottle" | "pack";

export interface IProduct {
  _id: string;
  name: string;
  sku: string;
  categoryId: string | { _id: string; name: string };
  categoryName?: string;
  description?: string;
  image?: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minimumStock: number;
  unit: ProductUnit;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ISupplier {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = "cash" | "qris" | "transfer";

export interface ISaleItem {
  productId: string;
  productName: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ISale {
  _id: string;
  invoiceNumber: string;
  items: ISaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  changeAmount: number;
  cashierId: string | { _id: string; name: string };
  cashierName: string;
  note?: string;
  createdAt: string;
}

export type MovementType = "SALE" | "STOCK_IN" | "ADJUSTMENT";

export interface IInventoryMovement {
  _id: string;
  productId: string | { _id: string; name: string; sku: string; unit: string };
  productName?: string;
  sku?: string;
  unit?: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId?: string;
  note?: string;
  createdBy: string | { _id: string; name: string };
  createdByName?: string;
  createdAt: string;
}

export interface POSCartItem {
  product: IProduct;
  quantity: number;
}

export interface DashboardOverview {
  todaySales: number;
  todayTransactions: number;
  productsSold: number;
  grossProfit: number;
  lowStockCount: number;
}

export interface TopSellingProduct {
  productId: string;
  name: string;
  sku: string;
  categoryName?: string;
  unit: string;
  totalSold: number;
  totalRevenue: number;
}

export interface LowStockProduct {
  _id: string;
  name: string;
  sku: string;
  stock: number;
  minimumStock: number;
  unit: string;
}

export interface SalesReportSummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  profitMarginPercent: number;
  totalTransactions: number;
  totalItemsSold: number;
}

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  dataBlock?: Record<string, any>;
}
