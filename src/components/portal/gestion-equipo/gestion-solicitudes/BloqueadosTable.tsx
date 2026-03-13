'use client';

import { useState } from 'react';
import type { BloqueadoRow } from '@/types/portal/solicitudes.types';

type BloqueadosTableProps = {
  rows: BloqueadoRow[];
  onDesbloquear: (usuarioId: string) => void;
};

function formatDate(dateStr: string): string {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function BloqueadosTable({ rows, onDesbloquear }: BloqueadosTableProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function handleConfirmDesbloquear(usuarioId: string) {
    onDesbloquear(usuarioId);
    setConfirmId(null);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-portal-border">
      <table className="w-full text-left text-sm">
        <thead className="glass border-b border-portal-border text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th scope="col" className="px-4 py-3">Usuario</th>
            <th scope="col" className="px-4 py-3">Correo</th>
            <th scope="col" className="px-4 py-3">Bloqueado el</th>
            <th scope="col" className="px-4 py-3">Motivo</th>
            <th scope="col" className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-portal-border">
          {rows.map((bloqueado) => (
            <tr key={bloqueado.id} className="text-slate-200 hover:bg-navy-soft/40">
              <td className="whitespace-nowrap px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-portal-border bg-navy-soft">
                    {bloqueado.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={bloqueado.foto_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-sm text-slate-400" aria-hidden="true">
                        person
                      </span>
                    )}
                  </div>
                  <span className="font-medium">
                    {bloqueado.nombre} {bloqueado.apellido}
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-300">{bloqueado.email}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-300">{formatDate(bloqueado.bloqueado_at)}</td>
              <td className="px-4 py-3 text-slate-300">
                {bloqueado.motivo ? (
                  <span className="max-w-xs truncate">{bloqueado.motivo}</span>
                ) : (
                  <span className="italic text-slate-500">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                {confirmId === bloqueado.usuario_id ? (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmDesbloquear(bloqueado.usuario_id)}
                      className="rounded-md border border-emerald-400/30 bg-emerald-900/30 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/50"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-md border border-portal-border px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-navy-soft"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(bloqueado.usuario_id)}
                    className="rounded-md border border-violet-400/30 bg-violet-900/30 px-2.5 py-1 text-xs font-semibold text-violet-200 hover:bg-violet-900/50"
                  >
                    Desbloquear
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
