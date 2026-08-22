-- ============================================================
-- Invoice Extractor module — run after 01_schema.sql.
-- Stores AI-extracted invoice data plus the generated PDF bytes
-- directly in Supabase Postgres (no separate object storage needed).
-- ============================================================

create table if not exists invoices (
    id                uuid primary key default gen_random_uuid(),
    vendor_name       varchar(200) not null,
    invoice_number    varchar(100),
    invoice_date      date,
    currency          varchar(10) not null default 'INR',
    subtotal          numeric(14,2) not null default 0,
    tax_amount        numeric(14,2) not null default 0,
    total_amount      numeric(14,2) not null default 0,
    line_items        jsonb not null default '[]'::jsonb,
    raw_ai_response   jsonb,
    pdf_data          bytea not null,
    pdf_file_name     varchar(200) not null,
    source_image_name varchar(200),
    created_by        uuid references app_users(id) on delete set null,
    created_at        timestamptz not null default now()
);

create index if not exists idx_invoices_created on invoices (created_at desc);
create index if not exists idx_invoices_vendor on invoices (vendor_name);
