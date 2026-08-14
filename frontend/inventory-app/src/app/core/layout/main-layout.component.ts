import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-icon">📦</span>
          <span>InvenAI</span>
        </div>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">
            <span>📊</span> Dashboard
          </a>
          <a routerLink="/products" routerLinkActive="active" class="nav-link">
            <span>🏷️</span> Products
          </a>
          <a routerLink="/inventory" routerLinkActive="active" class="nav-link">
            <span>📥</span> Inventory
          </a>
          <a routerLink="/suppliers" routerLinkActive="active" class="nav-link">
            <span>🚚</span> Suppliers
          </a>
        </nav>
        <div class="sidebar-footer">
          <div class="user-chip">
            <div class="avatar">{{ initials() }}</div>
            <div class="user-info">
              <div class="user-name">{{ auth.currentUser()?.fullName }}</div>
              <div class="user-role">{{ auth.currentUser()?.role }}</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" (click)="logout()">Log out</button>
        </div>
      </aside>
      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .shell { display: flex; min-height: 100vh; }
    .sidebar {
      width: 240px;
      background: #111827;
      color: #e5e7eb;
      display: flex;
      flex-direction: column;
      padding: 20px 14px;
      position: sticky;
      top: 0;
      height: 100vh;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      padding: 0 10px 20px 10px;
    }
    .brand-icon { font-size: 22px; }
    nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      color: #cbd5e1;
      font-size: 14px;
      font-weight: 500;
    }
    .nav-link:hover { background: #1f2937; color: #fff; }
    .nav-link.active { background: #4f46e5; color: #fff; }
    .sidebar-footer { border-top: 1px solid #1f2937; padding-top: 14px; }
    .user-chip { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: #4f46e5; color: #fff; display: flex;
      align-items: center; justify-content: center; font-weight: 600; font-size: 13px;
    }
    .user-name { font-size: 13px; font-weight: 600; color: #fff; }
    .user-role { font-size: 12px; color: #9ca3af; }
    .content { flex: 1; padding: 28px 32px; max-width: 100%; overflow-x: hidden; }
  `]
})
export class MainLayoutComponent {
  constructor(public auth: AuthService, private router: Router) {}

  initials(): string {
    const name = this.auth.currentUser()?.fullName ?? '';
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
