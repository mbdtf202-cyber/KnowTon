import { useState, useCallback, useRef } from 'react';
import * as tus from 'tus-js-client';

export interface BatchFileItem {
  id: string;
  file: File;
  metadata: {
    title?: string;
    description?: string;
    category?: string;
  };
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error' | 'cancelled';
  progress: number;
  bytesUploaded: number;
  bytesTotal: number;
  uploadId: string | null;
  error: string | null;
  upload?: tus.Upload;
}

export interface BatchUploadProgress {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalBytes: number;
  uploadedBytes: number;
  overallProgress: number;
}

export interface UseBatchUploadReturn {
  files: BatchFileItem[];
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  updateFileMetadata: (fileId: string, metadata: Partial<BatchFileItem['metadata']>) => void;
  startUpload: (userId: string) => void;
  pauseFile: (fileId: string) => void;
  resumeFile: (fileId: string) => void;
  retryFile: (fileId: string, userId: string) => void;
  cancelFile: (fileId: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  progress: BatchUploadProgress;
  isUploading: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MAX_FILES = 50;
const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const MAX_PARALLEL_UPLOADS = 3;

export function useBatchUpload(): UseBatchUploadReturn {
  const [files, setFiles] = useState<BatchFileItem[]>([]);
  const uploadQueueRef = useRef<string[]>([]);
  const activeUploadsRef = useRef<Set<string>>(new Set());

  const generateFileId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prevFiles) => {
      // Check total file count
      if (prevFiles.length + newFiles.length > MAX_FILES) {
        alert(`Maximum ${MAX_FILES} files allowed. Only adding first ${MAX_FILES - prevFiles.length} files.`);
        newFiles = newFiles.slice(0, MAX_FILES - prevFiles.length);
      }

      const validFiles: BatchFileItem[] = [];
      
      newFiles.forEach((file) => {
        // Validate file size
        if (file.size > MAX_SIZE) {
          console.warn(`File ${file.name} exceeds 2GB limit, skipping`);
          return;
        }

        // Create file item
        validFiles.push({
          id: generateFileId(),
          file,
          metadata: {
            title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
            description: '',
            category: '',
          },
          status: 'pending',
          progress: 0,
          bytesUploaded: 0,
          bytesTotal: file.size,
          uploadId: null,
          error: null,
        });
      });

      return [...prevFiles, ...validFiles];
    });
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prevFiles) => {
      const file = prevFiles.find((f) => f.id === fileId);
      
      // Cancel upload if in progress
      if (file?.upload) {
        file.upload.abort(true);
      }

      // Remove from active uploads
      activeUploadsRef.current.delete(fileId);
      
      // Remove from queue
      uploadQueueRef.current = uploadQueueRef.current.filter((id) => id !== fileId);

      return prevFiles.filter((f) => f.id !== fileId);
    });
  }, []);

  const updateFileMetadata = useCallback((fileId: string, metadata: Partial<BatchFileItem['metadata']>) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId
          ? { ...file, metadata: { ...file.metadata, ...metadata } }
          : file
      )
    );
  }, []);

  const processUploadQueue = useCallback((userId: string) => {
    // Check if we can start more uploads
    while (
      activeUploadsRef.current.size < MAX_PARALLEL_UPLOADS &&
      uploadQueueRef.current.length > 0
    ) {
      const fileId = uploadQueueRef.current.shift();
      if (!fileId) break;

      setFiles((prevFiles) => {
        const fileIndex = prevFiles.findIndex((f) => f.id === fileId);
        if (fileIndex === -1) return prevFiles;

        const file = prevFiles[fileIndex];
        if (file.status !== 'pending') return prevFiles;

        // Start upload
        startSingleUpload(file, userId);
        
        return prevFiles;
      });
    }
  }, []);

  const startSingleUpload = useCallback((fileItem: BatchFileItem, userId: string) => {
    const token = localStorage.getItem('auth_token');

    const tusUpload = new tus.Upload(fileItem.file, {
      endpoint: `${API_URL}/api/v1/upload/files`,
      retryDelays: [0, 3000, 5000, 10000],
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
      metadata: {
        filename: fileItem.file.name,
        filetype: fileItem.file.type,
        userId,
        title: fileItem.metadata.title || '',
        description: fileItem.metadata.description || '',
        category: fileItem.metadata.category || '',
      },
      headers: token ? {
        Authorization: `Bearer ${token}`,
      } : {},
      onError: (error) => {
        console.error(`Upload error for ${fileItem.file.name}:`, error);
        
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileItem.id
              ? { ...f, status: 'error', error: error.message }
              : f
          )
        );

        activeUploadsRef.current.delete(fileItem.id);
        processUploadQueue(userId);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const progress = Math.round((bytesUploaded / bytesTotal) * 100);
        
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: 'uploading',
                  progress,
                  bytesUploaded,
                  bytesTotal,
                }
              : f
          )
        );
      },
      onSuccess: () => {
        const uploadId = tusUpload.url?.split('/').pop() || null;
        
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileItem.id
              ? {
                  ...f,
                  status: 'completed',
                  progress: 100,
                  uploadId,
                }
              : f
          )
        );

        activeUploadsRef.current.delete(fileItem.id);
        processUploadQueue(userId);
      },
    });

    // Update file with upload instance
    setFiles((prevFiles) =>
      prevFiles.map((f) =>
        f.id === fileItem.id
          ? { ...f, upload: tusUpload, status: 'uploading' }
          : f
      )
    );

    activeUploadsRef.current.add(fileItem.id);
    tusUpload.start();
  }, [processUploadQueue]);

  const startUpload = useCallback((userId: string) => {
    setFiles((prevFiles) => {
      // Add all pending files to queue
      const pendingFiles = prevFiles.filter((f) => f.status === 'pending');
      uploadQueueRef.current = pendingFiles.map((f) => f.id);
      
      // Start processing queue
      processUploadQueue(userId);
      
      return prevFiles;
    });
  }, [processUploadQueue]);

  const pauseFile = useCallback((fileId: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) => {
        if (file.id === fileId && file.upload) {
          file.upload.abort();
          activeUploadsRef.current.delete(fileId);
          return { ...file, status: 'paused' };
        }
        return file;
      })
    );
  }, []);

  const resumeFile = useCallback((fileId: string, userId: string) => {
    setFiles((prevFiles) => {
      const file = prevFiles.find((f) => f.id === fileId);
      if (!file || file.status !== 'paused' || !file.upload) {
        return prevFiles;
      }

      file.upload.start();
      activeUploadsRef.current.add(fileId);

      return prevFiles.map((f) =>
        f.id === fileId ? { ...f, status: 'uploading' } : f
      );
    });
  }, []);

  const retryFile = useCallback((fileId: string, userId: string) => {
    setFiles((prevFiles) => {
      const file = prevFiles.find((f) => f.id === fileId);
      if (!file || file.status !== 'error') {
        return prevFiles;
      }

      // Reset file status
      const updatedFiles = prevFiles.map((f) =>
        f.id === fileId
          ? {
              ...f,
              status: 'pending' as const,
              progress: 0,
              bytesUploaded: 0,
              error: null,
              upload: undefined,
            }
          : f
      );

      // Add to queue and process
      uploadQueueRef.current.push(fileId);
      setTimeout(() => processUploadQueue(userId), 0);

      return updatedFiles;
    });
  }, [processUploadQueue]);

  const cancelFile = useCallback((fileId: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) => {
        if (file.id === fileId && file.upload) {
          file.upload.abort(true);
          activeUploadsRef.current.delete(fileId);
          return { ...file, status: 'cancelled' };
        }
        return file;
      })
    );

    // Remove from queue
    uploadQueueRef.current = uploadQueueRef.current.filter((id) => id !== fileId);
  }, []);

  const clearCompleted = useCallback(() => {
    setFiles((prevFiles) =>
      prevFiles.filter((f) => f.status !== 'completed' && f.status !== 'cancelled')
    );
  }, []);

  const clearAll = useCallback(() => {
    // Cancel all active uploads
    files.forEach((file) => {
      if (file.upload && (file.status === 'uploading' || file.status === 'paused')) {
        file.upload.abort(true);
      }
    });

    activeUploadsRef.current.clear();
    uploadQueueRef.current = [];
    setFiles([]);
  }, [files]);

  // Calculate overall progress
  const progress: BatchUploadProgress = {
    totalFiles: files.length,
    completedFiles: files.filter((f) => f.status === 'completed').length,
    failedFiles: files.filter((f) => f.status === 'error').length,
    totalBytes: files.reduce((sum, f) => sum + f.bytesTotal, 0),
    uploadedBytes: files.reduce((sum, f) => sum + f.bytesUploaded, 0),
    overallProgress: files.length > 0
      ? Math.round(
          (files.reduce((sum, f) => sum + f.bytesUploaded, 0) /
            files.reduce((sum, f) => sum + f.bytesTotal, 0)) *
            100
        )
      : 0,
  };

  const isUploading = files.some((f) => f.status === 'uploading');

  return {
    files,
    addFiles,
    removeFile,
    updateFileMetadata,
    startUpload,
    pauseFile,
    resumeFile,
    retryFile,
    cancelFile,
    clearCompleted,
    clearAll,
    progress,
    isUploading,
  };
}
