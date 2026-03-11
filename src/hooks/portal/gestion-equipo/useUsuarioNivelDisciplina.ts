'use client';

import { useCallback, useEffect, useState } from 'react';
import { usuarioNivelDisciplinaService } from '@/services/supabase/portal/usuario-nivel-disciplina.service';
import { nivelDisciplinaService } from '@/services/supabase/portal/nivel-disciplina.service';
import { disciplinesService } from '@/services/supabase/portal/disciplines.service';
import type { UsuarioNivelDisciplina, UsuarioNivelDisciplinaInput, AsignarNivelView } from '@/types/portal/equipo.types';

type UseUsuarioNivelDisciplinaOptions = {
  usuarioId: string;
  tenantId: string;
};

type UseUsuarioNivelDisciplinaResult = {
  asignaciones: UsuarioNivelDisciplina[];
  disciplinasConNiveles: AsignarNivelView[];
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  asignarNivel: (input: UsuarioNivelDisciplinaInput) => Promise<boolean>;
};

export function useUsuarioNivelDisciplina({ usuarioId, tenantId }: UseUsuarioNivelDisciplinaOptions): UseUsuarioNivelDisciplinaResult {
  const [asignaciones, setAsignaciones] = useState<UsuarioNivelDisciplina[]>([]);
  const [disciplinasConNiveles, setDisciplinasConNiveles] = useState<AsignarNivelView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userLevels, disciplines] = await Promise.all([
        usuarioNivelDisciplinaService.getUsuarioNivelesDisciplina(usuarioId, tenantId),
        disciplinesService.listDisciplinesByTenant(tenantId),
      ]);

      setAsignaciones(userLevels);

      // For each discipline, fetch its active levels
      const views: AsignarNivelView[] = [];
      for (const disc of disciplines) {
        const niveles = await nivelDisciplinaService.getNivelesDisciplina(tenantId, disc.id);
        const activeNiveles = niveles.filter((n) => n.activo);
        if (activeNiveles.length === 0) continue;

        const currentAssignment = userLevels.find((ul) => ul.disciplina_id === disc.id);
        views.push({
          disciplina_id: disc.id,
          disciplina_nombre: disc.nombre,
          niveles: activeNiveles.map((n) => ({ id: n.id, nombre: n.nombre, orden: n.orden })),
          nivel_actual_id: currentAssignment?.nivel_id ?? null,
        });
      }

      setDisciplinasConNiveles(views);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos de niveles.');
    } finally {
      setLoading(false);
    }
  }, [usuarioId, tenantId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const asignarNivel = useCallback(async (input: UsuarioNivelDisciplinaInput): Promise<boolean> => {
    setError(null);
    setSuccessMessage(null);
    try {
      await usuarioNivelDisciplinaService.upsertUsuarioNivelDisciplina(input);
      setSuccessMessage('Nivel asignado exitosamente.');
      await loadData();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar nivel.');
      return false;
    }
  }, [loadData]);

  return {
    asignaciones,
    disciplinasConNiveles,
    loading,
    error,
    successMessage,
    asignarNivel,
  };
}
