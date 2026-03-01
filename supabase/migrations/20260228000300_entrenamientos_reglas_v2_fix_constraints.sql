begin;

alter table public.entrenamientos_grupo_reglas
  drop constraint if exists entrenamientos_grupo_reglas_horas_ck;

alter table public.entrenamientos_grupo_reglas
  drop constraint if exists entrenamientos_grupo_reglas_dia_semana_ck;

alter table public.entrenamientos_grupo_reglas
  add constraint entrenamientos_grupo_reglas_dias_semana_no_vacio_ck
    check (coalesce(array_length(dias_semana, 1), 0) > 0);

commit;
