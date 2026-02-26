import { createClient } from '@/services/supabase/client';
import type {
  CreateScenarioInput,
  Scenario,
  ScenarioSchedule,
  ScenarioWithAvailability,
  UpdateScenarioInput,
  UpsertScenarioSchedulesInput,
} from '@/types/portal/scenarios.types';

type ScenarioRow = Omit<Scenario, 'nombre' | 'tipo'> & {
  nombre: string | null;
  tipo: string | null;
};

type ScenarioScheduleRow = ScenarioSchedule;

function toNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function mapScenarioRow(row: ScenarioRow): Scenario {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    nombre: row.nombre ?? 'Escenario sin nombre',
    descripcion: row.descripcion,
    ubicacion: row.ubicacion,
    direccion: row.direccion,
    coordenadas: row.coordenadas,
    capacidad: row.capacidad,
    tipo: row.tipo ?? 'general',
    activo: row.activo,
    image_url: row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const scenariosService = {
  async listScenariosByTenant(tenantId: string): Promise<ScenarioWithAvailability[]> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('escenarios')
      .select(
        'id, tenant_id, nombre, descripcion, ubicacion, direccion, coordenadas, capacidad, tipo, activo, image_url, created_at, updated_at',
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('No fue posible cargar los escenarios.');
    }

    const scenarios = ((data ?? []) as ScenarioRow[]).map(mapScenarioRow);

    if (scenarios.length === 0) {
      return [];
    }

    const schedules = await this.listScenarioSchedules(tenantId);

    return scenarios.map((scenario) => {
      const scenarioSchedules = schedules.filter((schedule) => schedule.escenario_id === scenario.id);
      const hasAvailableSchedule = scenarioSchedules.some((schedule) => schedule.disponible);

      return {
        ...scenario,
        schedules: scenarioSchedules,
        availability: {
          activo: scenario.activo,
          hasAvailableSchedule,
        },
      };
    });
  },

  async createScenario(payload: CreateScenarioInput): Promise<Scenario> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('escenarios')
      .insert({
        tenant_id: payload.tenantId,
        nombre: payload.nombre.trim(),
        descripcion: toNullable(payload.descripcion),
        ubicacion: toNullable(payload.ubicacion),
        direccion: toNullable(payload.direccion),
        coordenadas: toNullable(payload.coordenadas),
        capacidad: payload.capacidad ?? null,
        tipo: payload.tipo.trim(),
        activo: payload.activo ?? true,
        image_url: toNullable(payload.image_url),
      })
      .select(
        'id, tenant_id, nombre, descripcion, ubicacion, direccion, coordenadas, capacidad, tipo, activo, image_url, created_at, updated_at',
      )
      .single();

    if (error || !data) {
      throw new Error('No fue posible crear el escenario.');
    }

    return mapScenarioRow(data as ScenarioRow);
  },

  async updateScenario(scenarioId: string, payload: UpdateScenarioInput): Promise<Scenario> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('escenarios')
      .update({
        nombre: payload.nombre.trim(),
        descripcion: toNullable(payload.descripcion),
        ubicacion: toNullable(payload.ubicacion),
        direccion: toNullable(payload.direccion),
        coordenadas: toNullable(payload.coordenadas),
        capacidad: payload.capacidad ?? null,
        tipo: payload.tipo.trim(),
        activo: payload.activo ?? true,
        image_url: toNullable(payload.image_url),
      })
      .eq('id', scenarioId)
      .eq('tenant_id', payload.tenantId)
      .select(
        'id, tenant_id, nombre, descripcion, ubicacion, direccion, coordenadas, capacidad, tipo, activo, image_url, created_at, updated_at',
      )
      .single();

    if (error || !data) {
      throw new Error('No fue posible actualizar el escenario.');
    }

    return mapScenarioRow(data as ScenarioRow);
  },

  async deleteScenario(scenarioId: string, tenantId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('escenarios')
      .delete()
      .eq('id', scenarioId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error('No fue posible eliminar el escenario.');
    }
  },

  async listScenarioSchedules(tenantId: string, scenarioId?: string): Promise<ScenarioSchedule[]> {
    const supabase = createClient();

    let query = supabase
      .from('horarios_escenarios')
      .select('id, tenant_id, escenario_id, dia_semana, hora_inicio, hora_fin, disponible, created_at')
      .eq('tenant_id', tenantId)
      .order('dia_semana', { ascending: true })
      .order('hora_inicio', { ascending: true });

    if (scenarioId) {
      query = query.eq('escenario_id', scenarioId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('No fue posible cargar los horarios del escenario.');
    }

    return (data ?? []) as ScenarioScheduleRow[];
  },

  async upsertScenarioSchedules(
    tenantId: string,
    scenarioId: string,
    payload: UpsertScenarioSchedulesInput,
  ): Promise<ScenarioSchedule[]> {
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from('horarios_escenarios')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('escenario_id', scenarioId);

    if (deleteError) {
      throw new Error('No fue posible actualizar los horarios del escenario.');
    }

    if (payload.schedules.length === 0) {
      return [];
    }

    const rows = payload.schedules.map((schedule) => ({
      tenant_id: tenantId,
      escenario_id: scenarioId,
      dia_semana: schedule.dia_semana,
      hora_inicio: schedule.hora_inicio,
      hora_fin: schedule.hora_fin,
      disponible: schedule.disponible,
    }));

    const { data, error } = await supabase
      .from('horarios_escenarios')
      .insert(rows)
      .select('id, tenant_id, escenario_id, dia_semana, hora_inicio, hora_fin, disponible, created_at');

    if (error) {
      throw new Error('No fue posible guardar los horarios del escenario.');
    }

    return (data ?? []) as ScenarioScheduleRow[];
  },
};
