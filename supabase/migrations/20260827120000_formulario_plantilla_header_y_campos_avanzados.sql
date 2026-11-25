-- =============================================
-- Migration: Form template header pieces + advanced field/section types
-- US-0108: Visual header, checkbox/seleccion fields, two-column layout,
--          seccion cards, separador dividers
-- =============================================

-- 1. Expand seccion_tipo: header pieces + section card + divider.
--    'encabezado_sobretitulo' (22 chars) no longer fits the original varchar(20) — widen first.
alter table public.formulario_plantilla_esquema
  alter column seccion_tipo type varchar(30);

alter table public.formulario_plantilla_esquema
  drop constraint if exists formulario_plantilla_esquema_seccion_tipo_ck;
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_seccion_tipo_ck
    check (seccion_tipo in (
      'titulo', 'subtitulo', 'texto', 'datos',
      'encabezado_sobretitulo', 'encabezado_titulo', 'encabezado_subtitulo', 'encabezado_badges',
      'seccion', 'separador'
    ));

-- 2. Expand campo_tipo: checkbox (boolean) + seleccion (single choice)
alter table public.formulario_plantilla_esquema
  drop constraint if exists formulario_plantilla_esquema_campo_tipo_ck;
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_campo_tipo_ck
    check (campo_tipo in ('fecha', 'texto_corto', 'texto_largo', 'numerico', 'imagen', 'lista', 'checkbox', 'seleccion'));

-- 3. campo_lista_valores is now required for BOTH 'lista' and 'seleccion' campo_tipo
alter table public.formulario_plantilla_esquema
  drop constraint if exists formulario_plantilla_esquema_lista_valores_ck;
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_lista_valores_ck
    check (
      (campo_tipo in ('lista', 'seleccion') and campo_lista_valores is not null and length(trim(campo_lista_valores)) > 0)
      or (campo_tipo is null or campo_tipo not in ('lista', 'seleccion'))
    );

-- 4. New column: two-column layout toggle (datos rows only)
alter table public.formulario_plantilla_esquema
  add column if not exists columna_ancho varchar(10) not null default 'completo';

alter table public.formulario_plantilla_esquema
  drop constraint if exists formulario_plantilla_esquema_columna_ancho_ck;
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_columna_ancho_ck
    check (
      columna_ancho in ('completo', 'mitad')
      and (columna_ancho = 'completo' or seccion_tipo = 'datos')
    );

-- 5. New column: optional subtitle for 'seccion' cards (Section Head's subtítulo)
alter table public.formulario_plantilla_esquema
  add column if not exists seccion_subtitulo text;

-- 6. seccion_descripcion is required text content for every "text-bearing" seccion_tipo,
--    including the new header pieces and 'seccion' (used as its card título);
--    'datos', 'separador' and 'encabezado_badges' don't use it.
alter table public.formulario_plantilla_esquema
  drop constraint if exists formulario_plantilla_esquema_seccion_descripcion_ck;
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_seccion_descripcion_ck
    check (
      (seccion_tipo in ('titulo', 'subtitulo', 'texto', 'seccion',
                         'encabezado_titulo', 'encabezado_subtitulo', 'encabezado_sobretitulo')
        and seccion_descripcion is not null and length(trim(seccion_descripcion)) > 0)
      or (seccion_tipo in ('datos', 'separador', 'encabezado_badges'))
    );

-- 7. 'datos' still requires campo_etiqueta/campo_nombre/campo_tipo; 'encabezado_badges' is the
--    one non-'datos' type allowed to use campo_lista_valores (badge list); every other
--    non-'datos' type keeps all campo_* columns null.
alter table public.formulario_plantilla_esquema
  drop constraint if exists formulario_plantilla_esquema_datos_campos_ck;
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_datos_campos_ck
    check (
      (seccion_tipo = 'datos'
        and campo_etiqueta is not null and campo_nombre is not null and campo_tipo is not null)
      or (seccion_tipo = 'encabezado_badges'
        and campo_etiqueta is null and campo_nombre is null and campo_tipo is null)
      or (seccion_tipo not in ('datos', 'encabezado_badges')
        and campo_etiqueta is null and campo_nombre is null and campo_tipo is null and campo_lista_valores is null)
    );

-- 8. Badges: reuse campo_lista_valores as a comma-separated badge label list, max 5 items.
--    A template's badge row may start (and stay) empty (null) — badges are optional.
alter table public.formulario_plantilla_esquema
  drop constraint if exists formulario_plantilla_esquema_badges_ck;
alter table public.formulario_plantilla_esquema
  add constraint formulario_plantilla_esquema_badges_ck
    check (
      seccion_tipo <> 'encabezado_badges'
      or campo_lista_valores is null
      or (
        length(trim(campo_lista_valores)) > 0
        and array_length(string_to_array(campo_lista_valores, ','), 1) <= 5
      )
    );
