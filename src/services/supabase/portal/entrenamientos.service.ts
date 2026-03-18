import { createClient } from '@/services/supabase/client';
import { PUBLIC_TENANT_ID } from '@/lib/constants';
import {
  TrainingServiceError,
  type CreateTrainingSeriesInput,
  type DeleteTrainingWithScopeInput,
  type GenerateSeriesInstancesInput,
  type SelectOption,
  type TrainingGroup,
  type TrainingGroupRule,
  type TrainingGroupWithDetails,
  type TrainingInstance,
  type TrainingVisibility,
  type UpdateTrainingInstanceInput,
  type UpdateTrainingSeriesInput,
  type UpsertTrainingGroupRulesInput,
} from '@/types/portal/entrenamientos.types';
import { entrenamientoCategoriasService } from './entrenamiento-categorias.service';

type TrainingGroupRow = Omit<TrainingGroup, 'tipo' | 'estado'> & {
  tipo: string | null;
  estado: string | null;
};

type TrainingRuleRow = TrainingGroupRule;
type TrainingInstanceRow = Omit<TrainingInstance, 'origen_creacion'> & {
  origen_creacion: 'manual' | 'generado' | string;
};

/**
 * Compute the `visible_para` value based on visibility.
 * - 'publico' → PUBLIC_TENANT_ID (system-level public tenant)
 * - 'privado' → the owning tenant's own ID
 */
function resolveVisiblePara(visibilidad: TrainingVisibility, tenantId: string): string {
  return visibilidad === 'publico' ? PUBLIC_TENANT_ID : tenantId;
}

type PostgrestErrorLike = {
  code?: string;
  constraint?: string;
} | null;

function toNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function mapServiceError(error: PostgrestErrorLike): TrainingServiceError {
  if (!error) {
    return new TrainingServiceError('unknown', 'No fue posible completar la operación de entrenamientos.');
  }

  if (error.code === '23505') {
    return new TrainingServiceError('duplicate_name', 'Ya existe un entrenamiento con esos datos en esta organización.');
  }

  if (error.code === '23503') {
    return new TrainingServiceError('fk_dependency', 'No se pudo completar la operación por dependencias relacionadas.');
  }

  if (error.code === '42501') {
    return new TrainingServiceError('forbidden', 'No tienes permisos para realizar esta acción en esta organización.');
  }

  if (error.code === '23514') {
    return new TrainingServiceError('validation', 'Los datos no cumplen las reglas de validación del entrenamiento.');
  }

  return new TrainingServiceError('unknown', 'No fue posible completar la operación de entrenamientos.');
}

