import React, { useState, useRef } from 'react';
import { BrandingConfig } from '../types/branding';

interface BrandingEditorProps {
  config: BrandingConfig;
  onChange: (config: BrandingConfig) => void;
  onSave: (config: BrandingConfig) => void;
  onLogoUpload: (file: File) => void;
  saving: boolean;
}

const BrandingEditor: React.FC<BrandingEditorProps> = ({
  config,
  onChange,
  onSave,
  onLogoUpload,
  saving
}) => {
  const [activeSection, setActiveSection] = useState<'logo' | 'colors' | 'typography' | 'domain' | 'custom'>('logo');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof BrandingConfig, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const handleNestedChange = (parent: keyof BrandingConfig, field: string, value: any) => {
    onChange({
      ...config,
      [parent]: {
        ...(config[parent] as any || {}),
        [field]: value
      }
    });
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLogoUpload(file);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-1">
        <nav className="space-y-1">
          {[
            { id: 'logo', label: 'Logo & Favicon', icon: '🎨' },
            { id: 'colors', label: 'Colors', icon: '🌈' },
            { id: 'typography', label: 'Typography', icon: '📝' },
            { id: 'domain', label: 'Custom Domain', icon: '🌐' },
            { id: 'custom', label: 'Custom CSS', icon: '💻' }
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`${
                activeSection === section.id
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } group w-full flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors`}
            >
              <span className="mr-3 text-lg">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3">
        <div className="bg-white shadow rounded-lg p-6">
          {/* Logo & Favicon Section */}
          {activeSection === 'logo' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Logo & Favicon</h3>
                
                {/* Logo Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo
                  </label>
                  <div className="flex items-center space-x-4">
                    {config.logoUrl && (
                      <div className="w-32 h-32 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        <img
                          src={config.logoUrl}
                          alt="Logo"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleLogoSelect}
                        className="hidden"
                      />
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Upload Logo
                      </button>
                      <p className="mt-2 text-xs text-gray-500">
                        PNG, JPEG, SVG, or WebP. Max 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Favicon URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Favicon URL
                  </label>
                  <input
                    type="url"
                    value={config.faviconUrl || ''}
                    onChange={(e) => handleChange('faviconUrl', e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Colors Section */}
          {activeSection === 'colors' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Color Scheme</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { field: 'primaryColor', label: 'Primary Color', default: '#3B82F6' },
                  { field: 'secondaryColor', label: 'Secondary Color', default: '#8B5CF6' },
                  { field: 'accentColor', label: 'Accent Color', default: '#10B981' },
                  { field: 'backgroundColor', label: 'Background Color', default: '#FFFFFF' },
                  { field: 'textColor', label: 'Text Color', default: '#1F2937' }
                ].map((colorField) => (
                  <div key={colorField.field}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {colorField.label}
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={config[colorField.field as keyof BrandingConfig] as string || colorField.default}
                        onChange={(e) => handleChange(colorField.field as keyof BrandingConfig, e.target.value)}
                        className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config[colorField.field as keyof BrandingConfig] as string || colorField.default}
                        onChange={(e) => handleChange(colorField.field as keyof BrandingConfig, e.target.value)}
                        placeholder="#000000"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Typography Section */}
          {activeSection === 'typography' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Typography</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heading Font
                </label>
                <input
                  type="text"
                  value={config.customFonts?.heading || ''}
                  onChange={(e) => handleNestedChange('customFonts', 'heading', e.target.value)}
                  placeholder="e.g., 'Inter', 'Roboto', 'Poppins'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Font family for headings (h1-h6)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Body Font
                </label>
                <input
                  type="text"
                  value={config.customFonts?.body || ''}
                  onChange={(e) => handleNestedChange('customFonts', 'body', e.target.value)}
                  placeholder="e.g., 'Inter', 'Roboto', 'Open Sans'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Font family for body text
                </p>
              </div>
            </div>
          )}

          {/* Custom Domain Section */}
          {activeSection === 'domain' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Domain</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={config.customDomain || ''}
                  onChange={(e) => handleChange('customDomain', e.target.value)}
                  placeholder="app.yourcompany.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Enter your custom domain. Make sure to configure DNS records:
                </p>
                <div className="mt-3 p-4 bg-gray-50 rounded-md">
                  <p className="text-sm font-mono text-gray-700">
                    CNAME: {config.customDomain || 'your-domain.com'} → knowton.app
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      SSL Certificate
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        SSL certificates are automatically provisioned for custom domains.
                        It may take up to 24 hours for DNS changes to propagate.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom CSS Section */}
          {activeSection === 'custom' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Custom CSS</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSS Code
                </label>
                <textarea
                  value={config.customCss || ''}
                  onChange={(e) => handleChange('customCss', e.target.value)}
                  rows={15}
                  placeholder="/* Add your custom CSS here */&#10;.custom-class {&#10;  color: #333;&#10;}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Maximum 50KB. JavaScript and external imports are not allowed for security reasons.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Security Notice
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Custom CSS is sanitized to prevent XSS attacks. Dangerous patterns
                        like &lt;script&gt;, javascript:, and @import will be rejected.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={() => onSave(config)}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingEditor;
