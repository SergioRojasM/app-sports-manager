'use client';

import { useCallback, useState } from 'react';
import type { ReglaSuspension } from '@/types/portal/reglas-suspension.types';
import type { MiembroTableItem } from '@/types/portal/equipo.types';
import { useConfigurarSuspension } from '@/hooks/portal/gestion-equipo/useConfigurarSuspension';

type ConfigurarSuspensionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  rules: ReglaSuspension[];
  members: MiembroTableItem[];
  tenantId: string;
  onSuccess: () => void;
};

function getRuleSummary(rule: ReglaSuspension): string {
  const parts: string[] = [];
  parts.push(`Máx. ${rule.num_inasistencias} inasistencia${rule.num_inasistencias > 1 ? 's' : ''}`);
  if (rule.por_suscripcion) {
    parts.push('Por suscripción');
  } else if (rule.por_dias_atras > 0) {
    parts.push(`Últimos ${rule.por_dias_atras} días`);
  }
  if (rule.duracion > 0) {
    parts.push(`Duración: ${rule.duracion} día${rule.duracion > 1 ? 's' : ''}`);
  } else {
    parts.push('Permanente');
  }
  return parts.join(' · ');
}

export function ConfigurarSuspensionModal({
  isOpen,
  onClose,
  rules,
  members,
  tenantId,
  onSuccess,
}: ConfigurarSuspensionModalProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hook = useConfigurarSuspension({
    members,
    tenantId,
    onSuccess: () => {
      const count = hook.selectedMiembroIds.size;
      const isRemoval = !hook.hasSelection || hook.selectedReglaId === null;
      const msg = isRemoval
        ? `Regla removida de ${count} miembro(s)`
        : `Regla aplicada a ${count} miembro(s)`;
      setSuccessMessage(msg);
      setErrorMessage(null);
      onSuccess();
      handleClose();
    },
  });

  const handleClose = useCallback(() => {
    hook.reset();
    setSuccessMessage(null);
    setErrorMessage(null);
    onClose();
  }, [hook, onClose]);

  const handleSubmit = useCallback(async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await hook.submit();
    } catch {
      setErrorMessage('Ocurrió un error al asignar la regla. Intenta de nuevo.');
    }
  }, [hook]);

  const handleSelectRule = useCallback(
    (reglaId: string | null) => {
      hook.setSelectedReglaId(reglaId);
      hook.setHasSelection(true);
    },
    [hook],
  );

  if (!isOpen) return null;

  const activeRules = rules.filter((r) => r.activo);
  const allFilteredSelected =
    hook.filteredMembers.length > 0 &&
    hook.filteredMembers.every((m) => hook.selectedMiembroIds.has(m.miembro_id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-grit-2xl border border-grit-glass-border bg-grit-bg shadow-xl">
        {/* ── Step 1: Select rule ── */}
        {hook.step === 1 ? (
          <div className="flex flex-col p-6">
            <h2 className="font-grit-title mb-4 text-center text-lg font-semibold text-grit-text">
              Configurar Suspensión
            </h2>

            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-grit-subtext">
                Selecciona una regla de suspensión
              </legend>

              {/* Quitar regla option */}
              <label
                className={[
                  'flex cursor-pointer items-center gap-3 rounded-grit-md border p-3 transition',
                  hook.hasSelection && hook.selectedReglaId === null
                    ? 'border-grit-cyan/50 bg-grit-cyan/10'
                    : 'border-grit-glass-border hover:border-grit-glass-border',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="regla-suspension"
                  checked={hook.hasSelection && hook.selectedReglaId === null}
                  onChange={() => handleSelectRule(null)}
                  className="accent-grit-cyan"
                />
                <div>
                  <p className="text-sm font-medium text-grit-text">Quitar regla</p>
                  <p className="text-xs text-grit-subtext">Remueve la regla asignada a los miembros seleccionados</p>
                </div>
              </label>

              {/* Rule options */}
              {activeRules.map((rule) => (
                <label
                  key={rule.id}
                  className={[
                    'flex cursor-pointer items-center gap-3 rounded-grit-md border p-3 transition',
                    hook.selectedReglaId === rule.id
                      ? 'border-grit-cyan/50 bg-grit-cyan/10'
                      : 'border-grit-glass-border hover:border-grit-glass-border',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="regla-suspension"
                    checked={hook.selectedReglaId === rule.id}
                    onChange={() => handleSelectRule(rule.id)}
                    className="accent-grit-cyan"
                  />
                  <div>
                    <p className="text-sm font-medium text-grit-text">{rule.nombre}</p>
                    <p className="text-xs text-grit-subtext">{getRuleSummary(rule)}</p>
                  </div>
                </label>
              ))}
            </fieldset>

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm font-semibold text-grit-subtext transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={hook.goToStep2}
                disabled={!hook.hasSelection}
                className="rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-bold text-grit-bg transition hover:bg-grit-cyan/90 disabled:opacity-50"
              >
                Siguiente →
              </button>
            </div>
          </div>
        ) : null}

        {/* ── Step 2: Select members ── */}
        {hook.step === 2 ? (
          <div className="flex flex-col overflow-hidden p-6">
            <h2 className="font-grit-title mb-4 text-center text-lg font-semibold text-grit-text">
              Seleccionar Miembros
            </h2>

            {/* Search */}
            <div className="mb-3">
              <input
                type="text"
                value={hook.filterTerm}
                onChange={(e) => hook.setFilterTerm(e.target.value)}
                placeholder="Buscar por nombre o correo…"
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text placeholder:text-grit-muted outline-none focus:border-grit-cyan/50"
              />
            </div>

            {/* Select all / deselect all */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={allFilteredSelected ? hook.deselectAll : hook.selectAll}
                className="text-xs font-medium text-grit-cyan transition hover:text-grit-cyan/80"
              >
                {allFilteredSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
              <span className="text-xs text-grit-subtext">
                {hook.selectedMiembroIds.size} seleccionado(s)
              </span>
            </div>

            {/* Member list */}
            <div className="flex-1 overflow-y-auto rounded-grit-md border border-grit-glass-border" style={{ maxHeight: '40vh' }}>
              {hook.filteredMembers.length === 0 ? (
                <p className="p-4 text-center text-sm text-grit-subtext">No se encontraron miembros</p>
              ) : (
                <ul className="divide-y divide-grit-glass-border">
                  {hook.filteredMembers.map((m) => (
                    <li key={m.miembro_id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={hook.selectedMiembroIds.has(m.miembro_id)}
                          onChange={() => hook.toggleMiembro(m.miembro_id)}
                          className="accent-grit-cyan"
                        />
                        {/* Avatar */}
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-grit-card text-xs font-bold text-grit-subtext">
                          {m.foto_url ? (
                            <img
                              src={m.foto_url}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            (m.nombre?.[0] ?? '').toUpperCase()
                          )}
                        </div>
                        {/* Name + rule badge */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-grit-text">
                            {m.fullName}
                          </p>
                          <p className="truncate text-xs text-grit-subtext">{m.email}</p>
                        </div>
                        {m.regla_suspension_nombre ? (
                          <span className="shrink-0 rounded-full bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                            {m.regla_suspension_nombre}
                          </span>
                        ) : null}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Error */}
            {errorMessage ? (
              <div className="mt-3 rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 p-3">
                <p className="text-xs text-grit-danger">{errorMessage}</p>
              </div>
            ) : null}

            {/* Success */}
            {successMessage ? (
              <div className="mt-3 rounded-grit-md border border-emerald-400/25 bg-emerald-900/20 p-3">
                <p className="text-xs text-emerald-200">{successMessage}</p>
              </div>
            ) : null}

            {/* Footer */}
            <div className="mt-4 flex justify-between">
              <button
                type="button"
                onClick={hook.goBackToStep1}
                disabled={hook.isSubmitting}
                className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm font-semibold text-grit-subtext transition hover:bg-white/5 disabled:opacity-50"
              >
                ← Atrás
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={hook.selectedMiembroIds.size === 0 || hook.isSubmitting}
                className="rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-bold text-grit-bg transition hover:bg-grit-cyan/90 disabled:opacity-50"
              >
                {hook.isSubmitting
                  ? 'Aplicando…'
                  : `Aplicar (${hook.selectedMiembroIds.size} seleccionados)`}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