function mapTrainingGroup(row: TrainingGroupRow): TrainingGroup {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    tipo: row.tipo === 'unico' ? 'unico' : 'recurrente',
    nombre: row.nombre ?? 'Entrenamiento',
    descripcion: row.descripcion,
    punto_encuentro: row.punto_encuentro ?? null,
    formulario_externo: row.formulario_externo ?? null,
    disciplina_id: row.disciplina_id,
    escenario_id: row.escenario_id,
    entrenador_id: row.entrenador_id,
    duracion_minutos: row.duracion_minutos,
    cupo_maximo: row.cupo_maximo,
    timezone: row.timezone,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    estado: row.estado === 'cancelado' || row.estado === 'finalizado' ? row.estado : 'activo',
    reserva_antelacion_horas: (row as Record<string, unknown>).reserva_antelacion_horas as number | null ?? null,
    cancelacion_antelacion_horas: (row as Record<string, unknown>).cancelacion_antelacion_horas as number | null ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapTrainingInstance(row: TrainingInstanceRow): TrainingInstance {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    entrenamiento_grupo_id: row.entrenamiento_grupo_id,
    origen_creacion: row.origen_creacion === 'manual' ? 'manual' : 'generado',
    es_excepcion_serie: row.es_excepcion_serie,
    bloquear_sync_grupo: row.bloquear_sync_grupo,
    nombre: row.nombre ?? 'Entrenamiento',
    descripcion: row.descripcion,
    punto_encuentro: row.punto_encuentro ?? null,
    formulario_externo: row.formulario_externo ?? null,
    disciplina_id: row.disciplina_id,
    escenario_id: row.escenario_id,
    entrenador_id: row.entrenador_id,
    fecha_hora: row.fecha_hora,
    duracion_minutos: row.duracion_minutos,
    cupo_maximo: row.cupo_maximo,
    visibilidad: row.visibilidad === 'publico' ? 'publico' : 'privado',
    visible_para: row.visible_para,
    estado: row.estado,
    reserva_antelacion_horas: (row as Record<string, unknown>).reserva_antelacion_horas as number | null ?? null,
    cancelacion_antelacion_horas: (row as Record<string, unknown>).cancelacion_antelacion_horas as number | null ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toDateOnly(dateValue: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return new Date(`${dateValue}T00:00:00.000Z`);
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    throw new TrainingServiceError('validation', 'Fecha inválida para generar entrenamientos.');
  }

  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function toDateOnlyInBogota(value: string): string {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new TrainingServiceError('validation', 'No fue posible normalizar la fecha del entrenamiento.');
  }

  return `${year}-${month}-${day}`;
}

function resolveFutureCutoffIso(effectiveFrom?: string): string {
  const now = new Date();

  if (!effectiveFrom) {
    return now.toISOString();
  }

  const effectiveDate = new Date(effectiveFrom);
  if (Number.isNaN(effectiveDate.getTime())) {
    throw new TrainingServiceError('validation', 'Fecha efectiva inválida para actualizar entrenamientos futuros.');
  }

  return new Date(Math.max(now.getTime(), effectiveDate.getTime())).toISOString();
}

async function getTrainingSingleActionContext(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  trainingId: string,
): Promise<{ isRecurrentSeries: boolean; selectedDateTime: string | null }> {
  const { data: selectedTraining, error: selectedTrainingError } = await supabase
    .from('entrenamientos')
    .select('entrenamiento_grupo_id, fecha_hora')
    .eq('id', trainingId)
    .eq('tenant_id', tenantId)
    .single();

  if (selectedTrainingError || !selectedTraining) {
    throw mapServiceError(selectedTrainingError);
  }

  const selectedTrainingGroupId = (selectedTraining.entrenamiento_grupo_id as string | null) ?? null;
  const selectedDateTime = (selectedTraining.fecha_hora as string | null) ?? null;

  if (!selectedTrainingGroupId) {
    return {
      isRecurrentSeries: false,
      selectedDateTime,
    };
  }

  const { data: selectedGroup, error: selectedGroupError } = await supabase
    .from('entrenamientos_grupo')
    .select('tipo')
    .eq('id', selectedTrainingGroupId)
    .eq('tenant_id', tenantId)
    .single();

  if (selectedGroupError) {
    throw mapServiceError(selectedGroupError);
  }

  return {
    isRecurrentSeries: (selectedGroup?.tipo as string | null) === 'recurrente',
    selectedDateTime,
  };
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function diffDays(fromDate: Date, toDate: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((toDate.getTime() - fromDate.getTime()) / millisecondsPerDay);
}

function parseTimeToMinutes(timeValue: string): number | null {
  const trimmed = timeValue.trim();
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return null;
  }

  const [hoursRaw, minutesRaw] = trimmed.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

function computeRuleStartTimes(rule: TrainingGroupRule, durationMinutes: number | null): string[] {
  if (rule.tipo_bloque === 'una_vez_dia') {
    return rule.hora_inicio ? [rule.hora_inicio] : [];
  }

  if (rule.tipo_bloque === 'horas_especificas') {
    return (rule.horas_especificas ?? []).filter((value) => value.trim().length > 0);
  }

  if (!rule.hora_inicio || !rule.hora_fin || !durationMinutes || durationMinutes <= 0) {
    return [];
  }

  const startMinutes = parseTimeToMinutes(rule.hora_inicio);
  const endMinutes = parseTimeToMinutes(rule.hora_fin);
  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
    return [];
  }

  const starts: string[] = [];
  for (let cursor = startMinutes; cursor + durationMinutes <= endMinutes; cursor += durationMinutes) {
    starts.push(minutesToTimeString(cursor));
  }

  return starts;
}

function normalizeTimeValue(timeValue: string): string {
  const trimmed = timeValue.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return '00:00:00';
}

function toIsoFromDateAndTime(dateOnly: string, timeValue: string | null, timezone: string): string {
  const normalizedTime = timeValue ? normalizeTimeValue(timeValue) : '00:00:00';

  if (timezone === 'America/Bogota') {
    return `${dateOnly}T${normalizedTime}-05:00`;
  }

  if (!timeValue) {
    return `${dateOnly}T00:00:00.000Z`;
  }

  return `${dateOnly}T${normalizedTime}.000Z`;
}

export const entrenamientosService = {
  async listTrainingGroupsByTenant(tenantId: string): Promise<TrainingGroupWithDetails[]> {
    const supabase = createClient();

    const [{ data: groupsData, error: groupsError }, { data: rulesData, error: rulesError }, { data: instancesData, error: instancesError }] = await Promise.all([
      supabase
        .from('entrenamientos_grupo')
        .select(
          'id, tenant_id, tipo, nombre, descripcion, punto_encuentro, formulario_externo, disciplina_id, escenario_id, entrenador_id, duracion_minutos, cupo_maximo, timezone, fecha_inicio, fecha_fin, estado, created_at, updated_at',
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      supabase
        .from('entrenamientos_grupo_reglas')
        .select('id, tenant_id, entrenamiento_grupo_id, dias_semana, repetir_cada_semanas, tipo_bloque, hora_inicio, hora_fin, horas_especificas, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true }),
      supabase
        .from('entrenamientos')
        .select('id, tenant_id, entrenamiento_grupo_id, origen_creacion, es_excepcion_serie, bloquear_sync_grupo, nombre, descripcion, punto_encuentro, formulario_externo, disciplina_id, escenario_id, entrenador_id, fecha_hora, duracion_minutos, cupo_maximo, visibilidad, visible_para, estado, created_at, updated_at')
        .eq('tenant_id', tenantId),
    ]);

    if (groupsError || rulesError || instancesError) {
      throw mapServiceError(groupsError ?? rulesError ?? instancesError);
    }

    const rules = (rulesData ?? []) as TrainingRuleRow[];
    const instances = ((instancesData ?? []) as TrainingInstanceRow[]).map(mapTrainingInstance);

    return ((groupsData ?? []) as TrainingGroupRow[]).map((row) => {
      const group = mapTrainingGroup(row);
      const groupRules = rules.filter((rule) => rule.entrenamiento_grupo_id === group.id);
      const instancesCount = instances.filter((instance) => instance.entrenamiento_grupo_id === group.id).length;

      return {
        ...group,
        reglas: groupRules,
        instancesCount,
      };
    });
  },

  async listTrainingInstancesByTenantAndRange(tenantId: string, from?: string, to?: string): Promise<TrainingInstance[]> {
    const supabase = createClient();

    let query = supabase
      .from('entrenamientos')
      .select('id, tenant_id, entrenamiento_grupo_id, origen_creacion, es_excepcion_serie, bloquear_sync_grupo, nombre, descripcion, punto_encuentro, formulario_externo, disciplina_id, escenario_id, entrenador_id, fecha_hora, duracion_minutos, cupo_maximo, visibilidad, visible_para, estado, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('fecha_hora', { ascending: true, nullsFirst: false });

    if (from) {
      query = query.gte('fecha_hora', `${from}T00:00:00.000Z`);
    }

    if (to) {
      query = query.lte('fecha_hora', `${to}T23:59:59.999Z`);
    }

    const { data, error } = await query;

    if (error) {
      throw mapServiceError(error);
    }

    return ((data ?? []) as TrainingInstanceRow[]).map(mapTrainingInstance);
  },

  async createTrainingSeries(input: CreateTrainingSeriesInput): Promise<TrainingGroup | null> {
    const supabase = createClient();

    if (input.group.tipo === 'unico') {
      const visibilidad = input.visibilidad ?? 'privado';
      const visible_para = resolveVisiblePara(visibilidad, input.tenantId);

      const { data: unicoData, error: uniqueError } = await supabase
        .from('entrenamientos')
        .insert({
          tenant_id: input.tenantId,
          entrenamiento_grupo_id: null,
          origen_creacion: 'manual',
          nombre: toNullable(input.group.nombre),
          descripcion: toNullable(input.group.descripcion),
          punto_encuentro: toNullable(input.group.punto_encuentro),
          formulario_externo: toNullable(input.group.formulario_externo),
          disciplina_id: input.group.disciplina_id,
          escenario_id: input.group.escenario_id,
          entrenador_id: input.group.entrenador_id ?? null,
          fecha_hora: input.uniqueDateTime ?? toIsoFromDateAndTime(input.group.fecha_inicio, null, input.group.timezone ?? 'America/Bogota'),
          duracion_minutos: input.group.duracion_minutos ?? null,
          cupo_maximo: input.group.cupo_maximo ?? null,
          visibilidad,
          visible_para,
          reserva_antelacion_horas: input.reserva_antelacion_horas ?? null,
          cancelacion_antelacion_horas: input.cancelacion_antelacion_horas ?? null,
        })
        .select('id')
        .single();

      if (uniqueError || !unicoData) {
        throw mapServiceError(uniqueError);
      }

      if (input.categorias?.length) {
        await entrenamientoCategoriasService.upsertInstanceCategorias(
          unicoData.id,
          input.categorias,
          true,
        );
      }

      // Insert restriction rows for the unique training
      if (input.restricciones?.length) {
        const restriccionRows = input.restricciones.map((r, i) => ({
          tenant_id: input.tenantId,
          entrenamiento_id: unicoData.id,
          usuario_estado: r.usuario_estado ?? null,
          plan_id: r.plan_id ?? null,
          disciplina_id: r.disciplina_id ?? null,
          validar_nivel_disciplina: r.validar_nivel_disciplina,
          orden: r.orden ?? i + 1,
        }));
        const { error: restError } = await supabase
          .from('entrenamiento_restricciones')
          .insert(restriccionRows);
        if (restError) throw mapServiceError(restError);
      }

      return null;
    }

    const { data, error } = await supabase
      .from('entrenamientos_grupo')
      .insert({
        tenant_id: input.tenantId,
        tipo: input.group.tipo,
        nombre: toNullable(input.group.nombre),
        descripcion: toNullable(input.group.descripcion),
        punto_encuentro: toNullable(input.group.punto_encuentro),
        formulario_externo: toNullable(input.group.formulario_externo),
        disciplina_id: input.group.disciplina_id,
        escenario_id: input.group.escenario_id,
        entrenador_id: input.group.entrenador_id ?? null,
        duracion_minutos: input.group.duracion_minutos ?? null,
        cupo_maximo: input.group.cupo_maximo ?? null,
        timezone: input.group.timezone ?? 'America/Bogota',
        fecha_inicio: input.group.fecha_inicio,
        fecha_fin: input.group.fecha_fin ?? null,
        estado: input.group.estado ?? 'activo',
        reserva_antelacion_horas: input.reserva_antelacion_horas ?? null,
        cancelacion_antelacion_horas: input.cancelacion_antelacion_horas ?? null,
      })
      .select(
        'id, tenant_id, tipo, nombre, descripcion, punto_encuentro, formulario_externo, disciplina_id, escenario_id, entrenador_id, duracion_minutos, cupo_maximo, timezone, fecha_inicio, fecha_fin, estado, created_at, updated_at',
      )
      .single();

    if (error || !data) {
      throw mapServiceError(error);
    }

    const group = mapTrainingGroup(data as TrainingGroupRow);

    const rules = await this.upsertTrainingGroupRules({
      tenantId: input.tenantId,
      trainingGroupId: group.id,
      rules: input.rules,
    });

    const instances = await this.generateSeriesInstances({
      tenantId: input.tenantId,
      visibilidad: input.visibilidad,
      trainingGroup: group,
      rules,
      fromDate: input.group.fecha_inicio,
      toDate: input.group.fecha_fin,
      uniqueDateTime: input.uniqueDateTime,
    });

    if (input.categorias?.length) {
      await entrenamientoCategoriasService.upsertGrupoCategorias(group.id, input.categorias);
      for (const inst of instances) {
        await entrenamientoCategoriasService.upsertInstanceCategorias(inst.id, input.categorias, true);
      }
    }

    // Insert grupo restriction rows
    if (input.restricciones?.length) {
      const grupoRestRows = input.restricciones.map((r, i) => ({
        tenant_id: input.tenantId,
        entrenamiento_grupo_id: group.id,
        usuario_estado: r.usuario_estado ?? null,
        plan_id: r.plan_id ?? null,
        disciplina_id: r.disciplina_id ?? null,
        validar_nivel_disciplina: r.validar_nivel_disciplina,
        orden: r.orden ?? i + 1,
      }));
      const { error: grError } = await supabase
        .from('entrenamiento_grupo_restricciones')
        .insert(grupoRestRows);
      if (grError) throw mapServiceError(grError);

      // Copy grupo restrictions to generated instances
      for (const inst of instances) {
        const instRestRows = input.restricciones.map((r, i) => ({
          tenant_id: input.tenantId,
          entrenamiento_id: inst.id,
          usuario_estado: r.usuario_estado ?? null,
          plan_id: r.plan_id ?? null,
          disciplina_id: r.disciplina_id ?? null,
          validar_nivel_disciplina: r.validar_nivel_disciplina,
          orden: r.orden ?? i + 1,
        }));
        const { error: irError } = await supabase
          .from('entrenamiento_restricciones')
          .insert(instRestRows);
        if (irError) throw mapServiceError(irError);
      }
    }

    return group;
  },

  async upsertTrainingGroupRules(input: UpsertTrainingGroupRulesInput): Promise<TrainingGroupRule[]> {
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('entrenamientos_grupo_reglas')
      .delete()
      .eq('tenant_id', input.tenantId)
      .eq('entrenamiento_grupo_id', input.trainingGroupId);

    if (deleteError) {
      throw mapServiceError(deleteError);
    }

    if (input.rules.length === 0) {
      return [];
    }

    const rows = input.rules.map((rule) => ({
      tenant_id: input.tenantId,
      entrenamiento_grupo_id: input.trainingGroupId,
      dias_semana: rule.dias_semana,
      repetir_cada_semanas: rule.repetir_cada_semanas,
      tipo_bloque: rule.tipo_bloque,
      hora_inicio: rule.hora_inicio ?? null,
      hora_fin: rule.hora_fin ?? null,
      horas_especificas: rule.horas_especificas ?? null,
    }));

    const { data, error } = await supabase
      .from('entrenamientos_grupo_reglas')
      .insert(rows)
      .select('id, tenant_id, entrenamiento_grupo_id, dias_semana, repetir_cada_semanas, tipo_bloque, hora_inicio, hora_fin, horas_especificas, created_at, updated_at');

    if (error) {
      throw mapServiceError(error);
    }

    return (data ?? []) as TrainingRuleRow[];
  },

  async generateSeriesInstances(input: GenerateSeriesInstancesInput): Promise<TrainingInstance[]> {
    const supabase = createClient();

    const fromDate = input.fromDate ?? input.trainingGroup.fecha_inicio;
    const toDate = input.toDate ?? input.trainingGroup.fecha_fin ?? input.trainingGroup.fecha_inicio;

    const start = toDateOnly(fromDate);
    const end = toDateOnly(toDate);

    const visibilidad = input.visibilidad ?? 'privado';
    const visible_para = resolveVisiblePara(visibilidad, input.tenantId);

    const rows: Array<Record<string, unknown>> = [];

    if (input.trainingGroup.tipo === 'unico') {
      rows.push({
        tenant_id: input.tenantId,
        entrenamiento_grupo_id: input.trainingGroup.id,
        origen_creacion: 'manual',
        nombre: input.trainingGroup.nombre,
        descripcion: input.trainingGroup.descripcion,
        punto_encuentro: input.trainingGroup.punto_encuentro ?? null,
        formulario_externo: input.trainingGroup.formulario_externo ?? null,
        disciplina_id: input.trainingGroup.disciplina_id,
        escenario_id: input.trainingGroup.escenario_id,
        entrenador_id: input.trainingGroup.entrenador_id,
        fecha_hora: input.uniqueDateTime ?? toIsoFromDateAndTime(fromDate, null, input.trainingGroup.timezone),
        duracion_minutos: input.trainingGroup.duracion_minutos,
        cupo_maximo: input.trainingGroup.cupo_maximo,
        visibilidad,
        visible_para,
        reserva_antelacion_horas: input.trainingGroup.reserva_antelacion_horas ?? null,
        cancelacion_antelacion_horas: input.trainingGroup.cancelacion_antelacion_horas ?? null,
      });
    } else {
      let cursor = start;

      while (cursor.getTime() <= end.getTime()) {
        const dateOnly = formatDateOnly(cursor);
        const weekday = cursor.getUTCDay();
        const dayOffset = diffDays(start, cursor);
        const weekIndex = Math.floor(dayOffset / 7);
        const applicableRules = input.rules.filter((rule) => {
          const days = rule.dias_semana ?? [];
          const includesWeekday = days.includes(weekday);
          if (!includesWeekday) {
            return false;
          }

          const repeatEvery = Math.max(1, rule.repetir_cada_semanas ?? 1);
          return weekIndex % repeatEvery === 0;
        });

        for (const rule of applicableRules) {
          const starts = computeRuleStartTimes(rule, input.trainingGroup.duracion_minutos);
          for (const startTime of starts) {
            rows.push({
              tenant_id: input.tenantId,
              entrenamiento_grupo_id: input.trainingGroup.id,
              origen_creacion: 'generado',
              nombre: input.trainingGroup.nombre,
              descripcion: input.trainingGroup.descripcion,
              punto_encuentro: input.trainingGroup.punto_encuentro ?? null,
              formulario_externo: input.trainingGroup.formulario_externo ?? null,
              disciplina_id: input.trainingGroup.disciplina_id,
              escenario_id: input.trainingGroup.escenario_id,
              entrenador_id: input.trainingGroup.entrenador_id,
              fecha_hora: toIsoFromDateAndTime(dateOnly, startTime, input.trainingGroup.timezone),
              duracion_minutos: input.trainingGroup.duracion_minutos,
              cupo_maximo: input.trainingGroup.cupo_maximo,
              visibilidad,
              visible_para,
              reserva_antelacion_horas: input.trainingGroup.reserva_antelacion_horas ?? null,
              cancelacion_antelacion_horas: input.trainingGroup.cancelacion_antelacion_horas ?? null,
            });
          }
        }

        cursor = addDays(cursor, 1);
      }
    }

    if (rows.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('entrenamientos')
      .insert(rows)
      .select('id, tenant_id, entrenamiento_grupo_id, origen_creacion, es_excepcion_serie, bloquear_sync_grupo, nombre, descripcion, punto_encuentro, formulario_externo, disciplina_id, escenario_id, entrenador_id, fecha_hora, duracion_minutos, cupo_maximo, visibilidad, visible_para, estado, created_at, updated_at');

    if (error) {
      throw mapServiceError(error);
    }

    return ((data ?? []) as TrainingInstanceRow[]).map(mapTrainingInstance);
  },

  async updateTrainingSeries(input: UpdateTrainingSeriesInput): Promise<TrainingGroup> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('entrenamientos_grupo')
      .update({
        nombre: input.groupPatch.nombre,
        descripcion: input.groupPatch.descripcion,
        punto_encuentro: input.groupPatch.punto_encuentro,
        formulario_externo: input.groupPatch.formulario_externo,
        disciplina_id: input.groupPatch.disciplina_id,
        escenario_id: input.groupPatch.escenario_id,
        entrenador_id: input.groupPatch.entrenador_id,
        duracion_minutos: input.groupPatch.duracion_minutos,
        cupo_maximo: input.groupPatch.cupo_maximo,
        fecha_inicio: input.groupPatch.fecha_inicio,
        fecha_fin: input.groupPatch.fecha_fin,
        estado: input.groupPatch.estado,
        ...(input.reserva_antelacion_horas !== undefined ? { reserva_antelacion_horas: input.reserva_antelacion_horas } : {}),
        ...(input.cancelacion_antelacion_horas !== undefined ? { cancelacion_antelacion_horas: input.cancelacion_antelacion_horas } : {}),
      })
      .eq('id', input.trainingGroupId)
      .eq('tenant_id', input.tenantId)
      .select(
        'id, tenant_id, tipo, nombre, descripcion, punto_encuentro, formulario_externo, disciplina_id, escenario_id, entrenador_id, duracion_minutos, cupo_maximo, timezone, fecha_inicio, fecha_fin, estado, created_at, updated_at',
      )
      .single();

    if (error || !data) {
      throw mapServiceError(error);
    }

    const group = mapTrainingGroup(data as TrainingGroupRow);
    const mutationFromIso = input.scope === 'future' ? resolveFutureCutoffIso(input.effectiveFrom) : new Date().toISOString();

    const syncGroupPatchToInstances = async () => {
      const instancePatch: Record<string, unknown> = {
        nombre: group.nombre,
        descripcion: group.descripcion,
        punto_encuentro: group.punto_encuentro,
        formulario_externo: group.formulario_externo,
        disciplina_id: group.disciplina_id,
        escenario_id: group.escenario_id,
        entrenador_id: group.entrenador_id,
        duracion_minutos: group.duracion_minutos,
        cupo_maximo: group.cupo_maximo,
      };

      if (input.visibilidad) {
        instancePatch.visibilidad = input.visibilidad;
        instancePatch.visible_para = resolveVisiblePara(input.visibilidad, input.tenantId);
      }

      const syncQuery = supabase
        .from('entrenamientos')
        .update(instancePatch)
        .eq('tenant_id', input.tenantId)
        .eq('entrenamiento_grupo_id', input.trainingGroupId)
        .eq('bloquear_sync_grupo', false)
        .neq('estado', 'cancelado')
        .gte('fecha_hora', mutationFromIso);

      const { error: syncError } = await syncQuery;
      if (syncError) {
        throw mapServiceError(syncError);
      }
    };

    await syncGroupPatchToInstances();

    if (input.rules) {
      const rules = await this.upsertTrainingGroupRules({
        tenantId: input.tenantId,
        trainingGroupId: input.trainingGroupId,
        rules: input.rules,
      });

      const regenerationFromDate = toDateOnlyInBogota(mutationFromIso);

      if (regenerationFromDate) {
        await this.deleteTrainingWithScope({
          tenantId: input.tenantId,
          scope: 'future',
          trainingGroupId: input.trainingGroupId,
          effectiveFrom: mutationFromIso,
        });

        await this.generateSeriesInstances({
          tenantId: input.tenantId,
          visibilidad: input.visibilidad,
          trainingGroup: group,
          rules,
          fromDate: regenerationFromDate,
          toDate: group.fecha_fin,
        });
      }
    }

    // Sync categories if provided
    if (input.categorias) {
      await entrenamientoCategoriasService.upsertGrupoCategorias(input.trainingGroupId, input.categorias);

      // Re-sync instance categories for eligible instances (sincronizado_grupo = true)
      const { data: eligibleInstances } = await supabase
        .from('entrenamientos')
        .select('id')
        .eq('tenant_id', input.tenantId)
        .eq('entrenamiento_grupo_id', input.trainingGroupId)
        .eq('bloquear_sync_grupo', false)
        .neq('estado', 'cancelado')
        .gte('fecha_hora', mutationFromIso);

      if (eligibleInstances) {
        for (const inst of eligibleInstances) {
          const existingCats = await entrenamientoCategoriasService.getEntrenamientoCategorias(inst.id);
          const isInSync = existingCats.length === 0 || existingCats.every((c) => c.sincronizado_grupo);
          if (isInSync) {
            await entrenamientoCategoriasService.upsertInstanceCategorias(inst.id, input.categorias, true);
          }
        }
      }
    }

    // Sync grupo restrictions if provided (delete-and-reinsert)
    if (input.restricciones !== undefined) {
      const { error: delRestErr } = await supabase
        .from('entrenamiento_grupo_restricciones')
        .delete()
        .eq('tenant_id', input.tenantId)
        .eq('entrenamiento_grupo_id', input.trainingGroupId);
      if (delRestErr) throw mapServiceError(delRestErr);

      if (input.restricciones.length > 0) {
        const grupoRestRows = input.restricciones.map((r, i) => ({
          tenant_id: input.tenantId,
          entrenamiento_grupo_id: input.trainingGroupId,
          usuario_estado: r.usuario_estado ?? null,
          plan_id: r.plan_id ?? null,
          disciplina_id: r.disciplina_id ?? null,
          validar_nivel_disciplina: r.validar_nivel_disciplina,
          orden: r.orden ?? i + 1,
        }));
        const { error: insRestErr } = await supabase
          .from('entrenamiento_grupo_restricciones')
          .insert(grupoRestRows);
        if (insRestErr) throw mapServiceError(insRestErr);
      }
    }

    return group;
  },

  async updateTrainingInstance(input: UpdateTrainingInstanceInput): Promise<void> {
    const supabase = createClient();

    if (input.scope === 'single') {
      const { selectedDateTime } = await getTrainingSingleActionContext(supabase, input.tenantId, input.trainingId);

      if (selectedDateTime && new Date(selectedDateTime).getTime() < Date.now()) {
        throw new TrainingServiceError('validation', 'No se pueden editar entrenamientos pasados.');
      }

      const singlePatch: Record<string, unknown> = {
        ...input.patch,
        entrenamiento_grupo_id: null,
        es_excepcion_serie: true,
        bloquear_sync_grupo: true,
      };

      if (input.visibilidad) {
        singlePatch.visibilidad = input.visibilidad;
        singlePatch.visible_para = resolveVisiblePara(input.visibilidad, input.tenantId);
      }
      if (input.reserva_antelacion_horas !== undefined) {
        singlePatch.reserva_antelacion_horas = input.reserva_antelacion_horas;
      }
      if (input.cancelacion_antelacion_horas !== undefined) {
        singlePatch.cancelacion_antelacion_horas = input.cancelacion_antelacion_horas;
      }

      const { error } = await supabase
        .from('entrenamientos')
        .update(singlePatch)
        .eq('id', input.trainingId)
        .eq('tenant_id', input.tenantId);

      if (error) {
        throw mapServiceError(error);
      }

      // Single-scope category override: mark sincronizado_grupo = false
      if (input.categorias) {
        await entrenamientoCategoriasService.upsertInstanceCategorias(input.trainingId, input.categorias, false);
      }

      // Replace instance restriction rows (delete-and-reinsert)
      if (input.restricciones !== undefined) {
        const { error: delErr } = await supabase
          .from('entrenamiento_restricciones')
          .delete()
          .eq('tenant_id', input.tenantId)
          .eq('entrenamiento_id', input.trainingId);
        if (delErr) throw mapServiceError(delErr);

        if (input.restricciones.length > 0) {
          const restRows = input.restricciones.map((r, i) => ({
            tenant_id: input.tenantId,
            entrenamiento_id: input.trainingId,
            usuario_estado: r.usuario_estado ?? null,
            plan_id: r.plan_id ?? null,
            disciplina_id: r.disciplina_id ?? null,
            validar_nivel_disciplina: r.validar_nivel_disciplina,
            orden: r.orden ?? i + 1,
          }));
          const { error: insErr } = await supabase
            .from('entrenamiento_restricciones')
            .insert(restRows);
          if (insErr) throw mapServiceError(insErr);
        }
      }

      return;
    }

    if (!input.trainingGroupId) {
      throw new TrainingServiceError('validation', 'Falta el grupo de entrenamiento para aplicar el alcance seleccionado.');
    }

    const scopePatch: Record<string, unknown> = { ...input.patch };
    if (input.visibilidad) {
      scopePatch.visibilidad = input.visibilidad;
      scopePatch.visible_para = resolveVisiblePara(input.visibilidad, input.tenantId);
    }

    const query = supabase
      .from('entrenamientos')
      .update(scopePatch)
      .eq('tenant_id', input.tenantId)
      .eq('entrenamiento_grupo_id', input.trainingGroupId)
      .gte('fecha_hora', input.scope === 'future' ? resolveFutureCutoffIso(input.effectiveFrom) : new Date().toISOString());

    if (input.scope === 'future') {
      if (!input.effectiveFrom) {
        throw new TrainingServiceError('validation', 'Falta la fecha efectiva para actualizar entrenamientos futuros.');
      }
    }

    const { error } = await query;

    if (error) {
      throw mapServiceError(error);
    }
  },

  async deleteTrainingWithScope(input: DeleteTrainingWithScopeInput): Promise<void> {
    const supabase = createClient();

    if (input.scope === 'single') {
      if (!input.trainingId) {
        throw new TrainingServiceError('validation', 'Debes indicar el entrenamiento a eliminar.');
      }

      const { isRecurrentSeries, selectedDateTime } = await getTrainingSingleActionContext(supabase, input.tenantId, input.trainingId);

      if (isRecurrentSeries) {
        throw new TrainingServiceError('validation', 'Las series se eliminan únicamente por alcance de serie.');
      }

      if (selectedDateTime && new Date(selectedDateTime).getTime() < Date.now()) {
        throw new TrainingServiceError('validation', 'No se pueden eliminar entrenamientos pasados.');
      }

      const { error } = await supabase
        .from('entrenamientos')
        .delete()
        .eq('id', input.trainingId)
        .eq('tenant_id', input.tenantId);

      if (error) {
        throw mapServiceError(error);
      }

      return;
    }

    if (input.scope === 'future') {
      let trainingGroupId = input.trainingGroupId;
      let effectiveFrom = input.effectiveFrom;

      if (!trainingGroupId && input.trainingId) {
        const { data: selectedTraining, error: selectedTrainingError } = await supabase
          .from('entrenamientos')
          .select('entrenamiento_grupo_id, fecha_hora')
          .eq('id', input.trainingId)
          .eq('tenant_id', input.tenantId)
          .single();

        if (selectedTrainingError || !selectedTraining) {
          throw mapServiceError(selectedTrainingError);
        }

        trainingGroupId = (selectedTraining.entrenamiento_grupo_id as string | null) ?? undefined;
        effectiveFrom = effectiveFrom ?? (selectedTraining.fecha_hora as string | null) ?? undefined;
      }

      if (!trainingGroupId || !effectiveFrom) {
        throw new TrainingServiceError('validation', 'Debes indicar el grupo y fecha efectiva para eliminar futuros entrenamientos.');
      }

      const cutoffIso = resolveFutureCutoffIso(effectiveFrom);

      const { error } = await supabase
        .from('entrenamientos')
        .delete()
        .eq('tenant_id', input.tenantId)
        .eq('entrenamiento_grupo_id', trainingGroupId)
        .gte('fecha_hora', cutoffIso);

      if (error) {
        throw mapServiceError(error);
      }

      return;
    }

    if (!input.trainingGroupId) {
      throw new TrainingServiceError('validation', 'Debes indicar la serie de entrenamientos a eliminar.');
    }

    const cutoffIso = resolveFutureCutoffIso(input.effectiveFrom);

    const { error: instancesError } = await supabase
      .from('entrenamientos')
      .delete()
      .eq('tenant_id', input.tenantId)
      .eq('entrenamiento_grupo_id', input.trainingGroupId)
      .gte('fecha_hora', cutoffIso);

    if (instancesError) {
      throw mapServiceError(instancesError);
    }

    const { error: groupError } = await supabase
      .from('entrenamientos_grupo')
      .update({ estado: 'cancelado' })
      .eq('id', input.trainingGroupId)
      .eq('tenant_id', input.tenantId);

    if (groupError) {
      throw mapServiceError(groupError);
    }
  },

  async getInstanceRestrictions(tenantId: string, entrenamientoId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('entrenamiento_restricciones')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entrenamiento_id', entrenamientoId)
      .order('orden', { ascending: true });
    if (error) throw mapServiceError(error);
    return data ?? [];
  },

  async getGroupRestrictions(tenantId: string, grupoId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('entrenamiento_grupo_restricciones')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entrenamiento_grupo_id', grupoId)
      .order('orden', { ascending: true });
    if (error) throw mapServiceError(error);
    return data ?? [];
  },

  async listDisciplineOptions(tenantId: string): Promise<SelectOption[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('disciplinas')
      .select('id, nombre')
      .eq('tenant_id', tenantId)
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      throw mapServiceError(error);
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      label: (row.nombre as string | null) ?? 'Disciplina',
    }));
  },

  async listScenarioOptions(tenantId: string): Promise<SelectOption[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('escenarios')
      .select('id, nombre')
      .eq('tenant_id', tenantId)
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      throw mapServiceError(error);
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      label: (row.nombre as string | null) ?? 'Escenario',
    }));
  },

  async listTrainerOptions(tenantId: string): Promise<SelectOption[]> {
    const supabase = createClient();

    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .select('id, nombre')
      .ilike('nombre', 'entrenador');

    if (rolesError) {
      throw mapServiceError(rolesError);
    }

    const roleIds = (rolesData ?? []).map((row) => row.id as string);

    if (roleIds.length === 0) {
      return [];
    }

    const { data: membersData, error: membersError } = await supabase
      .from('miembros_tenant')
      .select('usuario_id')
      .eq('tenant_id', tenantId)
      .in('rol_id', roleIds);

    if (membersError) {
      throw mapServiceError(membersError);
    }

    const userIds = (membersData ?? []).map((row) => row.usuario_id as string);

    if (userIds.length === 0) {
      return [];
    }

    const { data: usersData, error: usersError } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email')
      .in('id', userIds)
      .eq('activo', true);

    if (usersError) {
      throw mapServiceError(usersError);
    }

    return (usersData ?? []).map((row) => {
      const fullName = `${(row.nombre as string | null) ?? ''} ${(row.apellido as string | null) ?? ''}`.trim();
      return {
        id: row.id as string,
        label: fullName.length > 0 ? fullName : ((row.email as string | null) ?? 'Entrenador'),
      };
    });
  },

  async listPlanOptions(tenantId: string): Promise<SelectOption[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('planes')
      .select('id, nombre')
      .eq('tenant_id', tenantId)
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      throw mapServiceError(error);
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      label: (row.nombre as string | null) ?? 'Plan',
    }));
  },
};
