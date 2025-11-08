import { useState, useCallback } from 'react';
import axios from 'axios';

interface AudioPreviewOptions {
  duration?: number;
  watermarkInterval?: number;
  watermarkVolume?: number;
}

interface AudioPreviewResult {
  uploadId: string;
  previewUrl: string;
  duration: number;
  fileSize: number;
  bitrate: number;
  sampleRate: number;
  channels: number;
}

interface AudioPreviewAnalytics {
  totalPlays: number;
  uniqueListeners: number;
  avgListenDuration: number;
}

export const useAudioPreview = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate audio preview
   */
  const generatePreview = useCallback(
    async (
      uploadId: string,
      options: AudioPreviewOptions = {}
    ): Promise<AudioPreviewResult | null> => {
      setIsGenerating(true);
      setError(null);

      try {
        const response = await axios.post('/api/v1/audio-preview/generate', {
          uploadId,
          ...options,
        });

        if (response.data.success) {
          return response.data.data;
        } else {
          throw new Error(response.data.error || 'Failed to generate preview');
        }
      } catch (err) {
        const errorMessage =
          axios.isAxiosError(err) && err.response?.data?.error
            ? err.response.data.error
            : 'Failed to generate audio preview';
        setError(errorMessage);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  /**
   * Get preview analytics
   */
  const getAnalytics = useCallback(
    async (uploadId: string): Promise<AudioPreviewAnalytics | null> => {
      setError(null);

      try {
        const response = await axios.get(
          `/api/v1/audio-preview/analytics/${uploadId}`
        );

        if (response.data.success) {
          return response.data.data;
        } else {
          throw new Error(response.data.error || 'Failed to get analytics');
        }
      } catch (err) {
        const errorMessage =
          axios.isAxiosError(err) && err.response?.data?.error
            ? err.response.data.error
            : 'Failed to get preview analytics';
        setError(errorMessage);
        return null;
      }
    },
    []
  );

  /**
   * Delete preview
   */
  const deletePreview = useCallback(async (uploadId: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await axios.delete(`/api/v1/audio-preview/${uploadId}`);

      if (response.data.success) {
        return true;
      } else {
        throw new Error(response.data.error || 'Failed to delete preview');
      }
    } catch (err) {
      const errorMessage =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'Failed to delete audio preview';
      setError(errorMessage);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  /**
   * Get preview URL
   */
  const getPreviewUrl = useCallback((uploadId: string): string => {
    return `/api/v1/audio-preview/${uploadId}`;
  }, []);

  return {
    generatePreview,
    getAnalytics,
    deletePreview,
    getPreviewUrl,
    isGenerating,
    isDeleting,
    error,
  };
};
