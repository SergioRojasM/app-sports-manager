-- ============================================================
-- Migration: tenant_metodos_pago.qr_url
-- US-0128: optional QR image for a tenant payment method
-- ============================================================

alter table public.tenant_metodos_pago
  add column if not exists qr_url text;

comment on column public.tenant_metodos_pago.qr_url is
  'Signed URL of the optional QR image (org-assets/orgs/{tenant_id}/metodos-pago/{id}/qr-{ts}.{ext}). US-0128';
