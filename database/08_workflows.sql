-- ============================================================
-- Automate Workflow module. Run after 01_schema.sql, 06_shipments.sql,
-- and 07_package_orders.sql.
--
-- One generic `workflows` table holds all three workflow types (Alert,
-- Trigger, SupplyChain) — type-specific parameters live in `config`
-- (set once at creation) and internal bookkeeping (breach state,
-- notified shipment ids, etc., used to avoid duplicate emails) lives
-- in `state` (mutated by the background execution engine).
-- ============================================================

create table if not exists workflows (
    id                uuid primary key default gen_random_uuid(),
    type              varchar(20) not null check (type in ('Alert','Trigger','SupplyChain')),
    name              varchar(150) not null,
    status            varchar(20) not null default 'Active' check (status in ('Active','Paused','Completed','Failed')),
    config            jsonb not null default '{}'::jsonb,
    state             jsonb not null default '{}'::jsonb,
    created_by        uuid references app_users(id) on delete set null,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    last_run_at       timestamptz,
    last_triggered_at timestamptz
);

create index if not exists idx_workflows_type_status on workflows (type, status);
create index if not exists idx_workflows_created on workflows (created_at desc);

create table if not exists workflow_events (
    id           uuid primary key default gen_random_uuid(),
    workflow_id  uuid not null references workflows(id) on delete cascade,
    event_type   varchar(30) not null,
    message      text not null,
    created_at   timestamptz not null default now()
);

create index if not exists idx_workflow_events_workflow on workflow_events (workflow_id, created_at desc);
