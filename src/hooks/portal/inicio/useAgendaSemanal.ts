'use client';

import { useMemo, useState } from 'react';
import { agruparPorDia } from '@/lib/portal/inicio-agenda';
import type { InicioEntrenamiento, InicioVentana } from '@/types/portal/inicio.types';

/**
 * Selected day of the 7-day Inicio agenda. `hoyKey` comes from the server so
 * the first render matches on both sides; grouping is pure and memoised.
 */
export function useAgendaSemanal(ventana: InicioVentana, entrenamientos: InicioEntrenamiento[]) {
  const [selectedKey, setSelectedKey] = useState(ventana.hoyKey);

  const porDia = useMemo(() => agruparPorDia(entrenamientos, ventana.dias), [entrenamientos, ventana.dias]);

  const conteoPorDia = useMemo(
    () => Object.fromEntries(Object.entries(porDia).map(([key, sesiones]) => [key, sesiones.length])),
    [porDia],
  );

  return {
    selectedKey,
    select: setSelectedKey,
    sesionesDelDia: porDia[selectedKey] ?? [],
    conteoPorDia,
    ventanaVacia: entrenamientos.length === 0,
  };
}
