-- ============================================================
-- Package Orders module. Run after 01_schema.sql and 06_shipments.sql.
-- A package order reserves stock at a warehouse (immediate stock-out
-- movement) for a set of products — optionally "tallied" with a
-- customization note — and can later be linked to a shipment to ship.
-- ============================================================

create table if not exists package_orders (
    id                  uuid primary key default gen_random_uuid(),
    order_number        varchar(40) not null unique,
    warehouse_id        uuid not null references warehouses(id) on delete restrict,
    status              varchar(20) not null default 'Pending' check (status in ('Pending','Shipped','Cancelled')),
    priority            varchar(10) not null default 'Normal' check (priority in ('Low','Normal','High')),
    notes               varchar(500),
    expected_ship_date  date,
    shipment_id         uuid references shipments(id) on delete set null,
    shipped_at          timestamptz,
    cancelled_at        timestamptz,
    created_by          uuid references app_users(id) on delete set null,
    created_at          timestamptz not null default now()
);

create index if not exists idx_package_orders_status on package_orders (status);
create index if not exists idx_package_orders_warehouse on package_orders (warehouse_id);

create table if not exists package_order_items (
    id                   uuid primary key default gen_random_uuid(),
    package_order_id     uuid not null references package_orders(id) on delete cascade,
    product_id           uuid not null references products(id) on delete restrict,
    quantity             int not null check (quantity > 0),
    customization_note   varchar(500)
);

create index if not exists idx_package_order_items_order on package_order_items (package_order_id);
