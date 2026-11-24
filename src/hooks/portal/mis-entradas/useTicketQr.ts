'use client';

import { useEffect, useState } from 'react';

const cache = new Map<string, string>();

/**
 * QR data URL of a ticket code, generated in the browser with the `qrcode` package (already used
 * by the PDF, US-0121) — lazily imported, no network request. Results are cached per code.
 */
export function useTicketQr(code: string | null): { src: string | null; error: boolean } {
  const [state, setState] = useState<{ code: string | null; src: string | null; error: boolean }>(() => ({
    code,
    src: code ? (cache.get(code) ?? null) : null,
    error: false,
  }));

  useEffect(() => {
    if (!code || cache.has(code)) return;
    let cancelled = false;
    import('qrcode')
      .then((QRCode) => QRCode.toDataURL(code, { margin: 1, width: 296, errorCorrectionLevel: 'M' }))
      .then((src) => {
        cache.set(code, src);
        if (!cancelled) setState({ code, src, error: false });
      })
      .catch((qrError) => {
        console.error('useTicketQr: QR generation failed', qrError);
        if (!cancelled) setState({ code, src: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!code) return { src: null, error: false };
  const cached = cache.get(code);
  if (cached) return { src: cached, error: false };
  return state.code === code ? { src: state.src, error: state.error } : { src: null, error: false };
}
