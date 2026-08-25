-- ============================================================
-- Shipment tracking module. Run after 01_schema.sql.
-- Route geometry comes from the free OSRM routing API and is cached
-- here as GeoJSON so the map never needs to re-fetch it.
-- ============================================================

create table if not exists shipments (
    id                      uuid primary key default gen_random_uuid(),
    order_number            varchar(40) not null unique,
    reference               varchar(200),

    origin_name             varchar(300) not null,
    origin_lat              double precision not null,
    origin_lng              double precision not null,

    destination_name        varchar(300) not null,
    destination_lat         double precision not null,
    destination_lng         double precision not null,

    route_geojson           jsonb not null default '[]'::jsonb,
    distance_km             numeric(10,2) not null default 0,
    duration_minutes        int not null default 0,

    status                  varchar(20) not null default 'InTransit'
                             check (status in ('Pending','InTransit','Delivered','Cancelled')),

    started_at              timestamptz not null default now(),
    estimated_arrival_at    timestamptz not null,
    delivered_at            timestamptz,
    cancelled_at            timestamptz,

    created_by              uuid references app_users(id) on delete set null,
    created_at              timestamptz not null default now()
);

create index if not exists idx_shipments_status on shipments (status);
create index if not exists idx_shipments_created on shipments (created_at desc);
