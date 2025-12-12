// Shared types for the POS system

// ============ User Types ============
export type UserRole = "admin" | "manager" | "cashier";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, "password">;
  token: string;
}

// ============ Category Types ============
export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
}

// ============ Supplier Types ============
export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

// ============ Product Types ============
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  category?: Category;
  supplierId?: string;
  supplier?: Supplier;
  price: number;
  cost: number;
  stockQuantity: number;
  minStockLevel: number;
  isActive: boolean;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDto {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  supplierId?: string;
  price: number;
  cost: number;
  stockQuantity: number;
  minStockLevel: number;
  imageUrl?: string;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  isActive?: boolean;
}

// ============ Stock Movement Types ============
export type StockMovementType = "in" | "out" | "adjustment";
export type StockMovementReason =
  | "purchase"
  | "sale"
  | "return"
  | "damaged"
  | "theft"
  | "adjustment"
  | "initial";

export interface StockMovement {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  type: StockMovementType;
  reason: StockMovementReason;
  notes?: string;
  userId: string;
  user?: User;
  createdAt: Date;
}

export interface CreateStockMovementDto {
  productId: string;
  quantity: number;
  type: StockMovementType;
  reason: StockMovementReason;
  notes?: string;
}

// ============ Sale Types ============
export type PaymentMethod = "cash" | "card" | "e-wallet" | "split";
export type SaleStatus = "completed" | "refunded" | "partial-refund";

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  product?: Product;
  quantity: number;
  priceAtSale: number;
  discount: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  status: SaleStatus;
  customerId?: string;
  userId: string;
  user?: User;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  discount: number;
}

export interface CreateSaleDto {
  items: {
    productId: string;
    quantity: number;
    discount?: number;
  }[];
  paymentMethod: PaymentMethod;
  amountPaid: number;
  discount?: number;
  customerId?: string;
  notes?: string;
}

// ============ Customer Types ============
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  loyaltyPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerDto {
  name: string;
  email?: string;
  phone?: string;
}

// ============ Analytics Types ============
export interface SalesReport {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averageOrderValue: number;
  salesByPaymentMethod: {
    method: PaymentMethod;
    count: number;
    total: number;
  }[];
  salesByDate: {
    date: string;
    count: number;
    total: number;
  }[];
}

export interface InventoryReport {
  totalProducts: number;
  totalStockValue: number;
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
  topSellingProducts: {
    product: Product;
    quantitySold: number;
    revenue: number;
  }[];
}

export interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  todayTransactions: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalProducts: number;
  recentSales: Sale[];
}

// ============ API Response Types ============
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}
