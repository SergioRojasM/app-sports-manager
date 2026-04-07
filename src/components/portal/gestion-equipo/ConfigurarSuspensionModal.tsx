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
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-portal-border bg-navy-deep shadow-xl">
        {/* ── Step 1: Select rule ── */}
        {hook.step === 1 ? (
          <div className="flex flex-col p-6">
            <h2 className="mb-4 text-center text-lg font-semibold text-slate-100">
              Configurar Suspensión
            </h2>

            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-slate-300">
                Selecciona una regla de suspensión
              </legend>

              {/* Quitar regla option */}
              <label
                className={[
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition',
                  hook.hasSelection && hook.selectedReglaId === null
                    ? 'border-turquoise/50 bg-turquoise/10'
                    : 'border-portal-border hover:border-slate-500',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="regla-suspension"
                  checked={hook.hasSelection && hook.selectedReglaId === null}
                  onChange={() => handleSelectRule(null)}
                  className="accent-turquoise"
                />
                <div>
                  <p className="text-sm font-medium text-slate-200">Quitar regla</p>
                  <p className="text-xs text-slate-400">Remueve la regla asignada a los miembros seleccionados</p>
                </div>
              </label>

              {/* Rule options */}
              {activeRules.map((rule) => (
                <label
                  key={rule.id}
                  className={[
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition',
                    hook.selectedReglaId === rule.id
                      ? 'border-turquoise/50 bg-turquoise/10'
                      : 'border-portal-border hover:border-slate-500',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="regla-suspension"
                    checked={hook.selectedReglaId === rule.id}
                    onChange={() => handleSelectRule(rule.id)}
                    className="accent-turquoise"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{rule.nombre}</p>
                    <p className="text-xs text-slate-400">{getRuleSummary(rule)}</p>
                  </div>
                </label>
              ))}
            </fieldset>

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-portal-border px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={hook.goToStep2}
                disabled={!hook.hasSelection}
                className="rounded-lg bg-turquoise px-4 py-2 text-sm font-bold text-navy-deep transition hover:bg-turquoise/90 disabled:opacity-50"
              >
                Siguiente →
              </button>
            </div>
          </div>
        ) : null}

        {/* ── Step 2: Select members ── */}
        {hook.step === 2 ? (
          <div className="flex flex-col overflow-hidden p-6">
            <h2 className="mb-4 text-center text-lg font-semibold text-slate-100">
              Seleccionar Miembros
            </h2>

            {/* Search */}
            <div className="mb-3">
              <input
                type="text"
                value={hook.filterTerm}
                onChange={(e) => hook.setFilterTerm(e.target.value)}
                placeholder="Buscar por nombre o correo…"
                className="w-full rounded-lg border border-portal-border bg-navy-medium px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-turquoise/50"
              />
            </div>

            {/* Select all / deselect all */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={allFilteredSelected ? hook.deselectAll : hook.selectAll}
                className="text-xs font-medium text-turquoise transition hover:text-turquoise/80"
              >
                {allFilteredSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
              <span className="text-xs text-slate-400">
                {hook.selectedMiembroIds.size} seleccionado(s)
              </span>
            </div>

            {/* Member list */}
            <div className="flex-1 overflow-y-auto rounded-lg border border-portal-border" style={{ maxHeight: '40vh' }}>
              {hook.filteredMembers.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-400">No se encontraron miembros</p>
              ) : (
                <ul className="divide-y divide-portal-border">
                  {hook.filteredMembers.map((m) => (
                    <li key={m.miembro_id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={hook.selectedMiembroIds.has(m.miembro_id)}
                          onChange={() => hook.toggleMiembro(m.miembro_id)}
                          className="accent-turquoise"
                        />
                        {/* Avatar */}
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-soft text-xs font-bold text-slate-300">
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
                          <p className="truncate text-sm font-medium text-slate-200">
                            {m.fullName}
                          </p>
                          <p className="truncate text-xs text-slate-400">{m.email}</p>
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
              <div className="mt-3 rounded-lg border border-rose-400/25 bg-rose-900/20 p-3">
                <p className="text-xs text-rose-200">{errorMessage}</p>
              </div>
            ) : null}

            {/* Success */}
            {successMessage ? (
              <div className="mt-3 rounded-lg border border-emerald-400/25 bg-emerald-900/20 p-3">
                <p className="text-xs text-emerald-200">{successMessage}</p>
              </div>
            ) : null}

            {/* Footer */}
            <div className="mt-4 flex justify-between">
              <button
                type="button"
                onClick={hook.goBackToStep1}
                disabled={hook.isSubmitting}
                className="rounded-lg border border-portal-border px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
              >
                ← Atrás
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={hook.selectedMiembroIds.size === 0 || hook.isSubmitting}
                className="rounded-lg bg-turquoise px-4 py-2 text-sm font-bold text-navy-deep transition hover:bg-turquoise/90 disabled:opacity-50"
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
