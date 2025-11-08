import React, { useEffect, useState } from 'react';
import { useBranding } from '../hooks/useBranding';

interface BrandingProviderProps {
  children: React.ReactNode;
}

const BrandingProvider: React.FC<BrandingProviderProps> = ({ children }) => {
  const { branding, getThemeCSS } = useBranding();
  const [cssLoaded, setCssLoaded] = useState(false);

  useEffect(() => {
    if (branding) {
      // Apply branding to document
      applyBranding();
    }
  }, [branding]);

  const applyBranding = async () => {
    if (!branding) return;

    // Update favicon
    if (branding.faviconUrl) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = branding.faviconUrl;
      document.getElementsByTagName('head')[0].appendChild(link);
    }

    // Update page title
    if (branding.companyName) {
      document.title = branding.companyName;
    }

    // Apply CSS variables
    const root = document.documentElement;
    if (branding.primaryColor) {
      root.style.setProperty('--primary-color', branding.primaryColor);
    }
    if (branding.secondaryColor) {
      root.style.setProperty('--secondary-color', branding.secondaryColor);
    }
    if (branding.accentColor) {
      root.style.setProperty('--accent-color', branding.accentColor);
    }
    if (branding.backgroundColor) {
      root.style.setProperty('--background-color', branding.backgroundColor);
    }
    if (branding.textColor) {
      root.style.setProperty('--text-color', branding.textColor);
    }

    // Apply custom fonts
    if (branding.customFonts?.heading) {
      root.style.setProperty('--font-heading', branding.customFonts.heading);
    }
    if (branding.customFonts?.body) {
      root.style.setProperty('--font-body', branding.customFonts.body);
    }

    // Load theme CSS
    try {
      const css = await getThemeCSS();
      
      // Remove existing theme style
      const existingStyle = document.getElementById('tenant-theme');
      if (existingStyle) {
        existingStyle.remove();
      }

      // Add new theme style
      const style = document.createElement('style');
      style.id = 'tenant-theme';
      style.textContent = css;
      document.head.appendChild(style);
      
      setCssLoaded(true);
    } catch (error) {
      console.error('Failed to load theme CSS:', error);
    }
  };

  return <>{children}</>;
};

export default BrandingProvider;
