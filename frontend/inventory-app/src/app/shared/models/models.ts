export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId?: string | null;
  categoryName?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  unitPrice: number;
  minimumStockLevel: number;
  status: 'Active' | 'Inactive' | 'Discontinued';
  totalStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  sku: string;
  categoryId?: string | null;
  supplierId?: string | null;
  unitPrice: number;
  minimumStockLevel: number;
  status: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  leadTimeDays: number;
  isActive: boolean;
  associatedProductCount: number;
}

export interface CreateSupplierRequest {
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  leadTimeDays: number;
  isActive: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string | null;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  quantityOnHand: number;
  minimumStockLevel: number;
  isLowStock: boolean;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason?: string | null;
  referenceNo?: string | null;
  performedBy?: string | null;
  createdAt: string;
}

export interface CreateStockMovementRequest {
  productId: string;
  warehouseId: string;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason?: string;
  referenceNo?: string;
  performedBy?: string;
}

export interface CategoryBreakdown {
  categoryName: string;
  productCount: number;
  inventoryValue: number;
}

export interface DashboardSummary {
  totalProducts: number;
  totalInventoryValue: number;
  lowStockCount: number;
  totalStockUnits: number;
  lowStockProducts: InventoryItem[];
  recentMovements: StockMovement[];
  categoryBreakdown: CategoryBreakdown[];
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface AiChatResponse {
  answer: string;
  intent: string;
  generatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  token: string;
  fullName: string;
  email: string;
  role: string;
  expiresAt: string;
}

export interface ApiError {
  message: string;
  detail?: string;
  statusCode: number;
}
