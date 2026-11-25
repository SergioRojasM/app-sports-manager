'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { entrenamientosService } from '@/services/supabase/portal/entrenamientos.service';
import { eventosService } from '@/services/supabase/portal/eventos.service';
import { formulariosService } from '@/services/supabase/portal/formularios.service';
import { metodosPagoService } from '@/services/supabase/portal/metodos-pago.service';
import type { SelectOption } from '@/types/portal/entrenamientos.types';
import type { EventoListItem } from '@/types/portal/eventos.types';
import type { FormularioPlantillaListItem } from '@/types/portal/formularios.types';
import type { MetodoPago } from '@/types/portal/metodos-pago.types';

export type EventoWizardOptions = {
  /** Active disciplines; `label` is the name the event stores. */
  disciplinas: SelectOption[];
  entrenadores: SelectOption[];
  /** Every event of the tenant, for the Múltiple ticket bundle selector. */
  eventos: EventoListItem[];
  /** Active form templates, sorted by name. */
  formularios: FormularioPlantillaListItem[];
  formulariosActivosIds: ReadonlySet<string>;
  /** Active payment methods, ordered by `orden`. */
  metodosPago: MetodoPago[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/** Option lists for the event wizard's selectors, loaded in parallel (US-0119). Scenarios come from useScenarios. */
export function useEventoWizardOptions(tenantId: string): EventoWizardOptions {
  const [disciplinas, setDisciplinas] = useState<SelectOption[]>([]);
  const [entrenadores, setEntrenadores] = useState<SelectOption[]>([]);
  const [eventos, setEventos] = useState<EventoListItem[]>([]);
  const [formularios, setFormularios] = useState<FormularioPlantillaListItem[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [disciplinasData, entrenadoresData, eventosData, formulariosData, metodosData] = await Promise.all([
        entrenamientosService.listDisciplineOptions(tenantId),
        entrenamientosService.listTrainerOptions(tenantId),
        eventosService.listEventos(tenantId),
        formulariosService.getPlantillasByTenant(tenantId),
        metodosPagoService.getMetodosPago(tenantId, true),
      ]);
      setDisciplinas(disciplinasData);
      setEntrenadores(entrenadoresData);
      setEventos(eventosData);
      setFormularios(
        formulariosData
          .filter((plantilla) => plantilla.activo)
          .slice()
          .sort((left, right) => left.nombre.localeCompare(right.nombre)),
      );
      setMetodosPago(metodosData);
    } catch (err) {
      console.error('Failed to load event wizard options:', err);
      setError('No se pudieron cargar los datos del formulario del evento.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const formulariosActivosIds = useMemo(() => new Set(formularios.map((plantilla) => plantilla.id)), [formularios]);

  return {
    disciplinas,
    entrenadores,
    eventos,
    formularios,
    formulariosActivosIds,
    metodosPago,
    loading,
    error,
    reload,
  };
}
