'use client';

import { useEffect, useState } from 'react';
import {
  FORMULARIO_PERFIL_CAMPOS,
  HEADER_SECCION_TIPOS,
  type FormularioPerfilCampo,
  type FormularioSeccion,
} from '@/types/portal/formularios.types';
import { FormularioHeaderEditor } from './FormularioHeaderEditor';
import { FormularioSeccionesGrouped } from './FormularioSeccionesGrouped';

type FormularioPreviewModalProps = {
  open: boolean;
  tenantId: string;
  plantillaNombre: string;
  secciones: FormularioSeccion[];
  /** Profile fields this template requests (US-0095) — rendered as a read-only chip list. */
  perfilCamposRequeridos?: FormularioPerfilCampo[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
};

export function FormularioPreviewModal({
  open,
  tenantId,
  plantillaNombre,
  secciones,
  perfilCamposRequeridos = [],
  loading = false,
  error = null,
  onClose,
}: FormularioPreviewModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, open]);

  if (!open) return null;

  const bodySecciones = secciones.filter((s) => !(HEADER_SECCION_TIPOS as readonly string[]).includes(s.seccion_tipo));

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar vista previa"
        className={[
          'absolute inset-0 bg-slate-950/70 transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Vista previa de ${plantillaNombre}`}
        className={[
          'absolute inset-0 flex items-center justify-center p-4 transition-opacity duration-300',
          visible ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      >
        <div className="glass flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-portal-border bg-navy-medium shadow-[0_18px_44px_rgba(0,0,0,0.45)]">
          <header className="flex items-center justify-between border-b border-portal-border px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Vista previa</p>
              <h2 className="text-lg font-semibold text-slate-100">{plantillaNombre}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-portal-border bg-navy-deep/80 p-2 text-slate-300 transition hover:text-slate-100"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
            </button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {!loading && !error ? <FormularioHeaderEditor tenantId={tenantId} secciones={secciones} readOnly /> : null}

            {!loading && !error && perfilCamposRequeridos.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Datos de perfil solicitados
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {perfilCamposRequeridos.map((key) => (
                    <span
                      key={key}
                      className="rounded-md border border-turquoise/30 bg-turquoise/10 px-2 py-0.5 text-xs font-medium text-turquoise"
                    >
                      {FORMULARIO_PERFIL_CAMPOS.find((c) => c.key === key)?.label ?? key}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {loading ? <p className="text-sm text-slate-400">Cargando vista previa...</p> : null}

            {!loading && error ? (
              <div className="rounded-lg border border-rose-400/25 bg-rose-900/20 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {!loading && !error && bodySecciones.length === 0 ? (
              <p className="text-sm text-slate-400">Esta plantilla todavía no tiene secciones.</p>
            ) : null}

            {!loading && !error && bodySecciones.length > 0 ? <FormularioSeccionesGrouped secciones={bodySecciones} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
