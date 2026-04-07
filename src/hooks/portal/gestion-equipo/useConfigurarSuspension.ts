'use client';

import { useCallback, useMemo, useState } from 'react';
import { equipoService } from '@/services/supabase/portal/equipo.service';
import type { MiembroTableItem } from '@/types/portal/equipo.types';

type UseConfigurarSuspensionOptions = {
  members: MiembroTableItem[];
  tenantId: string;
  onSuccess: () => void;
};

type UseConfigurarSuspensionResult = {
  step: 1 | 2;
  selectedReglaId: string | null;
  hasSelection: boolean;
  selectedMiembroIds: Set<string>;
  filterTerm: string;
  setFilterTerm: (v: string) => void;
  filteredMembers: MiembroTableItem[];
  isSubmitting: boolean;
  setSelectedReglaId: (id: string | null) => void;
  setHasSelection: (v: boolean) => void;
  goToStep2: () => void;
  goBackToStep1: () => void;
  toggleMiembro: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  submit: () => Promise<void>;
  reset: () => void;
};

export function useConfigurarSuspension({
  members,
  tenantId,
  onSuccess,
}: UseConfigurarSuspensionOptions): UseConfigurarSuspensionResult {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedReglaId, setSelectedReglaId] = useState<string | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const [selectedMiembroIds, setSelectedMiembroIds] = useState<Set<string>>(new Set());
  const [filterTerm, setFilterTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredMembers = useMemo(() => {
    if (!filterTerm.trim()) return members;
    const lower = filterTerm.toLowerCase();
    return members.filter(
      (m) =>
        m.fullName.toLowerCase().includes(lower) ||
        m.email.toLowerCase().includes(lower),
    );
  }, [members, filterTerm]);

  const goToStep2 = useCallback(() => setStep(2), []);

  const goBackToStep1 = useCallback(() => setStep(1), []);

  const toggleMiembro = useCallback((id: string) => {
    setSelectedMiembroIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedMiembroIds((prev) => {
      const next = new Set(prev);
      for (const m of filteredMembers) {
        next.add(m.miembro_id);
      }
      return next;
    });
  }, [filteredMembers]);

  const deselectAll = useCallback(() => {
    setSelectedMiembroIds(new Set());
  }, []);

  const submit = useCallback(async () => {
    if (selectedMiembroIds.size === 0) return;
    setIsSubmitting(true);
    try {
      await equipoService.asignarReglaSuspension({
        tenantId,
        reglaId: selectedReglaId,
        miembroIds: Array.from(selectedMiembroIds),
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  }, [tenantId, selectedReglaId, selectedMiembroIds, onSuccess]);

  const reset = useCallback(() => {
    setStep(1);
    setSelectedReglaId(null);
    setHasSelection(false);
    setSelectedMiembroIds(new Set());
    setFilterTerm('');
    setIsSubmitting(false);
  }, []);

  return {
    step,
    selectedReglaId,
    hasSelection,
    selectedMiembroIds,
    filterTerm,
    setFilterTerm,
    filteredMembers,
    isSubmitting,
    setSelectedReglaId,
    setHasSelection,
    goToStep2,
    goBackToStep1,
    toggleMiembro,
    selectAll,
    deselectAll,
    submit,
    reset,
  };
}
