export interface BrandingConfig {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  customCss?: string;
  customFonts?: {
    heading?: string;
    body?: string;
  };
  customDomain?: string;
  companyName?: string;
  tagline?: string;
  footerText?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    discord?: string;
  };
}

export interface BrandingPreview {
  branding: BrandingConfig;
  css: string;
  preview: boolean;
}
