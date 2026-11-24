'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { GritButton, GritCard, GritIcon, cx, gritFocusRing, gritInputClass } from '@/components/ui';
import { formatRangoCorto, validateDateRange } from '@/lib/portal/mis-reservas-agrupacion';

type MisReservasCustomRangeProps = {
  /** Active custom range, or null when another date filter is selected. */
  active: { desde: string; hasta: string } | null;
  onApply: (desde: string, hasta: string) => void;
};

/** "Personalizado" pill + popover with Desde / Hasta (grit-arena-v3 `B0Jj4n`). Applies only on "Aplicar". */
export function MisReservasCustomRange({ active, onApply }: MisReservasCustomRangeProps) {
  const [open, setOpen] = useState(false);
  const [desde, setDesde] = useState(active?.desde ?? '');
  const [hasta, setHasta] = useState(active?.hasta ?? '');
  const [touched, setTouched] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  const error = validateDateRange(desde, hasta);
  const showError = touched && desde !== '' && hasta !== '' ? error : null;

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      // Re-sync the draft with the active range each time the popover opens
      setDesde(active?.desde ?? '');
      setHasta(active?.hasta ?? '');
      setTouched(false);
    }
    setOpen(!open);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-haspopup="dialog"
        onClick={toggle}
        className={cx(
          'inline-flex h-[37px] items-center gap-2 rounded-full border px-4 font-grit-body text-xs font-medium transition',
          active ? 'border-grit-cyan/35 bg-grit-cyan/[0.12] text-grit-text' : 'border-white/[0.12] bg-white/[0.04] text-grit-text hover:bg-white/[0.08]',
          gritFocusRing,
        )}
      >
        <GritIcon name="calendar_month" size={15} className="text-grit-cyan" />
        {active ? formatRangoCorto(active.desde, active.hasta) : 'Personalizado'}
        <GritIcon name={open ? 'expand_less' : 'expand_more'} size={14} className="text-grit-subtext" />
      </button>

      {open ? (
        <div id={popoverId} role="dialog" aria-label="Rango de fechas personalizado" className="absolute left-0 top-[calc(100%+8px)] z-30 w-[min(320px,calc(100vw-32px))] sm:left-auto sm:right-0">
          <GritCard variant="glass" padding="sm" className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2.5">
              <label className="flex flex-col gap-1.5 font-grit-body text-xs font-semibold text-grit-subtext">
                Desde
                <input
                  type="date"
                  value={desde}
                  onChange={(event) => {
                    setDesde(event.target.value);
                    setTouched(true);
                  }}
                  className={cx(gritInputClass, 'px-3')}
                />
              </label>
              <label className="flex flex-col gap-1.5 font-grit-body text-xs font-semibold text-grit-subtext">
                Hasta
                <input
                  type="date"
                  value={hasta}
                  onChange={(event) => {
                    setHasta(event.target.value);
                    setTouched(true);
                  }}
                  className={cx(gritInputClass, 'px-3')}
                />
              </label>
            </div>
            {showError ? (
              <p role="alert" className="font-grit-body text-xs text-grit-danger">
                {showError}
              </p>
            ) : (
              <p className="font-grit-body text-[11px] text-grit-muted">Máximo 60 días.</p>
            )}
            <div className="flex justify-end gap-2">
              <GritButton size="sm" variant="ghost" onClick={() => close()}>
                Cancelar
              </GritButton>
              <GritButton
                size="sm"
                disabled={error !== null}
                onClick={() => {
                  onApply(desde, hasta);
                  close();
                }}
              >
                Aplicar
              </GritButton>
            </div>
          </GritCard>
        </div>
      ) : null}
    </div>
  );
}
