-- Replace comprobante_url with comprobante_path in pagos table.
-- comprobante_path stores the relative storage path; signed URLs are generated on-demand.
ALTER TABLE public.pagos DROP COLUMN IF EXISTS comprobante_url;
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS comprobante_path text;
