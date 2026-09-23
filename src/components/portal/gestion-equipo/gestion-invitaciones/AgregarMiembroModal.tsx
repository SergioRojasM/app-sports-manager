'use client';

import { useMemo, useState } from 'react';
import type { RolOption } from '@/types/portal/equipo.types';
import type { AgregarMiembroInput, AgregarMiembroModo } from '@/types/portal/invitaciones.types';

const ROL_DISPLAY_LABELS: Record<string, string> = {
  usuario: 'Atleta',
  administrador: 'Administrador',
  entrenador: 'Entrenador',
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const NOTA_MAX = 500;

type AgregarMiembroModalProps = {
  isOpen: boolean;
  roles: RolOption[];
  activeMemberEmails: ReadonlySet<string>;
  provisioningEnabled: boolean;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (modo: AgregarMiembroModo, input: AgregarMiembroInput) => Promise<boolean>;
  onClose: () => void;
};

const inputClasses =
  'w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text placeholder:text-grit-muted outline-none focus:border-grit-cyan/50';

export function AgregarMiembroModal({
  isOpen,
  roles,
  activeMemberEmails,
  provisioningEnabled,
  isSubmitting,
  error,
  onSubmit,
  onClose,
}: AgregarMiembroModalProps) {
  const [email, setEmail] = useState('');
  const [rolId, setRolId] = useState('');
  const [nombre, setNombre] = useState('');
  const [nota, setNota] = useState('');
  const [modo, setModo] = useState<AgregarMiembroModo>('invitacion');

  const normalizedEmail = email.trim().toLowerCase();
  const emailValid = EMAIL_RE.test(normalizedEmail);
  const isActiveMember = emailValid && activeMemberEmails.has(normalizedEmail);
  const effectiveModo: AgregarMiembroModo = provisioningEnabled ? modo : 'invitacion';
  const canSubmit = emailValid && rolId !== '' && !isSubmitting;

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => (ROL_DISPLAY_LABELS[a.nombre] ?? a.nombre).localeCompare(ROL_DISPLAY_LABELS[b.nombre] ?? b.nombre)),
    [roles],
  );

  function resetForm() {
    setEmail('');
    setRolId('');
    setNombre('');
    setNota('');
    setModo('invitacion');
  }

  function handleClose() {
    if (isSubmitting) return;
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    const ok = await onSubmit(effectiveModo, {
      email: normalizedEmail,
      rol_id: rolId,
      nombre: nombre.trim() || undefined,
      nota: nota.trim() || undefined,
    });
    if (ok) resetForm();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="agregar-miembro-title">
      <div className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-grit-2xl border border-grit-glass-border bg-grit-bg p-6 shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-grit-cyan/15">
          <span className="material-symbols-outlined text-2xl text-grit-cyan" aria-hidden="true">person_add</span>
        </div>

        <h2 id="agregar-miembro-title" className="font-grit-title mb-1 text-center text-lg font-semibold text-grit-text">
          Agregar miembro
        </h2>
        <p className="mb-5 text-center text-sm text-grit-subtext">
          Invita a una persona a tu organización con el rol que tendrá al activarse.
        </p>

        <div className="space-y-4">
          {provisioningEnabled ? (
            <fieldset>
              <legend className="mb-1 block text-xs font-medium text-grit-subtext">Modo</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {([
                  { value: 'invitacion', label: 'Invitación por email', icon: 'mail' },
                  { value: 'contrasena_temporal', label: 'Cuenta con contraseña temporal', icon: 'key' },
                ] as const).map((option) => {
                  const selected = modo === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-grit-md border px-3 py-2 text-xs font-semibold transition ${
                        selected
                          ? 'border-grit-cyan/60 bg-grit-cyan/15 text-grit-cyan'
                          : 'border-grit-glass-border text-grit-subtext hover:border-grit-glass-border'
                      }`}
                    >
                      <input
                        type="radio"
                        name="agregar-miembro-modo"
                        value={option.value}
                        checked={selected}
                        onChange={() => setModo(option.value)}
                        className="sr-only"
                      />
                      <span className="material-symbols-outlined text-base" aria-hidden="true">{option.icon}</span>
                      {option.label}
                    </label>
                  );
                })}
              </div>

              {modo === 'contrasena_temporal' ? (
                <div className="mt-3 flex items-start gap-2 rounded-grit-md border border-amber-400/30 bg-amber-900/20 p-3 text-xs text-amber-200">
                  <span className="material-symbols-outlined text-base" aria-hidden="true">warning</span>
                  <span>
                    Se creará una cuenta con el correo confirmado sin que la persona lo verifique. Usa este modo solo si tu
                    organización ya verificó su identidad. La contraseña se mostrará una única vez y deberás compartirla
                    por un canal aprobado.
                  </span>
                </div>
              ) : null}
            </fieldset>
          ) : null}

          <div>
            <label htmlFor="am-email" className="mb-1 block text-xs font-medium text-grit-subtext">
              Correo electrónico <span className="text-grit-danger">*</span>
            </label>
            <input
              id="am-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="persona@correo.com"
              className={inputClasses}
            />
            {email && !emailValid ? <p className="mt-1 text-xs text-grit-danger">Ingresa un correo válido.</p> : null}
            {isActiveMember ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-amber-300">
                <span className="material-symbols-outlined text-sm" aria-hidden="true">info</span>
                Esta persona ya es miembro activo de la organización.
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="am-rol" className="mb-1 block text-xs font-medium text-grit-subtext">
              Rol <span className="text-grit-danger">*</span>
            </label>
            <select id="am-rol" value={rolId} onChange={(e) => setRolId(e.target.value)} className={inputClasses}>
              <option value="">Seleccionar…</option>
              {sortedRoles.map((rol) => (
                <option key={rol.id} value={rol.id}>
                  {ROL_DISPLAY_LABELS[rol.nombre] ?? rol.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="am-nombre" className="mb-1 block text-xs font-medium text-grit-subtext">
              Nombre <span className="text-xs text-grit-muted">(opcional)</span>
            </label>
            <input
              id="am-nombre"
              type="text"
              value={nombre}
              maxLength={100}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="am-nota" className="mb-1 block text-xs font-medium text-grit-subtext">
              Nota interna <span className="text-xs text-grit-muted">(opcional, visible solo para administradores)</span>
            </label>
            <textarea
              id="am-nota"
              value={nota}
              onChange={(e) => setNota(e.target.value.slice(0, NOTA_MAX))}
              maxLength={NOTA_MAX}
              rows={3}
              className={`${inputClasses} resize-none`}
            />
            <p className="mt-0.5 text-right text-[10px] text-grit-muted">{nota.length}/{NOTA_MAX}</p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 p-3" role="alert">
            <p className="text-xs text-grit-danger">{error}</p>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm font-semibold text-grit-subtext transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-bold text-grit-bg transition hover:bg-grit-cyan/90 disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando…' : effectiveModo === 'contrasena_temporal' ? 'Crear cuenta' : 'Enviar invitación'}
          </button>
        </div>
      </div>
    </div>
  );
}
