import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ChatWidgetComponent } from '../../features/chat/components/chat-widget.component';

interface SidebarTheme {
  id: string;
  name: string;
  swatch: string;
}

const THEMES: SidebarTheme[] = [
  { id: 'midnight', name: 'Midnight Indigo', swatch: 'linear-gradient(135deg, #0f172a, #4338ca)' },
  { id: 'emerald', name: 'Emerald', swatch: 'linear-gradient(135deg, #022c22, #10b981)' },
  { id: 'rosegold', name: 'Rose Gold', swatch: 'linear-gradient(135deg, #3b0f24, #f472b6)' },
  { id: 'royalslate', name: 'Royal Slate', swatch: 'linear-gradient(135deg, #0b1220, #38bdf8)' }
];

const THEME_STORAGE_KEY = 'invenai-sidebar-theme';
const COLLAPSE_STORAGE_KEY = 'invenai-sidebar-collapsed';
const WIDTH_STORAGE_KEY = 'invenai-sidebar-width';
const MIN_WIDTH = 220;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 260;

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ChatWidgetComponent],
  template: `
    <div class="shell" [class.no-select]="resizing()">
      <main class="content" [class.content-collapsed]="collapsed()">
        <router-outlet></router-outlet>
      </main>

      <aside class="sidebar" [class.collapsed]="collapsed()" [class.resizing]="resizing()" [style.width.px]="collapsed() ? null : width()">
        <div class="resize-handle"
             [class.hidden]="collapsed()"
             [class.active]="resizing()"
             (mousedown)="startResize($event)"
             title="Drag to resize"></div>

        <button class="collapse-toggle" (click)="toggleCollapsed()" [title]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
          <span [class.flipped]="collapsed()">❯</span>
        </button>

        <div class="brand">
          <span class="brand-icon">📦</span>
          @if (!collapsed()) { <span class="brand-text">InvenAI</span> }
        </div>

        <nav class="stagger">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-link" [title]="collapsed() ? 'Dashboard' : ''">
            <span class="nav-icon">📊</span> @if (!collapsed()) { <span>Dashboard</span> }
          </a>
          <a routerLink="/products" routerLinkActive="active" class="nav-link" [title]="collapsed() ? 'Products' : ''">
            <span class="nav-icon">🏷️</span> @if (!collapsed()) { <span>Products</span> }
          </a>
          <a routerLink="/inventory" routerLinkActive="active" class="nav-link" [title]="collapsed() ? 'Inventory' : ''">
            <span class="nav-icon">📥</span> @if (!collapsed()) { <span>Inventory</span> }
          </a>
          <a routerLink="/suppliers" routerLinkActive="active" class="nav-link" [title]="collapsed() ? 'Suppliers' : ''">
            <span class="nav-icon">🚚</span> @if (!collapsed()) { <span>Suppliers</span> }
          </a>
          <a routerLink="/categories" routerLinkActive="active" class="nav-link" [title]="collapsed() ? 'Categories' : ''">
            <span class="nav-icon">🗂️</span> @if (!collapsed()) { <span>Categories</span> }
          </a>
          <a routerLink="/warehouses" routerLinkActive="active" class="nav-link" [title]="collapsed() ? 'Warehouses' : ''">
            <span class="nav-icon">🏭</span> @if (!collapsed()) { <span>Warehouses</span> }
          </a>
          <a routerLink="/invoices" routerLinkActive="active" class="nav-link" [title]="collapsed() ? 'Invoice Extractor' : ''">
            <span class="nav-icon">🧾</span> @if (!collapsed()) { <span>Invoice Extractor</span> }
          </a>
          <a routerLink="/package-orders" routerLinkActive="active" class="nav-link" [title]="collapsed() ? 'Package Orders' : ''">
            <span class="nav-icon">📦</span> @if (!collapsed()) { <span>Package Orders</span> }
          </a>
          <a routerLink="/shipments" routerLinkActive="active" class="nav-link" [title]="collapsed() ? 'Shipments' : ''">
            <span class="nav-icon">🚢</span> @if (!collapsed()) { <span>Shipments</span> }
          </a>
          <a routerLink="/chat" routerLinkActive="active" class="nav-link" [title]="collapsed() ? 'InvenChat' : ''">
            <span class="nav-icon">💬</span> @if (!collapsed()) { <span>InvenChat</span> }
          </a>
          <a routerLink="/workflows" routerLinkActive="active" class="nav-link" [title]="collapsed() ? 'Automate Workflow' : ''">
            <span class="nav-icon">⚡</span> @if (!collapsed()) { <span>Automate Workflow</span> }
          </a>
        </nav>

        @if (!collapsed()) {
          <div class="theme-picker">
            <div class="theme-picker-label">Sidebar theme</div>
            <div class="theme-swatches">
              @for (theme of themes; track theme.id) {
                <button
                  class="theme-swatch"
                  [class.active]="activeTheme() === theme.id"
                  [style.background]="theme.swatch"
                  [title]="theme.name"
                  (click)="setTheme(theme.id)">
                  @if (activeTheme() === theme.id) { <span class="check">✓</span> }
                </button>
              }
            </div>
          </div>
        }

        <div class="sidebar-footer">
          <div class="user-chip">
            <div class="avatar">{{ initials() }}</div>
            @if (!collapsed()) {
              <div class="user-info">
                <div class="user-name">{{ auth.currentUser()?.fullName }}</div>
                <div class="user-role">{{ auth.currentUser()?.role }}</div>
              </div>
            }
          </div>
          <button class="btn btn-secondary btn-sm logout-btn" (click)="logout()">
            @if (collapsed()) { ⏻ } @else { Log out }
          </button>
        </div>
      </aside>

      <app-chat-widget></app-chat-widget>
    </div>
  `,
  styles: [`
    .shell { display: flex; min-height: 100vh; }
    .shell.no-select { user-select: none; cursor: ew-resize; }

    .sidebar {
      width: 260px;
      background: linear-gradient(165deg, var(--sb-grad-1), var(--sb-grad-2));
      color: var(--sb-text);
      display: flex;
      flex-direction: column;
      padding: 20px 14px;
      position: sticky;
      top: 0;
      height: 100vh;
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.18);
      z-index: 10;
      flex-shrink: 0;
    }
    .sidebar:not(.resizing) { transition: width 0.28s cubic-bezier(0.16, 1, 0.3, 1); }
    .sidebar.collapsed { width: 78px !important; padding: 20px 10px; }
    .sidebar.collapsed .resize-handle { display: none; }

    .resize-handle {
      position: absolute;
      top: 0;
      left: -4px;
      width: 8px;
      height: 100%;
      cursor: ew-resize;
      z-index: 20;
      background: transparent;
    }
    .resize-handle:hover, .resize-handle.active { background: var(--sb-accent-soft); }
    .resize-handle.hidden { display: none; }

    .collapse-toggle {
      position: absolute;
      top: 26px;
      left: -16px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #ffffff;
      color: var(--sb-grad-1);
      border: 3px solid var(--sb-accent);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 900;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.35);
      transition: transform 0.2s ease, background 0.2s ease;
      z-index: 25;
    }
    .collapse-toggle:hover { transform: scale(1.14); background: var(--sb-accent); color: #fff; }
    .collapse-toggle span { display: inline-block; transition: transform 0.28s ease; }
    .collapse-toggle span.flipped { transform: rotate(180deg); }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 19px;
      font-weight: 800;
      font-family: 'Manrope', sans-serif;
      color: #fff;
      padding: 6px 10px 22px 10px;
      white-space: nowrap;
    }
    .brand-icon {
      font-size: 22px;
      filter: drop-shadow(0 0 10px var(--sb-accent-soft));
    }

    nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 12px;
      border-radius: 10px;
      color: var(--sb-text-muted);
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
      position: relative;
    }
    .nav-icon { font-size: 16px; width: 18px; text-align: center; }
    .nav-link:hover { background: rgba(255, 255, 255, 0.08); color: #fff; transform: translateX(-2px); }
    .nav-link.active {
      background: var(--sb-accent-soft);
      color: #fff;
      box-shadow: inset 3px 0 0 var(--sb-accent);
    }

    .theme-picker { padding: 14px 10px 6px; border-top: 1px solid rgba(255,255,255,0.08); margin-top: 8px; }
    .theme-picker-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--sb-text-muted); margin-bottom: 10px; }
    .theme-swatches { display: flex; gap: 8px; }
    .theme-swatch {
      width: 26px; height: 26px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.25);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s ease, border-color 0.15s ease;
      padding: 0;
    }
    .theme-swatch:hover { transform: scale(1.14); }
    .theme-swatch.active { border-color: #fff; box-shadow: 0 0 0 2px var(--sb-accent-soft); }
    .theme-swatch .check { color: #fff; font-size: 12px; font-weight: 800; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }

    .sidebar-footer { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px; margin-top: 10px; }
    .user-chip { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .avatar {
      width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
      background: var(--sb-accent); color: #0b1220; display: flex;
      align-items: center; justify-content: center; font-weight: 800; font-size: 13px;
    }
    .user-name { font-size: 13px; font-weight: 700; color: #fff; white-space: nowrap; }
    .user-role { font-size: 12px; color: var(--sb-text-muted); }
    .logout-btn { width: 100%; }

    .content {
      flex: 1;
      padding: 28px 32px;
      max-width: 100%;
      overflow-x: hidden;
      animation: fadeIn 0.3s ease;
    }
  `]
})
export class MainLayoutComponent {
  themes = THEMES;
  collapsed = signal(localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');
  activeTheme = signal(localStorage.getItem(THEME_STORAGE_KEY) ?? 'midnight');
  width = signal(Number(localStorage.getItem(WIDTH_STORAGE_KEY)) || DEFAULT_WIDTH);
  resizing = signal(false);

  private dragStartX = 0;
  private dragStartWidth = 0;
  private onMouseMove = (e: MouseEvent) => {
    // Sidebar is on the right — dragging the handle left (negative delta) grows it.
    const delta = this.dragStartX - e.clientX;
    const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, this.dragStartWidth + delta));
    this.width.set(next);
  };
  private onMouseUp = () => {
    this.resizing.set(false);
    localStorage.setItem(WIDTH_STORAGE_KEY, String(this.width()));
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };

  constructor(public auth: AuthService, private router: Router) {
    document.documentElement.setAttribute('data-sidebar-theme', this.activeTheme());
  }

  startResize(event: MouseEvent): void {
    event.preventDefault();
    this.resizing.set(true);
    this.dragStartX = event.clientX;
    this.dragStartWidth = this.width();
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  initials(): string {
    const name = this.auth.currentUser()?.fullName ?? '';
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }

  toggleCollapsed(): void {
    this.collapsed.update(v => !v);
    localStorage.setItem(COLLAPSE_STORAGE_KEY, this.collapsed() ? '1' : '0');
  }

  setTheme(id: string): void {
    this.activeTheme.set(id);
    document.documentElement.setAttribute('data-sidebar-theme', id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
