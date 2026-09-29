'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { cx, gritFocusRing } from '@/components/ui';
import { PublicTrainingDetalleBody } from '@/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetalleBody';
import { toCardPreviewItem, toDetallePreviewItem } from '@/lib/portal/eventos-wizard.utils';
import { EventoCard } from '../EventoCard';
import type { EventoDraft } from '@/types/portal/eventos.types';

type PreviewMode = 'pagina' | 'tarjeta';

type EventoPreviewProps = {
  draft: EventoDraft;
  eventoId: string;
  tenantId: string;
  borrador: boolean;
  /** Local object URL of a not-yet-uploaded banner, or the stored banner. */
  bannerUrl: string | null;
};

const MODES: Array<{ value: PreviewMode; label: string }> = [
  { value: 'pagina', label: 'Página' },
  { value: 'tarjeta', label: 'Tarjeta' },
];

const noop = () => {};

/** Live preview of how the event will look, fed by pure adapters over the in-memory draft (US-0119). */
export function EventoPreview({ draft, eventoId, tenantId, borrador, bannerUrl }: EventoPreviewProps) {
  const [mode, setMode] = useState<PreviewMode>('pagina');
  // Markdown rendering of the long description is the heaviest part; let typing stay responsive
  const deferredDraft = useDeferredValue(draft);
  const previewDraft = useMemo(() => ({ ...deferredDraft, bannerUrl }), [deferredDraft, bannerUrl]);

  const detalleItem = useMemo(() => toDetallePreviewItem(previewDraft, eventoId, tenantId), [previewDraft, eventoId, tenantId]);
  const cardItem = useMemo(
    () => toCardPreviewItem(previewDraft, eventoId, tenantId, borrador),
    [previewDraft, eventoId, tenantId, borrador],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-grit-body text-xs font-semibold uppercase tracking-wide text-grit-subtext">Vista previa</p>
        <div role="radiogroup" aria-label="Tipo de vista previa" className="flex rounded-grit-md border border-grit-glass-border p-0.5">
          {MODES.map((item) => (
            <label
              key={item.value}
              className={cx(
                'cursor-pointer rounded-grit-sm px-3 py-1 font-grit-body text-xs font-semibold transition focus-within:ring-2 focus-within:ring-grit-cyan',
                mode === item.value ? 'bg-grit-cyan/15 text-grit-cyan' : 'text-grit-subtext hover:text-grit-text',
              )}
            >
              <input
                type="radio"
                name="evento-preview-mode"
                value={item.value}
                checked={mode === item.value}
                onChange={() => setMode(item.value)}
                className={cx('sr-only', gritFocusRing)}
              />
              {item.label}
            </label>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-grit-2xl border border-dashed border-grit-glass-border bg-grit-bg/40 p-4" aria-live="off">
        {mode === 'pagina' ? (
          <div className="pointer-events-none select-none" inert>
            <PublicTrainingDetalleBody
              item={detalleItem}
              onReservar={noop}
              reservarDisabled
              tipoLabel={draft.publico ? 'Evento público' : 'Evento privado'}
            />
          </div>
        ) : (
          <div className="mx-auto max-w-sm">
            <EventoCard evento={cardItem} hideActions />
          </div>
        )}
      </div>
    </div>
  );
}
