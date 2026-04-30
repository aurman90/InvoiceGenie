-- 0002_invoice_studio.sql
-- Add JSONB columns for advanced flexible invoice settings.

alter table public.businesses
  add column if not exists invoice_settings jsonb default '{}'::jsonb not null,
  add column if not exists stamp_url text;

alter table public.invoices
  add column if not exists override_settings jsonb default '{}'::jsonb not null;
