-- ============================================
-- US-0034: Training Booking Restrictions
-- ============================================

-- 1. Add timing columns to entrenamientos
ALTER TABLE public.entrenamientos
  ADD COLUMN reserva_antelacion_horas integer,
  ADD COLUMN cancelacion_antelacion_horas integer;

ALTER TABLE public.entrenamientos
  ADD CONSTRAINT entrenamientos_reserva_antelacion_ck
    CHECK (reserva_antelacion_horas IS NULL OR reserva_antelacion_horas >= 0),
  ADD CONSTRAINT entrenamientos_cancelacion_antelacion_ck
    CHECK (cancelacion_antelacion_horas IS NULL OR cancelacion_antelacion_horas >= 0);

-- 2. Add composite unique on entrenamientos(tenant_id, id) for FK target
ALTER TABLE public.entrenamientos
  ADD CONSTRAINT entrenamientos_tenant_id_id_uk UNIQUE (tenant_id, id);

-- 3. Add timing columns to entrenamientos_grupo
ALTER TABLE public.entrenamientos_grupo
  ADD COLUMN reserva_antelacion_horas integer,
  ADD COLUMN cancelacion_antelacion_horas integer;

ALTER TABLE public.entrenamientos_grupo
  ADD CONSTRAINT entrenamientos_grupo_reserva_antelacion_ck
    CHECK (reserva_antelacion_horas IS NULL OR reserva_antelacion_horas >= 0),
  ADD CONSTRAINT entrenamientos_grupo_cancelacion_antelacion_ck
    CHECK (cancelacion_antelacion_horas IS NULL OR cancelacion_antelacion_horas >= 0);

-- ============================================
-- 4. entrenamiento_restricciones
-- ============================================
CREATE TABLE public.entrenamiento_restricciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  entrenamiento_id uuid NOT NULL,
  usuario_estado varchar(30),
  plan_id uuid,
  disciplina_id uuid,
  validar_nivel_disciplina boolean NOT NULL DEFAULT false,
  orden integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT ent_restricciones_tenant_entrenamiento_fk
    FOREIGN KEY (tenant_id, entrenamiento_id)
    REFERENCES public.entrenamientos(tenant_id, id)
    ON DELETE CASCADE,

  CONSTRAINT ent_restricciones_plan_fk
    FOREIGN KEY (plan_id)
    REFERENCES public.planes(id)
    ON DELETE SET NULL,

  CONSTRAINT ent_restricciones_disciplina_fk
    FOREIGN KEY (disciplina_id)
    REFERENCES public.disciplinas(id)
    ON DELETE SET NULL,

  CONSTRAINT ent_restricciones_usuario_estado_ck
    CHECK (usuario_estado IS NULL OR usuario_estado = 'activo'),

  CONSTRAINT ent_restricciones_orden_ck
    CHECK (orden > 0)
);

CREATE INDEX idx_ent_restricciones_entrenamiento
  ON public.entrenamiento_restricciones (entrenamiento_id);

CREATE INDEX idx_ent_restricciones_tenant
  ON public.entrenamiento_restricciones (tenant_id);

-- ============================================
-- 5. entrenamiento_grupo_restricciones
-- ============================================
CREATE TABLE public.entrenamiento_grupo_restricciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  entrenamiento_grupo_id uuid NOT NULL,
  usuario_estado varchar(30),
  plan_id uuid,
  disciplina_id uuid,
  validar_nivel_disciplina boolean NOT NULL DEFAULT false,
  orden integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT eg_restricciones_tenant_grupo_fk
    FOREIGN KEY (tenant_id, entrenamiento_grupo_id)
    REFERENCES public.entrenamientos_grupo(tenant_id, id)
    ON DELETE CASCADE,

  CONSTRAINT eg_restricciones_plan_fk
    FOREIGN KEY (plan_id)
    REFERENCES public.planes(id)
    ON DELETE SET NULL,

  CONSTRAINT eg_restricciones_disciplina_fk
    FOREIGN KEY (disciplina_id)
    REFERENCES public.disciplinas(id)
    ON DELETE SET NULL,

  CONSTRAINT eg_restricciones_usuario_estado_ck
    CHECK (usuario_estado IS NULL OR usuario_estado = 'activo'),

  CONSTRAINT eg_restricciones_orden_ck
    CHECK (orden > 0)
);

