-- =============================================
-- Migration: Add requiere_perfil_completo to tenants
-- US-0047: Tenant-level complete-profile requirement for access requests
-- =============================================

alter table public.tenants
  add column if not exists requiere_perfil_completo boolean not null default false;
