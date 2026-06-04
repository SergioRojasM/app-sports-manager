select * from cron.job;

SELECT reactivar_suspensiones_expiradas(); 

SELECT evaluar_suspensiones_cron();

SELECT public.vencer_suscripciones_expiradas();