CREATE INDEX idx_eg_restricciones_grupo
  ON public.entrenamiento_grupo_restricciones (entrenamiento_grupo_id);

-- ============================================
-- 6. RLS for entrenamiento_restricciones
-- ============================================
ALTER TABLE public.entrenamiento_restricciones ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated member of the tenant
CREATE POLICY ent_restricciones_select_authenticated
  ON public.entrenamiento_restricciones
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.miembros_tenant mt
      WHERE mt.tenant_id = entrenamiento_restricciones.tenant_id
        AND mt.usuario_id = auth.uid()
    )
  );

-- INSERT: admin only
CREATE POLICY ent_restricciones_insert_admin
  ON public.entrenamiento_restricciones
  FOR INSERT TO authenticated
  WITH CHECK (
    entrenamiento_restricciones.tenant_id IN (
      SELECT t.id FROM public.get_admin_tenants_for_authenticated_user() t
    )
  );

-- UPDATE: admin only
CREATE POLICY ent_restricciones_update_admin
  ON public.entrenamiento_restricciones
  FOR UPDATE TO authenticated
  USING (
    entrenamiento_restricciones.tenant_id IN (
      SELECT t.id FROM public.get_admin_tenants_for_authenticated_user() t
    )
  )
  WITH CHECK (
    entrenamiento_restricciones.tenant_id IN (
      SELECT t.id FROM public.get_admin_tenants_for_authenticated_user() t
    )
  );

-- DELETE: admin only
CREATE POLICY ent_restricciones_delete_admin
  ON public.entrenamiento_restricciones
  FOR DELETE TO authenticated
  USING (
    entrenamiento_restricciones.tenant_id IN (
      SELECT t.id FROM public.get_admin_tenants_for_authenticated_user() t
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrenamiento_restricciones TO authenticated;

-- ============================================
-- 7. RLS for entrenamiento_grupo_restricciones
-- ============================================
ALTER TABLE public.entrenamiento_grupo_restricciones ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated member of the tenant
CREATE POLICY eg_restricciones_select_authenticated
  ON public.entrenamiento_grupo_restricciones
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.miembros_tenant mt
      WHERE mt.tenant_id = entrenamiento_grupo_restricciones.tenant_id
        AND mt.usuario_id = auth.uid()
    )
  );

-- INSERT: admin only
CREATE POLICY eg_restricciones_insert_admin
  ON public.entrenamiento_grupo_restricciones
  FOR INSERT TO authenticated
  WITH CHECK (
    entrenamiento_grupo_restricciones.tenant_id IN (
      SELECT t.id FROM public.get_admin_tenants_for_authenticated_user() t
    )
  );

-- UPDATE: admin only
CREATE POLICY eg_restricciones_update_admin
  ON public.entrenamiento_grupo_restricciones
  FOR UPDATE TO authenticated
  USING (
    entrenamiento_grupo_restricciones.tenant_id IN (
      SELECT t.id FROM public.get_admin_tenants_for_authenticated_user() t
    )
  )
  WITH CHECK (
    entrenamiento_grupo_restricciones.tenant_id IN (
      SELECT t.id FROM public.get_admin_tenants_for_authenticated_user() t
    )
  );

-- DELETE: admin only
CREATE POLICY eg_restricciones_delete_admin
  ON public.entrenamiento_grupo_restricciones
  FOR DELETE TO authenticated
  USING (
    entrenamiento_grupo_restricciones.tenant_id IN (
      SELECT t.id FROM public.get_admin_tenants_for_authenticated_user() t
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrenamiento_grupo_restricciones TO authenticated;
