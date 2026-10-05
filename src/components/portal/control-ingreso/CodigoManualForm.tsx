'use client';

import { useId, useState, type Ref } from 'react';
import { GritButton, gritInputClass } from '@/components/ui';

type CodigoManualFormProps = {
  onSubmit: (codigo: string) => void;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
};

/**
 * Manual code entry (US-0131). Also receives USB scanners that type the code and press Enter.
 * Normalization and the format check happen in `useControlIngreso.registrar`.
 */
export function CodigoManualForm({ onSubmit, disabled = false, inputRef }: CodigoManualFormProps) {
  const [codigo, setCodigo] = useState('');
  const inputId = useId();
  const hintId = useId();

  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!codigo.trim()) return;
        onSubmit(codigo);
        setCodigo('');
      }}
    >
      <label htmlFor={inputId} className="font-grit-body text-xs font-semibold text-grit-subtext">
        Código de la entrada
      </label>
      <div className="flex gap-2">
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
          placeholder="EV-XXXXXXXX"
          aria-describedby={hintId}
          maxLength={20}
          className={`${gritInputClass} flex-1 font-mono tracking-wider`}
        />
        <GritButton type="submit" size="sm" icon="login" disabled={disabled || !codigo.trim()}>
          Validar
        </GritButton>
      </div>
      <p id={hintId} className="font-grit-body text-[11px] text-grit-muted">
        Escribe el código impreso en la entrada. El prefijo EV- es opcional.
      </p>
    </form>
  );
}
