-- 0003_add_doc_type.sql
-- Add the doc_type column to the invoices table so it can handle invoice/quotation types.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS doc_type text DEFAULT 'invoice';

-- We also need to reload the schema cache so the PostgREST API can see the new column immediately.
NOTIFY pgrst, 'reload schema';
