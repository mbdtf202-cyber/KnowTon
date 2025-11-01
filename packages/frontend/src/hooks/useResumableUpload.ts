import { useState, useCallback, useRef } from 'react';
import * as tus from 'tus-js-client';

export interface UploadMetadata {
  filename: string;
  filetype: string;
  userId: string;
  title?: string;
  description?: string;
  category?: string;
}

export interface UploadProgress {
  uploadId: string | null;
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
  status: 'idle' | 'uploading' | 'paused' | 'completed' | 'error';
  error: string | null;
}

export interface UseResumableUploadReturn {
  upload: (file: File, metadata: Omit<UploadMetadata, 'filename' | 'filetype'>) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  progress: UploadProgress;
  isUploading: boolean;
  isPaused: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useResumableUpload(): UseResumableUploadReturn {
  const [progress, setProgress] = useState<UploadProgress>({
    uploadId: null,
    bytesUploaded: 0,
    bytesTotal: 0,
    percentage: 0,
    status: 'idle',
    error: null,
  });

  const uploadRef = useRef<tus.Upload | null>(null);

  const upload = useCallback((file: File, metadata: Omit<UploadMetadata, 'filename' | 'filetype'>) => {
    // Validate file size (2GB max)
    const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > MAX_SIZE) {
      setProgress((prev) => ({
        ...prev,
        status: 'error',
        error: 'File size exceeds maximum limit of 2GB',
      }));
      return;
    }

    // Get auth token from localStorage or cookie
    const token = localStorage.getItem('auth_token');

    // Create tus upload
    const tusUpload = new tus.Upload(file, {
      endpoint: `${API_URL}/api/v1/upload/files`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
      metadata: {
        filename: file.name,
        filetype: file.type,
        userId: metadata.userId,
        title: metadata.title || '',
        description: metadata.description || '',
        category: metadata.category || '',
      },
      headers: token ? {
        Authorization: `Bearer ${token}`,
      } : {},
      onError: (error) => {
        console.error('Upload error:', error);
        setProgress((prev) => ({
          ...prev,
          status: 'error',
          error: error.message,
        }));
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
        setProgress((prev) => ({
          ...prev,
          bytesUploaded,
          bytesTotal,
          percentage,
          status: 'uploading',
        }));
      },
      onSuccess: () => {
        const uploadId = tusUpload.url?.split('/').pop() || null;
        setProgress((prev) => ({
          ...prev,
          uploadId,
          status: 'completed',
          percentage: 100,
        }));
        console.log('Upload completed:', uploadId);
      },
    });

    uploadRef.current = tusUpload;

    // Start upload
    setProgress({
      uploadId: null,
      bytesUploaded: 0,
      bytesTotal: file.size,
      percentage: 0,
      status: 'uploading',
      error: null,
    });

    tusUpload.start();
  }, []);

  const pause = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.abort();
      setProgress((prev) => ({
        ...prev,
        status: 'paused',
      }));
    }
  }, []);

  const resume = useCallback(() => {
    if (uploadRef.current) {
      setProgress((prev) => ({
        ...prev,
        status: 'uploading',
      }));
      uploadRef.current.start();
    }
  }, []);

  const cancel = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.abort(true); // true = delete upload on server
      uploadRef.current = null;
      setProgress({
        uploadId: null,
        bytesUploaded: 0,
        bytesTotal: 0,
        percentage: 0,
        status: 'idle',
        error: null,
      });
    }
  }, []);

  return {
    upload,
    pause,
    resume,
    cancel,
    progress,
    isUploading: progress.status === 'uploading',
    isPaused: progress.status === 'paused',
  };
}
