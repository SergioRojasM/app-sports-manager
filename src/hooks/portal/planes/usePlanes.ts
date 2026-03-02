'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { planesService } from '@/services/supabase/portal/planes.service';
import { disciplinesService } from '@/services/supabase/portal/disciplines.service';
import { usePlanForm } from './usePlanForm';
import type { Discipline } from '@/types/portal/disciplines.types';
import {
  PlanServiceError,
  type CreatePlanInput,
  type PlanWithDisciplinas,
  type PlanTableItem,
  type PlanesViewModel,
  type UpdatePlanInput,
} from '@/types/portal/planes.types';

type UsePlanesOptions = {
  tenantId: string;
};

type UsePlanesResult = PlanesViewModel & {
  disciplines: Discipline[];
  isSubmitting: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  formValues: ReturnType<typeof usePlanForm>['formValues'];
  fieldErrors: ReturnType<typeof usePlanForm>['fieldErrors'];
  openCreateModal: () => void;
  openEditModal: (plan: PlanWithDisciplinas) => void;
  deletePlan: (plan: PlanWithDisciplinas) => Promise<void>;
  closeModal: () => void;
  updateField: ReturnType<typeof usePlanForm>['updateField'];
  submit: () => Promise<boolean>;
  refresh: () => Promise<void>;
};

function toTableItem(plan: PlanWithDisciplinas, allDisciplines: Discipline[]): PlanTableItem {
  const status = plan.activo ? 'Active' : 'Inactive';
  const vigencia = plan.vigencia_meses === 1 ? '1 mes' : `${plan.vigencia_meses} meses`;

  const disciplinaNames = plan.disciplinas
    .map((id) => allDisciplines.find((d) => d.id === id)?.nombre)
    .filter((name): name is string => Boolean(name));

  return {
    ...plan,
    statusLabel: status,
    vigenciaLabel: vigencia,
    disciplinaNames,
  };
}

function mapServiceErrorToMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof PlanServiceError) {
    return error.message;
  }
  return fallbackMessage;
}

export function usePlanes({ tenantId }: UsePlanesOptions): UsePlanesResult {
  const [planes, setPlanes] = useState<PlanWithDisciplinas[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPlan, setSelectedPlan] = useState<PlanWithDisciplinas | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = usePlanForm();

  const supabase = useMemo(() => createClient(), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No active session');
      }

      const [planesData, disciplinesData] = await Promise.all([
        planesService.getPlanes(tenantId),
        disciplinesService.listDisciplinesByTenant(tenantId),
      ]);

      setPlanes(planesData);
      setDisciplines(disciplinesData);
    } catch {
      setPlanes([]);
      setDisciplines([]);
      setError('No fue posible cargar los planes de la organización.');
    } finally {
      setLoading(false);
    }
  }, [supabase, tenantId]);

  useEffect(() => {
    let mounted = true;

    const execute = async () => {
      if (!mounted) return;
      await loadData();
    };

    void execute();

    return () => {
      mounted = false;
    };
  }, [loadData]);

  const filteredPlanes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const rows = planes.map((plan) => toTableItem(plan, disciplines));

    if (!normalizedSearch) {
      return rows;
    }

    return rows.filter((plan) => {
      const haystack = [plan.nombre, plan.descripcion ?? '', ...plan.disciplinaNames]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [planes, disciplines, searchTerm]);

  const openCreateModal = useCallback(() => {
    setModalMode('create');
    setSelectedPlan(null);
    form.resetForm();
    setModalOpen(true);
    setSuccessMessage(null);
    setSubmitError(null);
  }, [form]);

  const openEditModal = useCallback((plan: PlanWithDisciplinas) => {
    setModalMode('edit');
    setSelectedPlan(plan);
    form.setFormFromPlan(plan);
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

  const deletePlan = useCallback(
    async (plan: PlanWithDisciplinas) => {
      const shouldDelete = window.confirm(
        `¿Seguro que quieres eliminar el plan "${plan.nombre}"? Esta acción no se puede deshacer.`,
      );

      if (!shouldDelete) {
        return;
      }

      setSubmitError(null);
      setSuccessMessage(null);

      try {
        await planesService.deletePlan(plan.id, tenantId);

        if (selectedPlan?.id === plan.id) {
          setModalOpen(false);
          setSelectedPlan(null);
        }

        await loadData();
        setSuccessMessage('Plan eliminado correctamente.');
      } catch (caughtError) {
        setSubmitError(
          mapServiceErrorToMessage(caughtError, 'No fue posible eliminar el plan. Inténtalo nuevamente.'),
        );
      }
    },
    [loadData, selectedPlan?.id, tenantId],
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
        const payload: CreatePlanInput = {
          tenantId,
          nombre: form.formValues.nombre.trim(),
          descripcion: form.formValues.descripcion.trim(),
          precio: parseFloat(form.formValues.precio),
          vigencia_meses: parseInt(form.formValues.vigencia_meses, 10),
          clases_incluidas: form.formValues.clases_incluidas.trim() !== '' ? parseInt(form.formValues.clases_incluidas, 10) : null,
          tipo: form.formValues.tipo || null,
          beneficios: form.formValues.beneficios.length > 0 ? form.formValues.beneficios.join('|') : null,
          activo: form.formValues.activo,
          disciplinaIds: form.formValues.disciplinaIds,
        };

        await planesService.createPlan(payload);
      }

      if (modalMode === 'edit' && selectedPlan) {
        const payload: UpdatePlanInput = {
          tenantId,
          planId: selectedPlan.id,
          nombre: form.formValues.nombre.trim(),
          descripcion: form.formValues.descripcion.trim(),
          precio: parseFloat(form.formValues.precio),
          vigencia_meses: parseInt(form.formValues.vigencia_meses, 10),
          clases_incluidas: form.formValues.clases_incluidas.trim() !== '' ? parseInt(form.formValues.clases_incluidas, 10) : null,
          tipo: form.formValues.tipo || null,
          beneficios: form.formValues.beneficios.length > 0 ? form.formValues.beneficios.join('|') : null,
          activo: form.formValues.activo,
          disciplinaIds: form.formValues.disciplinaIds,
        };

        await planesService.updatePlan(payload);
      }

      await loadData();
      setSuccessMessage(
        modalMode === 'create'
          ? 'Plan creado correctamente.'
          : 'Plan actualizado correctamente.',
      );
      setModalOpen(false);
      return true;
    } catch (caughtError) {
      setSubmitError(
        mapServiceErrorToMessage(caughtError, 'No fue posible guardar el plan. Inténtalo nuevamente.'),
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [form, loadData, modalMode, selectedPlan, tenantId]);

  return {
    planes,
    filteredPlanes,
    disciplines,
    loading,
    error,
    modalOpen,
    modalMode,
    selectedPlan,
    submitError,
    successMessage,
    isSubmitting,
    searchTerm,
    setSearchTerm,
    formValues: form.formValues,
    fieldErrors: form.fieldErrors,
    openCreateModal,
    openEditModal,
    deletePlan,
    closeModal,
    updateField: form.updateField,
    submit,
    refresh: loadData,
  };
}
