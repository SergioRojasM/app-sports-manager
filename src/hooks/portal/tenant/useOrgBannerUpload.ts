'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { storageService } from '@/services/supabase/portal/storage.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MiB

type UseOrgBannerUploadResult = {
  uploading: boolean;
  error: string | null;
  selectedFile: File | null;
  previewUrl: string | null;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  upload: (tenantId: string) => Promise<string | null>;
  reset: () => void;
};

export function useOrgBannerUpload(): UseOrgBannerUploadResult {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Revoke object URL on cleanup
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('Solo se permiten imágenes JPEG, PNG o WebP.');
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError('El archivo no puede superar 2 MB.');
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const upload = useCallback(
    async (tenantId: string): Promise<string | null> => {
      if (!selectedFile) return null;

      setUploading(true);
      setError(null);

      try {
        const supabase = createClient();
        const result = await storageService.uploadOrgBanner(supabase, tenantId, selectedFile);
        return result.signedUrl;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al subir el banner.';
        setError(message);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [selectedFile],
  );

  const reset = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  }, []);

  return {
    uploading,
    error,
    selectedFile,
    previewUrl,
    handleFileSelect,
    upload,
    reset,
  };
}
