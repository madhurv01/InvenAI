-- ============================================================
-- AI-Powered Inventory Management — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor (or via psql) BEFORE running the API.
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Users (simple JWT auth table — app-managed, not Supabase Auth)
-- ------------------------------------------------------------
create table if not exists app_users (
    id              uuid primary key default gen_random_uuid(),
    full_name       varchar(150) not null,
    email           varchar(200) not null unique,
    password_hash   varchar(300) not null,
    role            varchar(30)  not null default 'Staff', -- Admin | Manager | Staff
    is_active       boolean not null default true,
    created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Categories
-- ------------------------------------------------------------
create table if not exists categories (
    id          uuid primary key default gen_random_uuid(),
    name        varchar(120) not null unique,
    description varchar(500),
    created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Suppliers
-- ------------------------------------------------------------
create table if not exists suppliers (
    id              uuid primary key default gen_random_uuid(),
    name            varchar(150) not null,
    contact_person  varchar(150),
    email           varchar(200),
    phone           varchar(30),
    address         varchar(300),
    lead_time_days  int not null default 7 check (lead_time_days >= 0),
    is_active       boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists idx_suppliers_name on suppliers (name);

-- ------------------------------------------------------------
-- Warehouses
-- ------------------------------------------------------------
create table if not exists warehouses (
    id          uuid primary key default gen_random_uuid(),
    name        varchar(120) not null unique,
    location    varchar(250),
    is_active   boolean not null default true,
    created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Products
-- ------------------------------------------------------------
create table if not exists products (
    id                  uuid primary key default gen_random_uuid(),
    name                varchar(200) not null,
    sku                 varchar(60)  not null unique,
    category_id         uuid references categories(id) on delete set null,
    supplier_id         uuid references suppliers(id) on delete set null,
    unit_price          numeric(12,2) not null check (unit_price >= 0),
    minimum_stock_level int not null default 0 check (minimum_stock_level >= 0),
    status              varchar(20) not null default 'Active' check (status in ('Active','Inactive','Discontinued')),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create index if not exists idx_products_sku on products (sku);
create index if not exists idx_products_category on products (category_id);
create index if not exists idx_products_supplier on products (supplier_id);
create index if not exists idx_products_status on products (status);

-- ------------------------------------------------------------
-- Product ↔ Supplier association (many-to-many, in addition to primary supplier_id)
-- ------------------------------------------------------------
create table if not exists product_suppliers (
    product_id  uuid not null references products(id) on delete cascade,
    supplier_id uuid not null references suppliers(id) on delete cascade,
    is_primary  boolean not null default false,
    primary key (product_id, supplier_id)
);

-- ------------------------------------------------------------
-- Inventory (current stock per product per warehouse)
-- ------------------------------------------------------------
create table if not exists inventory (
    id              uuid primary key default gen_random_uuid(),
    product_id      uuid not null references products(id) on delete cascade,
    warehouse_id    uuid not null references warehouses(id) on delete cascade,
    quantity_on_hand int not null default 0 check (quantity_on_hand >= 0),
    updated_at      timestamptz not null default now(),
    unique (product_id, warehouse_id)
);

create index if not exists idx_inventory_product on inventory (product_id);
create index if not exists idx_inventory_warehouse on inventory (warehouse_id);

-- ------------------------------------------------------------
-- Stock movements (full audit history: IN / OUT / ADJUSTMENT)
-- ------------------------------------------------------------
create table if not exists stock_movements (
    id              uuid primary key default gen_random_uuid(),
    product_id      uuid not null references products(id) on delete cascade,
    warehouse_id    uuid not null references warehouses(id) on delete cascade,
    movement_type   varchar(20) not null check (movement_type in ('IN','OUT','ADJUSTMENT')),
    quantity        int not null check (quantity <> 0),
    reason          varchar(300),
    reference_no    varchar(80),
    performed_by    varchar(150),
    created_at      timestamptz not null default now()
);

create index if not exists idx_movements_product on stock_movements (product_id);
create index if not exists idx_movements_warehouse on stock_movements (warehouse_id);
create index if not exists idx_movements_created on stock_movements (created_at desc);

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated before update on products
for each row execute function set_updated_at();

drop trigger if exists trg_suppliers_updated on suppliers;
create trigger trg_suppliers_updated before update on suppliers
for each row execute function set_updated_at();

drop trigger if exists trg_inventory_updated on inventory;
create trigger trg_inventory_updated before update on inventory
for each row execute function set_updated_at();
