import React from 'react';
import { BrandingConfig } from '../types/branding';

interface BrandingPreviewProps {
  config: BrandingConfig;
}

const BrandingPreview: React.FC<BrandingPreviewProps> = ({ config }) => {
  const generatePreviewCSS = () => {
    return `
      .preview-container {
        --primary-color: ${config.primaryColor || '#3B82F6'};
        --secondary-color: ${config.secondaryColor || '#8B5CF6'};
        --accent-color: ${config.accentColor || '#10B981'};
        --background-color: ${config.backgroundColor || '#FFFFFF'};
        --text-color: ${config.textColor || '#1F2937'};
      }
    `;
  };

  return (
    <div className="space-y-6">
      <style>{generatePreviewCSS()}</style>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Live Preview</h3>
        <p className="text-sm text-gray-500 mb-6">
          This is how your platform will look with the current branding settings.
        </p>

        {/* Preview Container */}
        <div 
          className="preview-container border-2 border-gray-200 rounded-lg overflow-hidden"
          style={{
            backgroundColor: config.backgroundColor || '#FFFFFF',
            color: config.textColor || '#1F2937',
            fontFamily: config.customFonts?.body || 'inherit'
          }}
        >
          {/* Header Preview */}
          <div 
            className="px-6 py-4 border-b"
            style={{ 
              backgroundColor: config.primaryColor || '#3B82F6',
              color: '#FFFFFF'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {config.logoUrl ? (
                  <img 
                    src={config.logoUrl} 
                    alt="Logo" 
                    className="h-8 w-auto"
                  />
                ) : (
                  <div className="h-8 w-32 bg-white bg-opacity-20 rounded flex items-center justify-center text-xs">
                    Your Logo
                  </div>
                )}
                <span 
                  className="text-xl font-bold"
                  style={{ fontFamily: config.customFonts?.heading || 'inherit' }}
                >
                  {config.companyName || 'Your Company'}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <button className="px-4 py-2 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors">
                  Home
                </button>
                <button className="px-4 py-2 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors">
                  Explore
                </button>
                <button className="px-4 py-2 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors">
                  Profile
                </button>
              </div>
            </div>
          </div>

          {/* Hero Section Preview */}
          <div className="px-6 py-12 text-center">
            <h1 
              className="text-4xl font-bold mb-4"
              style={{ 
                fontFamily: config.customFonts?.heading || 'inherit',
                color: config.textColor || '#1F2937'
              }}
            >
              Welcome to {config.companyName || 'Your Platform'}
            </h1>
            <p className="text-lg mb-8" style={{ color: config.textColor || '#1F2937' }}>
              {config.tagline || 'Your platform tagline goes here'}
            </p>
            <div className="flex justify-center space-x-4">
              <button 
                className="px-6 py-3 rounded-lg font-medium text-white transition-colors"
                style={{ 
                  backgroundColor: config.primaryColor || '#3B82F6'
                }}
              >
                Get Started
              </button>
              <button 
                className="px-6 py-3 rounded-lg font-medium text-white transition-colors"
                style={{ 
                  backgroundColor: config.secondaryColor || '#8B5CF6'
                }}
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Content Cards Preview */}
          <div className="px-6 py-8 bg-gray-50">
            <h2 
              className="text-2xl font-bold mb-6"
              style={{ 
                fontFamily: config.customFonts?.heading || 'inherit',
                color: config.textColor || '#1F2937'
              }}
            >
              Featured Content
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div 
                    className="h-32"
                    style={{ backgroundColor: config.secondaryColor || '#8B5CF6' }}
                  ></div>
                  <div className="p-4">
                    <h3 
                      className="font-semibold mb-2"
                      style={{ 
                        fontFamily: config.customFonts?.heading || 'inherit',
                        color: config.textColor || '#1F2937'
                      }}
                    >
                      Content Title {i}
                    </h3>
                    <p className="text-sm mb-4" style={{ color: config.textColor || '#1F2937' }}>
                      This is a preview of how content cards will appear.
                    </p>
                    <button 
                      className="w-full py-2 rounded font-medium text-white transition-colors"
                      style={{ backgroundColor: config.accentColor || '#10B981' }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Preview */}
          <div 
            className="px-6 py-8 border-t"
            style={{ 
              backgroundColor: config.primaryColor || '#3B82F6',
              color: '#FFFFFF'
            }}
          >
            <div className="text-center">
              <p className="text-sm">
                {config.footerText || '© 2025 Your Company. All rights reserved.'}
              </p>
              {config.socialLinks && (
                <div className="mt-4 flex justify-center space-x-4">
                  {config.socialLinks.twitter && (
                    <a href="#" className="hover:opacity-80">Twitter</a>
                  )}
                  {config.socialLinks.linkedin && (
                    <a href="#" className="hover:opacity-80">LinkedIn</a>
                  )}
                  {config.socialLinks.github && (
                    <a href="#" className="hover:opacity-80">GitHub</a>
                  )}
                  {config.socialLinks.discord && (
                    <a href="#" className="hover:opacity-80">Discord</a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Custom CSS Preview */}
        {config.customCss && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Custom CSS Applied</h4>
            <div className="bg-gray-50 rounded-md p-4">
              <pre className="text-xs text-gray-600 overflow-x-auto">
                {config.customCss}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Color Palette */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Color Palette</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Primary', color: config.primaryColor || '#3B82F6' },
            { label: 'Secondary', color: config.secondaryColor || '#8B5CF6' },
            { label: 'Accent', color: config.accentColor || '#10B981' },
            { label: 'Background', color: config.backgroundColor || '#FFFFFF' },
            { label: 'Text', color: config.textColor || '#1F2937' }
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div 
                className="w-full h-20 rounded-lg border-2 border-gray-200 mb-2"
                style={{ backgroundColor: item.color }}
              ></div>
              <p className="text-sm font-medium text-gray-700">{item.label}</p>
              <p className="text-xs text-gray-500 font-mono">{item.color}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Typography Preview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Typography</h3>
        <div className="space-y-4">
          {config.customFonts?.heading && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Heading Font</p>
              <p 
                className="text-2xl font-bold"
                style={{ fontFamily: config.customFonts.heading }}
              >
                {config.customFonts.heading}
              </p>
            </div>
          )}
          {config.customFonts?.body && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Body Font</p>
              <p 
                className="text-base"
                style={{ fontFamily: config.customFonts.body }}
              >
                {config.customFonts.body} - The quick brown fox jumps over the lazy dog.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrandingPreview;
