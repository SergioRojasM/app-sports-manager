'use client';

import type { FormularioTipoCampo } from '@/types/portal/formularios.types';

/** One answered "datos" field, resolved from the response's campos_snapshot (survives template edits/deletion). */
export type FormularioRespuestaViewerCampo = {
  campoNombre: string;
  etiqueta: string;
  tipo: FormularioTipoCampo;
  value: string | undefined;
  /** Resolved signed URL, only set for tipo === 'imagen' with a stored path. */
  imageUrl?: string;
};

/** One requested profile field resolved from the response's perfil_snapshot (US-0096). */
export type FormularioRespuestaViewerPerfilCampo = {
  key: string;
  label: string;
  value: string;
};

type FormularioRespuestaViewerModalProps = {
  open: boolean;
  plantillaNombre: string;
  campos: FormularioRespuestaViewerCampo[];
  /** Snapshotted profile fields (US-0096) — rendered as a "Datos de perfil" section above the "Datos" answers. */
  perfilCampos?: FormularioRespuestaViewerPerfilCampo[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

/** Read-only viewer for a submitted formulario_respuestas row ("Ver respuesta"). */
export function FormularioRespuestaViewerModal({
  open,
  plantillaNombre,
  campos,
  perfilCampos = [],
  loading,
  error,
  onClose,
}: FormularioRespuestaViewerModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-grit-bg/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Respuesta: ${plantillaNombre}`}
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-grit-2xl border border-grit-glass-border bg-grit-card p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">Respuesta</p>
            <h2 className="font-grit-title text-lg font-semibold text-grit-text">{plantillaNombre}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/80 p-2 text-grit-subtext transition hover:text-grit-text"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {loading && <p className="text-sm text-grit-subtext">Cargando respuesta...</p>}

          {!loading && error && (
            <div className="rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger">
              {error}
            </div>
          )}

          {!loading && !error && perfilCampos.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">
                Datos de perfil
              </p>
              <div className="space-y-3">
                {perfilCampos.map((campo) => (
                  <div key={campo.key}>
                    <p className="mb-1 text-sm font-medium text-grit-subtext">{campo.label}</p>
                    <p className="whitespace-pre-wrap text-sm text-grit-text">{campo.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !error && campos.length === 0 && perfilCampos.length === 0 && (
            <p className="text-sm text-grit-subtext">Esta respuesta no tiene campos registrados.</p>
          )}

          {!loading &&
            !error &&
            campos.map((campo) => (
              <div key={campo.campoNombre}>
                <p className="mb-1 text-sm font-medium text-grit-subtext">{campo.etiqueta}</p>
                {campo.tipo === 'imagen' ? (
                  campo.imageUrl ? (
                    <a
                      href={campo.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-grit-cyan hover:underline"
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">image</span>
                      Ver imagen
                    </a>
                  ) : (
                    <p className="text-sm italic text-grit-muted">Sin respuesta</p>
                  )
                ) : campo.tipo === 'checkbox' ? (
                  <p className="text-sm text-grit-text">{campo.value === 'true' ? 'Sí' : 'No'}</p>
                ) : campo.value && campo.value.trim() !== '' ? (
                  <p className="whitespace-pre-wrap text-sm text-grit-text">{campo.value}</p>
                ) : (
                  <p className="text-sm italic text-grit-muted">Sin respuesta</p>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
