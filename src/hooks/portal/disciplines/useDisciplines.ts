'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { disciplinesService } from '@/services/supabase/portal/disciplines.service';
import { useDisciplineForm } from './useDisciplineForm';
import {
  DisciplineServiceError,
  type CreateDisciplineInput,
  type Discipline,
  type DisciplineTableItem,
  type DisciplinesViewModel,
  type UpdateDisciplineInput,
} from '@/types/portal/disciplines.types';

type UseDisciplinesOptions = {
  tenantId: string;
};

type UseDisciplinesResult = DisciplinesViewModel & {
  isSubmitting: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  formValues: ReturnType<typeof useDisciplineForm>['formValues'];
  fieldErrors: ReturnType<typeof useDisciplineForm>['fieldErrors'];
  openCreateModal: () => void;
  openEditModal: (discipline: Discipline) => void;
  deleteDiscipline: (discipline: Discipline) => Promise<void>;
  closeModal: () => void;
  updateField: (field: 'nombre' | 'descripcion' | 'activo', value: string | boolean) => void;
  submit: () => Promise<boolean>;
  refresh: () => Promise<void>;
};

function buildCategory(discipline: Discipline): string {
  const value = `${discipline.nombre} ${discipline.descripcion ?? ''}`.toLowerCase();
  if (value.includes('team') || value.includes('equipo') || value.includes('fútbol') || value.includes('basket')) {
    return 'Team';
  }
  if (value.includes('individual') || value.includes('tennis') || value.includes('natación')) {
    return 'Individual';
  }
  return 'General';
}

function toTableItem(discipline: Discipline): DisciplineTableItem {
  const status = discipline.activo ? 'active' : 'inactive';
  return {
    ...discipline,
    categoria: buildCategory(discipline),
    status,
    statusLabel: status === 'active' ? 'Active' : 'Inactive',
  };
}

function mapServiceErrorToMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof DisciplineServiceError) {
    return error.message;
  }
  return fallbackMessage;
}

export function useDisciplines({ tenantId }: UseDisciplinesOptions): UseDisciplinesResult {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useDisciplineForm();

  const supabase = useMemo(() => createClient(), []);

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

      const payload = await disciplinesService.listDisciplinesByTenant(tenantId);
      setDisciplines(payload);
    } catch {
      setDisciplines([]);
      setError('No fue posible cargar las disciplinas de la organización.');
    } finally {
      setLoading(false);
    }
  }, [supabase, tenantId]);

  useEffect(() => {
    let mounted = true;

    const execute = async () => {
      if (!mounted) return;
      await loadDisciplines();
    };

    void execute();

    return () => {
      mounted = false;
    };
  }, [loadDisciplines]);

  const filteredDisciplines = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const rows = disciplines.map(toTableItem);

    if (!normalizedSearch) {
      return rows;
    }

    return rows.filter((discipline) => {
      const haystack = [discipline.nombre, discipline.descripcion ?? '', discipline.categoria]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [disciplines, searchTerm]);

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

  const deleteDiscipline = useCallback(
    async (discipline: Discipline) => {
      const shouldDelete = window.confirm(
        `¿Seguro que quieres eliminar la disciplina "${discipline.nombre}"? Esta acción no se puede deshacer.`,
      );

      if (!shouldDelete) {
        return;
      }

      setSubmitError(null);
      setSuccessMessage(null);

      try {
        await disciplinesService.deleteDiscipline(discipline.id, tenantId);

        if (selectedDiscipline?.id === discipline.id) {
          setModalOpen(false);
          setSelectedDiscipline(null);
        }

        await loadDisciplines();
        setSuccessMessage('Disciplina eliminada correctamente.');
      } catch (caughtError) {
        setSubmitError(
          mapServiceErrorToMessage(caughtError, 'No fue posible eliminar la disciplina. Inténtalo nuevamente.'),
        );
      }
    },
    [loadDisciplines, selectedDiscipline?.id, tenantId],
  );

  const submit = useCallback(async () => {
    setSubmitError(null);
    setSuccessMessage(null);

    const validation = form.validate(form.formValues);
    if (!validation.valid) {
      return false;
    }

    setIsSubmitting(true);

    try {
      if (modalMode === 'create') {
        const payload: CreateDisciplineInput = {
          tenantId,
          nombre: form.formValues.nombre.trim(),
          descripcion: form.formValues.descripcion.trim(),
          activo: form.formValues.activo,
        };

        await disciplinesService.createDiscipline(payload);
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
  }, [form, loadDisciplines, modalMode, selectedDiscipline, tenantId]);

  return {
    disciplines,
    filteredDisciplines,
    loading,
    error,
    modalOpen,
    modalMode,
    selectedDiscipline,
    submitError,
    successMessage,
    isSubmitting,
    searchTerm,
    setSearchTerm,
    formValues: form.formValues,
    fieldErrors: form.fieldErrors,
    openCreateModal,
    openEditModal,
    deleteDiscipline,
    closeModal,
    updateField: form.updateField,
    submit,
    refresh: loadDisciplines,
  };
}