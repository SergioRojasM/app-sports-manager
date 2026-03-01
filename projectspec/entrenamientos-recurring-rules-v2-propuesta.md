# Propuesta v2 – Reglas de recurrencia de entrenamientos

## Validación del esquema actual
La tabla actual `entrenamientos_grupo_reglas` tiene esta estructura base:
- `dia_semana` (un solo día)
- `todo_el_dia`
- `hora_inicio` / `hora_fin`

Con esta estructura **no se soporta de forma nativa**:
1. Selección múltiple de días en una sola regla.
2. Repetición cada X semanas.
3. Bloques por tipo (`una_vez_dia`, `franja_repeticion`, `horas_especificas`).
4. Validaciones por tipo de bloque y orden explícito de bloques.

## Modelo propuesto (solo tabla de reglas)
Extender `public.entrenamientos_grupo_reglas` con:
- `dias_semana smallint[] not null`
- `repetir_cada_semanas integer not null default 1`
- `tipo_bloque varchar(40) not null` (`una_vez_dia|franja_repeticion|horas_especificas`)
- `minutos_repeticion integer` (solo para `franja_repeticion`)
- `horas_especificas time[]` (solo para `horas_especificas`)
- `orden integer not null default 0`

## Semántica de bloques
- `una_vez_dia`: usa `hora_inicio`.
- `franja_repeticion`: usa `hora_inicio`, `hora_fin`, `minutos_repeticion`.
- `horas_especificas`: usa `horas_especificas` (array de horas).

## Reglas de validación recomendadas (DB)
1. `repetir_cada_semanas >= 1`
2. `dias_semana` no vacío y con valores entre 0..6.
3. `tipo_bloque` en catálogo permitido.
4. Restricciones condicionales por tipo de bloque (campos obligatorios/prohibidos).

## Alcance de esta propuesta
- Se modifica únicamente la tabla de reglas.
- No se requiere cambiar tablas de grupo ni entrenamientos.
- La generación de instancias debe adaptarse en service para leer el modelo v2.

## SQL de referencia
Ver `supabase/snippets/propuesta_entrenamientos_grupo_reglas_v2.sql`.

## Siguiente paso recomendado
Implementar adaptación en:
- `src/types/portal/entrenamientos.types.ts`
- `src/components/portal/entrenamientos/EntrenamientoWizard.tsx`
- `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts`
- `src/services/supabase/portal/entrenamientos.service.ts` (expansión de ocurrencias por tipo de bloque)
