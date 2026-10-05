'use client';

import { useState } from 'react';

type MetodoPagoQrImageProps = {
  url: string;
  nombre: string;
};

/**
 * QR image of a payment method as shown to payers (US-0128). White background keeps the code
 * scannable on the dark theme; a broken image is hidden so the rest of the method stays readable.
 * Callers pass `key={url}` so the hidden state resets when the method changes.
 */
export function MetodoPagoQrImage({ url, nombre }: MetodoPagoQrImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Abrir imagen en una pestaña nueva"
      className="block w-fit rounded-grit-md bg-white p-2 focus:outline-none focus:ring-2 focus:ring-grit-cyan"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Código QR de ${nombre}`}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-auto w-full max-w-[200px] object-contain"
      />
    </a>
  );
}
