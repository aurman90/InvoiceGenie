-- Per-invoice notes override.
-- notes_override:
--   NULL  → inherit business.invoice_notes (default behavior, backward compatible)
--   text  → use this text instead of the business default (may be empty string)
-- hide_notes:
--   true  → render no notes block at all on this invoice (overrides notes_override)

alter table public.invoices
  add column if not exists notes_override text,
  add column if not exists hide_notes boolean not null default false;
