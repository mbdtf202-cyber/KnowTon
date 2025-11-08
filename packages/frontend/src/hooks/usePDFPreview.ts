import { useState, useCallback } from 'react';

interface PreviewData {
  previewUrl: string;
  totalPages: number;
  previewPages: number;
  fileSize: number;
}

interface PreviewAnalytics {
  totalViews: number;
  uniqueViewers: number;
}

interface UsePDFPreviewReturn {
  previewData: PreviewData | null;
  analytics: PreviewAnalytics | null;
  loading: boolean;
  error: string | null;
  generatePreview: (uploadId: string, options?: GeneratePreviewOptions) => Promise<void>;
  getAnalytics: (uploadId: string) => Promise<void>;
  deletePreview: (uploadId: string) => Promise<void>;
  clearError: () => void;
}

interface GeneratePreviewOptions {
  previewPercentage?: number;
  watermarkOpacity?: number;
}

export const usePDFPreview = (): UsePDFPreviewReturn => {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [analytics, setAnalytics] = useState<PreviewAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePreview = useCallback(
    async (uploadId: string, options: GeneratePreviewOptions = {}) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/v1/preview/pdf/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            uploadId,
            previewPercentage: options.previewPercentage || 10,
            watermarkOpacity: options.watermarkOpacity || 0.3,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate preview');
        }

        setPreviewData(data.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate preview';
        setError(errorMessage);
        console.error('Preview generation error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getAnalytics = useCallback(async (uploadId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/preview/pdf/analytics/${uploadId}`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get analytics');
      }

      setAnalytics(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get analytics';
      setError(errorMessage);
      console.error('Analytics error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePreview = useCallback(async (uploadId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/preview/pdf/${uploadId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete preview');
      }

      setPreviewData(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete preview';
      setError(errorMessage);
      console.error('Delete preview error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    previewData,
    analytics,
    loading,
    error,
    generatePreview,
    getAnalytics,
    deletePreview,
    clearError,
  };
};

export default usePDFPreview;
