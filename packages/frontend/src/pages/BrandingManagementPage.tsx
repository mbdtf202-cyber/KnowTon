import React, { useState, useEffect } from 'react';
import { useBranding } from '../hooks/useBranding';
import BrandingEditor from '../components/BrandingEditor';
import BrandingPreview from '../components/BrandingPreview';
import { BrandingConfig } from '../types/branding';

const BrandingManagementPage: React.FC = () => {
  const { branding, loading, error, updateBranding, uploadLogo, resetBranding } = useBranding();
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [previewConfig, setPreviewConfig] = useState<BrandingConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (branding) {
      setPreviewConfig(branding);
    }
  }, [branding]);

  const handleSave = async (config: BrandingConfig) => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      await updateBranding(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save branding:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      const logoUrl = await uploadLogo(file);
      if (previewConfig) {
        setPreviewConfig({ ...previewConfig, logoUrl });
      }
    } catch (err) {
      console.error('Failed to upload logo:', err);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset branding to defaults? This cannot be undone.')) {
      try {
        await resetBranding();
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err) {
        console.error('Failed to reset branding:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading branding settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-red-600">Error loading branding: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Branding Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Customize your platform's appearance and branding
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {saveSuccess && (
                <div className="flex items-center text-green-600">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Saved successfully
                </div>
              )}
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('editor')}
                className={`${
                  activeTab === 'editor'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`${
                  activeTab === 'preview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Preview
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'editor' && previewConfig && (
          <BrandingEditor
            config={previewConfig}
            onChange={setPreviewConfig}
            onSave={handleSave}
            onLogoUpload={handleLogoUpload}
            saving={saving}
          />
        )}

        {activeTab === 'preview' && previewConfig && (
          <BrandingPreview config={previewConfig} />
        )}
      </div>
    </div>
  );
};

export default BrandingManagementPage;
