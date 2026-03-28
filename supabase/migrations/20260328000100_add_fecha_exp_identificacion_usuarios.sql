-- =============================================
-- Migration: Add fecha_exp_identificacion to usuarios
-- US-0045: Add ID issue date and birth date fields
-- =============================================

alter table public.usuarios
  add column if not exists fecha_exp_identificacion date;
