-- InvoiceGenie — initial schema
-- Tables: businesses, invoices
-- RLS: each authenticated user sees only their own rows.

create extension if not exists "pgcrypto";

-- ---------- businesses ----------
create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name_ar     text not null,
  name_en     text,
  vat_number  text not null,                 -- 15-digit KSA VAT
  address_ar  text,
  logo_url    text,
  created_at  timestamptz not null default now()
);

create index if not exists businesses_owner_idx on public.businesses (owner_id);

-- ---------- invoices ----------
create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  owner_id       uuid not null references auth.users(id) on delete cascade,
  invoice_number text not null,
  uuid           text not null,              -- ZATCA UUID
  customer_name  text not null,
  customer_vat   text,
  issue_date     timestamptz not null default now(),
  subtotal       numeric(14,2) not null,
  vat_amount     numeric(14,2) not null,
  total          numeric(14,2) not null,
  line_items     jsonb not null,             -- [{description, qty, unit_price, vat_rate}]
  qr_base64      text not null,              -- TLV Base64 payload
  source         text check (source in ('text','voice')),
  created_at     timestamptz not null default now(),
  unique (business_id, invoice_number)
);

create index if not exists invoices_owner_idx on public.invoices (owner_id);
create index if not exists invoices_business_idx on public.invoices (business_id);

-- ---------- RLS ----------
alter table public.businesses enable row level security;
alter table public.invoices   enable row level security;

drop policy if exists "own businesses" on public.businesses;
create policy "own businesses"
  on public.businesses
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "own invoices" on public.invoices;
create policy "own invoices"
  on public.invoices
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
