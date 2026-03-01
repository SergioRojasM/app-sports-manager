begin;

alter table public.entrenamientos_grupo_reglas
  add column if not exists dias_semana smallint[] not null default '{}',
  add column if not exists repetir_cada_semanas integer not null default 1,
  add column if not exists tipo_bloque varchar(40) not null default 'una_vez_dia',
  add column if not exists horas_especificas time[];

update public.entrenamientos_grupo_reglas
set dias_semana =
  case
    when dia_semana is null then dias_semana
    else array[dia_semana::smallint]
  end
where coalesce(array_length(dias_semana, 1), 0) = 0;

alter table public.entrenamientos_grupo_reglas
  add constraint entrenamientos_grupo_reglas_repetir_cada_semanas_ck
    check (repetir_cada_semanas >= 1);

alter table public.entrenamientos_grupo_reglas
  add constraint entrenamientos_grupo_reglas_tipo_bloque_v2_ck
    check (tipo_bloque in ('una_vez_dia', 'franja_repeticion', 'horas_especificas'));

alter table public.entrenamientos_grupo_reglas
  add constraint entrenamientos_grupo_reglas_dias_semana_rango_ck
    check (dias_semana <@ array[0,1,2,3,4,5,6]::smallint[]);

alter table public.entrenamientos_grupo_reglas
  add constraint entrenamientos_grupo_reglas_bloque_una_vez_dia_v2_ck
    check (
      tipo_bloque <> 'una_vez_dia'
      or (
        hora_inicio is not null
        and (horas_especificas is null or array_length(horas_especificas, 1) is null)
      )
    );

alter table public.entrenamientos_grupo_reglas
  add constraint entrenamientos_grupo_reglas_bloque_franja_v2_ck
    check (
      tipo_bloque <> 'franja_repeticion'
      or (
        hora_inicio is not null
        and hora_fin is not null
        and hora_fin > hora_inicio
        and (horas_especificas is null or array_length(horas_especificas, 1) is null)
      )
    );

alter table public.entrenamientos_grupo_reglas
  add constraint entrenamientos_grupo_reglas_bloque_horas_especificas_v2_ck
    check (
      tipo_bloque <> 'horas_especificas'
      or (
        horas_especificas is not null
        and array_length(horas_especificas, 1) > 0
      )
    );

create index if not exists idx_entrenamientos_grupo_reglas_repetir_cada_semanas
  on public.entrenamientos_grupo_reglas (repetir_cada_semanas);

create index if not exists idx_entrenamientos_grupo_reglas_tipo_bloque_v2
  on public.entrenamientos_grupo_reglas (tipo_bloque);

commit;
