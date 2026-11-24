'use client';

import { useState } from 'react';

/** 42px organization tile (`a1Skzz`): the logo, or the initial when it is missing or fails to load. */
export function InicioOrgLogo({ nombre, logoUrl }: { nombre: string; logoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const inicial = nombre.trim().charAt(0).toUpperCase() || '?';

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tenant logos live in Supabase storage, not next/image domains
      <img
        src={logoUrl}
        alt={`Logo de ${nombre}`}
        onError={() => setFailed(true)}
        className="h-[42px] w-[42px] shrink-0 rounded-[14px] border border-grit-cyan/35 object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border border-grit-cyan/35 bg-grit-bg font-grit-title text-xl font-semibold text-grit-cyan"
    >
      {inicial}
    </span>
  );
}
