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
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
