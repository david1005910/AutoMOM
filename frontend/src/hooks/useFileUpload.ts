import { useState, useCallback } from 'react';
import { useMeetingStore } from '@/stores/meetingStore';

interface UploadOptions {
  url: string;
  file: Blob;
  contentType: string;
  onProgress?: (percent: number) => void;
}

async function uploadWithRetry(opts: UploadOptions, maxAttempts = 3): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', opts.url);
        xhr.setRequestHeader('Content-Type', opts.contentType);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('네트워크 오류'));
        xhr.send(opts.file);
      });
      return;
    } catch (err) {
      if (attempt === maxAttempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUploadProgress = useMeetingStore((s) => s.setUploadProgress);

  const upload = useCallback(async (url: string, file: Blob, contentType: string) => {
    setUploading(true);
    setError(null);
    setUploadProgress(0);
    try {
      await uploadWithRetry({ url, file, contentType, onProgress: setUploadProgress });
      setUploadProgress(100);
    } catch (err) {
      setError((err as Error).message || '업로드에 실패했습니다.');
      throw err;
    } finally {
      setUploading(false);
    }
  }, [setUploadProgress]);

  return { upload, uploading, error };
}
