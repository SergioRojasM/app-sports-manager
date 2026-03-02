begin;

alter table public.entrenamientos
  add column if not exists punto_encuentro varchar(200);

alter table public.entrenamientos_grupo
  add column if not exists punto_encuentro varchar(200);



commit;
