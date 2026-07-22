-- =============================================
-- Migration: Form Template Sections (seccion_tipo)
-- US-0085: Interactive Google-Forms-style Form Builder
-- =============================================

-- 1. New columns
alter table public.formulario_plantilla_esquema
  add column if not exists seccion_tipo varchar(20) not null default 'datos',
  add column if not exists seccion_descripcion text;

-- 2. Relax the columns that only make sense for seccion_tipo = 'datos'
alter table public.formulario_plantilla_esquema
  alter column campo_etiqueta drop not null,
  alter column campo_nombre drop not null,
  alter column campo_tipo drop not null;

-- 3. Constrain seccion_tipo to the known set
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_seccion_tipo_ck
    check (seccion_tipo in ('titulo', 'subtitulo', 'texto', 'datos'));

-- 4. Display-only sections require seccion_descripcion; 'datos' sections don't use it
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_seccion_descripcion_ck
    check (
      (seccion_tipo in ('titulo', 'subtitulo', 'texto')
        and seccion_descripcion is not null
        and length(trim(seccion_descripcion)) > 0)
      or (seccion_tipo = 'datos' and seccion_descripcion is null)
    );

-- 5. 'datos' sections require the field-definition columns; display-only sections must leave them null
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_datos_campos_ck
    check (
      (seccion_tipo = 'datos'
        and campo_etiqueta is not null
        and campo_nombre is not null
        and campo_tipo is not null)
      or (seccion_tipo <> 'datos'
        and campo_etiqueta is null
        and campo_nombre is null
        and campo_tipo is null
        and campo_lista_valores is null)
    );
