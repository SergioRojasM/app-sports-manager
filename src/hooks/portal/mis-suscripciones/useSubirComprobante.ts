'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { storageService } from '@/services/supabase/portal/storage.service';
import { pagosService } from '@/services/supabase/portal/pagos.service';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

type UseSubirComprobanteOptions = {
  pagoId: string;
  tenantId: string;
  userId: string;
};

type UseSubirComprobanteResult = {
  upload: (file: File) => Promise<string | null>;
  isUploading: boolean;
  error: string | null;
};

export function useSubirComprobante({
  pagoId,
  tenantId,
  userId,
}: UseSubirComprobanteOptions): UseSubirComprobanteResult {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setError(null);

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Solo se permiten imágenes (JPEG, PNG, WebP) o PDF.');
        return null;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError('El archivo no puede superar 5 MB.');
        return null;
      }

      setIsUploading(true);
      try {
        const supabase = createClient();
        const { path } = await storageService.uploadPaymentProof(
          supabase,
          tenantId,
          userId,
          pagoId,
          file,
          { upsert: true },
        );

        await pagosService.updateComprobantePath(supabase, pagoId, path);
        return path;
      } catch {
        setError('Error al subir el comprobante. Inténtalo de nuevo.');
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [pagoId, tenantId, userId],
  );

  return { upload, isUploading, error };
}
