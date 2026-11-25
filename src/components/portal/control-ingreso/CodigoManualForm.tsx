'use client';

import { useId, useState, type Ref } from 'react';
import { GritButton, GritCard } from '@/components/ui';

type CodigoManualFormProps = {
  onSubmit: (codigo: string) => void;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
};

const PREFIJO = 'EV-';

/**
 * Manual code entry (US-0131, grit-arena-v3 `xjlmU` `D3Ic3x`): fixed "EV-" prefix + the rest of the
 * code. Also receives USB scanners that type the whole code and press Enter, so a pasted / typed
 * prefix is accepted. Normalization and the format check happen in `useControlIngreso.registrar`.
 */
export function CodigoManualForm({ onSubmit, disabled = false, inputRef }: CodigoManualFormProps) {
  const [codigo, setCodigo] = useState('');
  const inputId = useId();
  const hintId = useId();

  return (
    <GritCard variant="card" padding="none" className="p-[18px]">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const valor = codigo.trim();
          if (!valor) return;
          // normalizarCodigoTicket adds the prefix when missing and keeps a pasted one ("EV-ABCD2345")
          onSubmit(valor);
          setCodigo('');
        }}
      >
        <label htmlFor={inputId} className="font-grit-body text-sm font-semibold text-grit-text">
          Código de la entrada
        </label>
        <div className="flex items-center gap-2 rounded-full border border-white/[0.12] bg-black/30 py-[5px] pl-4 pr-[5px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] transition focus-within:border-grit-cyan/60 focus-within:ring-2 focus-within:ring-grit-cyan/20">
          <span aria-hidden="true" className="font-grit-mono text-sm font-semibold text-grit-cyan">
            {PREFIJO}
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={codigo}
            onChange={(event) => setCodigo(event.target.value.toUpperCase())}
            placeholder="XXXXXXXX"
            aria-describedby={hintId}
            maxLength={17}
            className="min-w-0 flex-1 bg-transparent font-grit-mono text-sm tracking-[2px] text-grit-text outline-none placeholder:text-grit-muted/50"
          />
          <GritButton type="submit" size="sm" icon="login" disabled={disabled || !codigo.trim()}>
            Validar
          </GritButton>
        </div>
        <p id={hintId} className="font-grit-body text-[11px] text-grit-muted">
          Escribe los 8 caracteres impresos después de EV-.
        </p>
      </form>
    </GritCard>
  );
}
