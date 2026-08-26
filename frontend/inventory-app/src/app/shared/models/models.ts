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
  description?: string | null;
  productCount: number;
  createdAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

export interface WarehouseManage extends Warehouse {
  isActive: boolean;
  productCount: number;
  totalUnits: number;
  createdAt: string;
}

export interface CreateWarehouseRequest {
  name: string;
  location?: string | null;
  isActive: boolean;
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

export interface WarehouseHeatmapCell {
  warehouseName: string;
  categoryName: string;
  quantityOnHand: number;
}

export interface MovementTrendPoint {
  date: string;
  stockIn: number;
  stockOut: number;
  adjustments: number;
}

export interface StockStatusBreakdown {
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

export interface DashboardAnalytics {
  heatmap: WarehouseHeatmapCell[];
  movementTrend: MovementTrendPoint[];
  stockStatus: StockStatusBreakdown;
  topValueCategories: CategoryBreakdown[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface ChatResponse {
  conversationId: string;
  answer: string;
  sql?: string;
  generatedAt: string;
}

export interface ChatConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface ChatConversationDetail {
  id: string;
  title: string;
  messages: { role: 'user' | 'assistant'; content: string; createdAt: string }[];
}

export type ShipmentStatus = 'Pending' | 'InTransit' | 'Delivered' | 'Cancelled';

export interface ShipmentSummary {
  id: string;
  orderNumber: string;
  reference?: string;
  packageOrderNumber?: string;
  originName: string;
  destinationName: string;
  status: ShipmentStatus;
  distanceKm: number;
  progressPercent: number;
  startedAt: string;
  estimatedArrivalAt: string;
  createdAt: string;
}

export interface ShipmentDetail {
  id: string;
  orderNumber: string;
  reference?: string;
  packageOrderId?: string;
  packageOrderNumber?: string;
  originName: string;
  originLat: number;
  originLng: number;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  route: number[][]; // [ [lat, lng], ... ]
  distanceKm: number;
  durationMinutes: number;
  status: ShipmentStatus;
  progressPercent: number;
  startedAt: string;
  estimatedArrivalAt: string;
  deliveredAt?: string;
  cancelledAt?: string;
  createdAt: string;
}

export interface CreateShipmentRequest {
  reference?: string;
  packageOrderId?: string;
  originName: string;
  originLat: number;
  originLng: number;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
}

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
}

export type PackageOrderStatus = 'Pending' | 'Shipped' | 'Cancelled';
export type PackageOrderPriority = 'Low' | 'Normal' | 'High';

export interface PackageOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  customizationNote?: string;
}

export interface PackageOrderSummary {
  id: string;
  orderNumber: string;
  warehouseName: string;
  status: PackageOrderStatus;
  priority: PackageOrderPriority;
  itemCount: number;
  totalQuantity: number;
  expectedShipDate?: string;
  shipmentOrderNumber?: string;
  createdAt: string;
}

export interface PackageOrderPending {
  id: string;
  orderNumber: string;
  warehouseId: string;
  warehouseName: string;
  warehouseLocation?: string;
  itemCount: number;
  totalQuantity: number;
  priority: PackageOrderPriority;
}

export interface PackageOrderDetail {
  id: string;
  orderNumber: string;
  warehouseId: string;
  warehouseName: string;
  warehouseLocation?: string;
  status: PackageOrderStatus;
  priority: PackageOrderPriority;
  notes?: string;
  expectedShipDate?: string;
  items: PackageOrderItem[];
  shipmentId?: string;
  shipmentOrderNumber?: string;
  shippedAt?: string;
  cancelledAt?: string;
  createdAt: string;
}

export interface CreatePackageOrderItemRequest {
  productId: string;
  quantity: number;
  customizationNote?: string;
}

export interface CreatePackageOrderRequest {
  warehouseId: string;
  priority: PackageOrderPriority;
  notes?: string;
  expectedShipDate?: string;
  items: CreatePackageOrderItemRequest[];
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

export interface ExtractedLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ExtractedInvoice {
  vendorName: string;
  vendorAddress?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  lineItems: ExtractedLineItem[];
  extractionNotes?: string | null;
}

export interface SaveInvoiceRequest extends ExtractedInvoice {
  sourceImageName?: string | null;
}

export interface InvoiceSummary {
  id: string;
  vendorName: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  currency: string;
  totalAmount: number;
  pdfFileName: string;
  createdAt: string;
}

export interface ApiError {
  message: string;
  detail?: string;
  statusCode: number;
}

// ---------- Automate Workflow ----------
export type WorkflowType = 'Alert' | 'Trigger' | 'SupplyChain';
export type WorkflowStatus = 'Active' | 'Paused' | 'Completed' | 'Failed';

export interface WorkflowSummary {
  id: string;
  type: WorkflowType;
  name: string;
  status: WorkflowStatus;
  summary: string;
  createdAt: string;
  lastRunAt?: string;
  lastTriggeredAt?: string;
}

export interface WorkflowEventItem {
  eventType: string;
  message: string;
  createdAt: string;
}

export interface WorkflowDetail {
  id: string;
  type: WorkflowType;
  name: string;
  status: WorkflowStatus;
  config: Record<string, any>;
  events: WorkflowEventItem[];
  createdAt: string;
  lastRunAt?: string;
  lastTriggeredAt?: string;
}

export interface CreateAlertWorkflowRequest {
  name: string;
  warehouseId: string;
  productId?: string;
  thresholdQuantity: number;
  recipientEmail: string;
}

export interface CreateTriggerWorkflowRequest {
  name: string;
  packageOrderId: string;
  scheduledAt: string;
  originName: string;
  originLat: number;
  originLng: number;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  recipientEmail: string;
}

export interface CreateSupplyChainWorkflowRequest {
  name: string;
  productId: string;
  warehouseId: string;
  thresholdQuantity: number;
  recipientEmail: string;
}
