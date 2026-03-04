-- Add validado_por column to suscripciones (mirrors pagos.validado_por pattern)
ALTER TABLE public.suscripciones
  ADD COLUMN IF NOT EXISTS validado_por uuid;

ALTER TABLE public.suscripciones
  ADD CONSTRAINT suscripciones_validado_por_fkey
  FOREIGN KEY (validado_por) REFERENCES public.usuarios(id) ON DELETE SET NULL;
