'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/services/supabase/client';
import { disciplinesService } from '@/services/supabase/portal/disciplines.service';
import { nivelDisciplinaService } from '@/services/supabase/portal/nivel-disciplina.service';
import {
  usuarioNivelDisciplinaService,
  type AtletasPorNivel,
} from '@/services/supabase/portal/usuario-nivel-disciplina.service';
import { coincideBusqueda } from '@/lib/portal/admin-catalogo.utils';
import { useDisciplineForm } from './useDisciplineForm';
import {
  DisciplineServiceError,
  type CreateDisciplineInput,
  type Discipline,
  type UpdateDisciplineInput,
} from '@/types/portal/disciplines.types';

export type DisciplineStatusFilter = 'activas' | 'todas';

type UseDisciplinesOptions = {
  tenantId: string;
};

function mapServiceErrorToMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof DisciplineServiceError) {
    return error.message;
  }
  return fallbackMessage;
}

/**
 * Disciplines workspace (`fXuVP`): the tenant's disciplines with an "Activas / Todas" filter and
 * search, the selected discipline mirrored in `?disciplina=`, derived counts (active levels and
 * athletes with a level, each failure-isolated), the create / edit drawer state and the delete flow.
 */
export function useDisciplines({ tenantId }: UseDisciplinesOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedParam = searchParams.get('disciplina');

  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DisciplineStatusFilter>('activas');
  const [nivelesActivos, setNivelesActivos] = useState<Record<string, number> | null>(null);
  const [atletas, setAtletas] = useState<AtletasPorNivel | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Discipline | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const form = useDisciplineForm();

  const supabase = useMemo(() => createClient(), []);

  /** Active levels per discipline and athletes per level; a failure leaves that count null ("—"). */
  const loadConteos = useCallback(async () => {
    const [niveles, conteoAtletas] = await Promise.allSettled([
      nivelDisciplinaService.listNivelesByTenant(tenantId),
      usuarioNivelDisciplinaService.countAtletasPorNivel(tenantId),
    ]);
    if (niveles.status === 'fulfilled') {
      const porDisciplina: Record<string, number> = {};
      for (const nivel of niveles.value) {
        if (nivel.activo) porDisciplina[nivel.disciplina_id] = (porDisciplina[nivel.disciplina_id] ?? 0) + 1;
      }
      setNivelesActivos(porDisciplina);
    } else {
      console.error('[useDisciplines] niveles', niveles.reason);
      setNivelesActivos(null);
    }
    if (conteoAtletas.status === 'fulfilled') {
      setAtletas(conteoAtletas.value);
    } else {
      console.error('[useDisciplines] atletas', conteoAtletas.reason);
      setAtletas(null);
    }
  }, [tenantId]);

  const loadDisciplines = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No active session');
      }

      const [payload] = await Promise.all([disciplinesService.listDisciplinesByTenant(tenantId), loadConteos()]);
      setDisciplines(payload);
    } catch {
      setDisciplines([]);
      setError('No fue posible cargar las disciplinas de la organización.');
    } finally {
      setLoading(false);
    }
  }, [supabase, tenantId, loadConteos]);

  useEffect(() => {
    void loadDisciplines();
  }, [loadDisciplines]);

  const filteredDisciplines = useMemo(
    () =>
      disciplines
        .filter((d) => (statusFilter === 'todas' || d.activo) && coincideBusqueda(searchTerm, [d.nombre, d.descripcion]))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [disciplines, searchTerm, statusFilter],
  );

  // Selection: the `?disciplina=` id when it is listed, else the first listed discipline
  const activeDiscipline = useMemo(
    () => filteredDisciplines.find((d) => d.id === selectedParam) ?? filteredDisciplines[0] ?? null,
    [filteredDisciplines, selectedParam],
  );

  const replaceSelection = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('disciplina', id);
      else params.delete('disciplina');
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Keep the URL in sync when the parameter is missing, unknown or filtered out
  useEffect(() => {
    if (loading) return;
    const expected = activeDiscipline?.id ?? null;
    if (expected !== selectedParam) replaceSelection(expected);
  }, [activeDiscipline, loading, replaceSelection, selectedParam]);

  const selectDiscipline = useCallback((id: string) => replaceSelection(id), [replaceSelection]);

  const openCreateModal = useCallback(() => {
    setModalMode('create');
    setSelectedDiscipline(null);
    form.resetForm();
    setModalOpen(true);
    setSuccessMessage(null);
    setSubmitError(null);
  }, [form]);

  const openEditModal = useCallback((discipline: Discipline) => {
    setModalMode('edit');
    setSelectedDiscipline(discipline);
    form.setFormFromDiscipline(discipline);
    setModalOpen(true);
    setSuccessMessage(null);
    setSubmitError(null);
  }, [form]);

  const closeModal = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    setModalOpen(false);
    setSubmitError(null);
  }, [isSubmitting]);

  const requestDelete = useCallback((discipline: Discipline) => {
    setDeleteError(null);
    setSuccessMessage(null);
    setDeleteTarget(discipline);
  }, []);

  const cancelDelete = useCallback(() => {
    if (isDeleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await disciplinesService.deleteDiscipline(deleteTarget.id, tenantId);
      setDeleteTarget(null);
      // The selection falls back to the next listed discipline through the URL sync above
      await loadDisciplines();
      setSuccessMessage('Disciplina eliminada correctamente.');
    } catch (caughtError) {
      setDeleteError(
        mapServiceErrorToMessage(caughtError, 'No fue posible eliminar la disciplina. Inténtalo nuevamente.'),
      );
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, loadDisciplines, tenantId]);

  const submit = useCallback(async () => {
    setSubmitError(null);
    setSuccessMessage(null);

    const validation = form.validate(form.formValues);
    if (!validation.valid) {
      return false;
    }

    setIsSubmitting(true);

    try {
      let savedId: string | null = selectedDiscipline?.id ?? null;
      if (modalMode === 'create') {
        const payload: CreateDisciplineInput = {
          tenantId,
          nombre: form.formValues.nombre.trim(),
          descripcion: form.formValues.descripcion.trim(),
          activo: form.formValues.activo,
        };

        const created = await disciplinesService.createDiscipline(payload);
        savedId = created.id;
      }

      if (modalMode === 'edit' && selectedDiscipline) {
        const payload: UpdateDisciplineInput = {
          tenantId,
          nombre: form.formValues.nombre.trim(),
          descripcion: form.formValues.descripcion.trim(),
          activo: form.formValues.activo,
        };

        await disciplinesService.updateDiscipline(selectedDiscipline.id, payload);
      }

      await loadDisciplines();
      if (modalMode === 'create' && savedId) {
        // Show the new discipline even if the "Activas" filter would hide an inactive one
        if (!form.formValues.activo) setStatusFilter('todas');
        replaceSelection(savedId);
      }
      setSuccessMessage(
        modalMode === 'create'
          ? 'Disciplina creada correctamente.'
          : 'Disciplina actualizada correctamente.',
      );
      setModalOpen(false);
      return true;
    } catch (caughtError) {
      setSubmitError(
        mapServiceErrorToMessage(caughtError, 'No fue posible guardar la disciplina. Inténtalo nuevamente.'),
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [form, loadDisciplines, modalMode, replaceSelection, selectedDiscipline, tenantId]);

  const counts = useMemo(
    () => ({
      activas: disciplines.filter((d) => d.activo).length,
      todas: disciplines.length,
    }),
    [disciplines],
  );

  return {
    disciplines,
    filteredDisciplines,
    counts,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    activeDiscipline,
    selectDiscipline,
    /** Active levels per discipline id; null when the count failed. */
    nivelesActivos,
    /** Athletes with a level per discipline / per level; null when the count failed. */
    atletas,
    reloadConteos: loadConteos,
    modalOpen,
    modalMode,
    selectedDiscipline,
    submitError,
    successMessage,
    dismissSuccess: () => setSuccessMessage(null),
    isSubmitting,
    formValues: form.formValues,
    fieldErrors: form.fieldErrors,
    openCreateModal,
    openEditModal,
    closeModal,
    updateField: form.updateField,
    submit,
    refresh: loadDisciplines,
    deleteTarget,
    isDeleting,
    deleteError,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
