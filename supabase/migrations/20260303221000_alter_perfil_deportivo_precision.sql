-- ─────────────────────────────────────────────────────────────────────────────
-- Increase precision of peso_kg and altura_cm in perfil_deportivo (US0018)
-- From numeric(3,2)/numeric(3,1) to numeric(5,2) for both columns
-- to support realistic values (e.g. 120.50 kg, 195.00 cm).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.perfil_deportivo
  alter column peso_kg   type numeric(5,2),
  alter column altura_cm type numeric(5,2);
