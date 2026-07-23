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

type FormularioRespuestaViewerModalProps = {
  open: boolean;
  plantillaNombre: string;
  campos: FormularioRespuestaViewerCampo[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

/** Read-only viewer for a submitted formulario_respuestas row ("Ver respuesta"). */
export function FormularioRespuestaViewerModal({
  open,
  plantillaNombre,
  campos,
  loading,
  error,
  onClose,
}: FormularioRespuestaViewerModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Respuesta: ${plantillaNombre}`}
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-portal-border bg-navy-medium p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Respuesta</p>
            <h2 className="text-lg font-semibold text-slate-100">{plantillaNombre}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-portal-border bg-navy-deep/80 p-2 text-slate-300 transition hover:text-slate-100"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {loading && <p className="text-sm text-slate-400">Cargando respuesta...</p>}

          {!loading && error && (
            <div className="rounded-lg border border-rose-400/25 bg-rose-900/20 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          {!loading && !error && campos.length === 0 && (
            <p className="text-sm text-slate-400">Esta respuesta no tiene campos registrados.</p>
          )}

          {!loading &&
            !error &&
            campos.map((campo) => (
              <div key={campo.campoNombre}>
                <p className="mb-1 text-sm font-medium text-slate-300">{campo.etiqueta}</p>
                {campo.tipo === 'imagen' ? (
                  campo.imageUrl ? (
                    <a
                      href={campo.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-turquoise hover:underline"
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">image</span>
                      Ver imagen
                    </a>
                  ) : (
                    <p className="text-sm italic text-slate-500">Sin respuesta</p>
                  )
                ) : campo.value && campo.value.trim() !== '' ? (
                  <p className="whitespace-pre-wrap text-sm text-slate-100">{campo.value}</p>
                ) : (
                  <p className="text-sm italic text-slate-500">Sin respuesta</p>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
