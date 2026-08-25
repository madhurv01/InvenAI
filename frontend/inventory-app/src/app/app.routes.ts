import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './core/layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/components/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/components/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/components/product-list.component').then(m => m.ProductListComponent)
      },
      {
        path: 'inventory',
        loadComponent: () => import('./features/inventory/components/inventory.component').then(m => m.InventoryComponent)
      },
      {
        path: 'suppliers',
        loadComponent: () => import('./features/suppliers/components/supplier-list.component').then(m => m.SupplierListComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('./features/categories/components/category-list.component').then(m => m.CategoryListComponent)
      },
      {
        path: 'warehouses',
        loadComponent: () => import('./features/warehouses/components/warehouse-list.component').then(m => m.WarehouseListComponent)
      },
      {
        path: 'invoices',
        loadComponent: () => import('./features/invoices/components/invoice-extractor.component').then(m => m.InvoiceExtractorComponent)
      },
      {
        path: 'chat',
        loadComponent: () => import('./features/chat/components/chat-page.component').then(m => m.ChatPageComponent)
      },
      {
        path: 'package-orders',
        loadComponent: () => import('./features/package-orders/components/package-order-list.component').then(m => m.PackageOrderListComponent)
      },
      {
        path: 'package-orders/new',
        loadComponent: () => import('./features/package-orders/components/package-order-create.component').then(m => m.PackageOrderCreateComponent)
      },
      {
        path: 'package-orders/:id',
        loadComponent: () => import('./features/package-orders/components/package-order-detail.component').then(m => m.PackageOrderDetailComponent)
      },
      {
        path: 'shipments',
        loadComponent: () => import('./features/shipments/components/shipment-list.component').then(m => m.ShipmentListComponent)
      },
      {
        path: 'shipments/new',
        loadComponent: () => import('./features/shipments/components/shipment-create.component').then(m => m.ShipmentCreateComponent)
      },
      {
        path: 'shipments/:id',
        loadComponent: () => import('./features/shipments/components/shipment-detail.component').then(m => m.ShipmentDetailComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
