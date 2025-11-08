import { useState, useEffect } from 'react';
import { BrandingConfig } from '../types/branding';
import api from '../services/api';

export const useBranding = () => {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranding = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/branding');
      setBranding(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch branding:', err);
      setError(err.response?.data?.error || 'Failed to load branding');
    } finally {
      setLoading(false);
    }
  };

  const updateBranding = async (config: BrandingConfig) => {
    try {
      const response = await api.put('/branding', config);
      setBranding(response.data.data);
      return response.data.data;
    } catch (err: any) {
      console.error('Failed to update branding:', err);
      throw new Error(err.response?.data?.error || 'Failed to update branding');
    }
  };

  const uploadLogo = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await api.post('/branding/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const logoUrl = response.data.data.logoUrl;
      
      // Update local state
      if (branding) {
        setBranding({ ...branding, logoUrl });
      }

      return logoUrl;
    } catch (err: any) {
      console.error('Failed to upload logo:', err);
      throw new Error(err.response?.data?.error || 'Failed to upload logo');
    }
  };

  const previewBranding = async (config: BrandingConfig) => {
    try {
      const response = await api.post('/branding/preview', config);
      return response.data.data;
    } catch (err: any) {
      console.error('Failed to preview branding:', err);
      throw new Error(err.response?.data?.error || 'Failed to preview branding');
    }
  };

  const resetBranding = async () => {
    try {
      const response = await api.post('/branding/reset');
      setBranding(response.data.data);
      return response.data.data;
    } catch (err: any) {
      console.error('Failed to reset branding:', err);
      throw new Error(err.response?.data?.error || 'Failed to reset branding');
    }
  };

  const getThemeCSS = async (): Promise<string> => {
    try {
      const response = await api.get('/branding/theme.css');
      return response.data;
    } catch (err: any) {
      console.error('Failed to get theme CSS:', err);
      throw new Error('Failed to get theme CSS');
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  return {
    branding,
    loading,
    error,
    updateBranding,
    uploadLogo,
    previewBranding,
    resetBranding,
    getThemeCSS,
    refetch: fetchBranding
  };
};
