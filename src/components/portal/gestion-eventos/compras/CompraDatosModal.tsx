'use client';

import { useState } from 'react';
import { GritButton, GritIcon } from '@/components/ui';
import { EventoModalShell } from '../EventoModalShell';
import { FORMULARIO_PERFIL_CAMPO_LABELS, type FormularioPerfilCampo } from '@/types/portal/formularios.types';
import { formatIngresoFechaHora } from '@/lib/portal/eventos-ingreso.utils';
import type { CompraAdminItem } from '@/types/portal/eventos-compras.types';

type CompraDatosModalProps = {
  compra: CompraAdminItem;
  onAbrirArchivo: (path: string) => Promise<void>;
  onClose: () => void;
};

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 border-b border-grit-glass-border/60 py-1.5 last:border-b-0">
      <dt className="text-xs text-grit-muted">{label}</dt>
      <dd className="break-words text-xs text-grit-text">{children}</dd>
    </div>
  );
}

/** `YYYY-MM-DD` → "1 de mayo de 1990" (a calendar date: no time-zone shift). */
function formatFechaNacimiento(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function valorTexto(tipo: string | null, value: string | undefined): string {
  if (value === undefined || value === '') return '—';
  if (tipo === 'checkbox') return value === 'true' ? 'Sí' : 'No';
  return value;
}

/**
 * Buyer data of a purchase: the fixed fields, the profile fields and the form answers, labelled with
 * the form snapshot version the buyer answered (never the current template). Rendered as text only.
 */
export function CompraDatosModal({ compra, onAbrirArchivo, onClose }: CompraDatosModalProps) {
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const respuesta = compra.respuesta;
  const campos = (respuesta?.formulario?.campos ?? []).filter(
    (campo) => campo.seccion_tipo === 'datos' && campo.campo_nombre,
  );

  const abrir = async (path: string) => {
    setAbriendo(path);
    setError(null);
    try {
      await onAbrirArchivo(path);
    } catch {
      setError('No se pudo abrir el archivo.');
    } finally {
      setAbriendo(null);
    }
  };

  return (
    <EventoModalShell
      title="Datos del comprador"
      onClose={onClose}
      footer={
        <GritButton variant="secondary" size="sm" onClick={onClose}>
          Cerrar
        </GritButton>
      }
    >
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        <section>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-grit-subtext">Comprador</h3>
          <dl>
            <Fila label="Nombre completo">{compra.compradorNombre}</Fila>
            <Fila label="Correo">{compra.compradorEmail}</Fila>
            <Fila label="Fecha de nacimiento">{formatFechaNacimiento(compra.compradorFechaNacimiento)}</Fila>
            <Fila label="Cuenta">{compra.registrado ? 'Registrado' : 'Invitado'}</Fila>
          </dl>
        </section>

        {compra.tickets.length > 0 && (
          <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-grit-subtext">Entradas</h3>
            <dl>
              {compra.tickets.map((ticket) => (
                <Fila key={ticket.codigo} label={ticket.codigo}>
                  {ticket.ingresoAt ? `Ingresó ${formatIngresoFechaHora(ticket.ingresoAt)}` : 'Sin ingreso'}
                </Fila>
              ))}
            </dl>
          </section>
        )}

        {respuesta && Object.keys(respuesta.datosPerfil).length > 0 && (
          <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-grit-subtext">Datos de perfil</h3>
            <dl>
              {Object.entries(respuesta.datosPerfil).map(([key, value]) => (
                <Fila key={key} label={FORMULARIO_PERFIL_CAMPO_LABELS[key as FormularioPerfilCampo] ?? key}>
                  {value}
                </Fila>
              ))}
            </dl>
          </section>
        )}

        {respuesta && campos.length > 0 && (
          <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-grit-subtext">
              Formulario{respuesta.formulario?.nombre ? ` · ${respuesta.formulario.nombre}` : ''}
            </h3>
            <dl>
              {campos.map((campo) => {
                const nombre = campo.campo_nombre as string;
                const path = campo.campo_tipo === 'imagen' ? respuesta.archivos[nombre] : undefined;
                return (
                  <Fila key={campo.id} label={campo.campo_etiqueta ?? nombre}>
                    {campo.campo_tipo === 'imagen' ? (
                      path ? (
                        <button
                          type="button"
                          onClick={() => void abrir(path)}
                          disabled={abriendo === path}
                          className="inline-flex items-center gap-1 font-semibold text-grit-cyan hover:underline disabled:opacity-60"
                        >
                          <GritIcon name="image" size={13} />
                          {abriendo === path ? 'Abriendo…' : 'Ver imagen'}
                        </button>
                      ) : (
                        '—'
                      )
                    ) : (
                      valorTexto(campo.campo_tipo, respuesta.respuestas[nombre])
                    )}
                  </Fila>
                );
              })}
            </dl>
          </section>
        )}

        {!respuesta && <p className="text-xs text-grit-muted">El evento no pedía formulario cuando se hizo esta compra.</p>}

        {compra.estado === 'rechazada' && compra.motivoRechazo && (
          <p className="rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-3 py-2 text-xs text-grit-danger">
            Motivo del rechazo: {compra.motivoRechazo}
          </p>
        )}

        {error && (
          <p role="alert" className="text-xs text-grit-danger">
            {error}
          </p>
        )}
      </div>
    </EventoModalShell>
  );
}
