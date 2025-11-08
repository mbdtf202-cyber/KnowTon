import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

const prisma = new PrismaClient();

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

class BrandingService {
  private readonly defaultBranding: BrandingConfig = {
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    accentColor: '#10B981',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    companyName: 'KnowTon',
    tagline: 'Decentralized Knowledge Marketplace',
    footerText: '© 2025 KnowTon. All rights reserved.'
  };

  /**
   * Get tenant branding configuration
   */
  async getBranding(tenantId: string): Promise<BrandingConfig> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { tenantConfig: true }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const config = tenant.tenantConfig;
    if (!config) {
      return this.defaultBranding;
    }

    return {
      logoUrl: config.logoUrl || undefined,
      primaryColor: config.primaryColor || this.defaultBranding.primaryColor,
      secondaryColor: config.secondaryColor || this.defaultBranding.secondaryColor,
      customCss: config.customCss || undefined,
      customDomain: tenant.domain || undefined,
      companyName: tenant.name,
      ...(tenant.customBranding as any || {})
    };
  }

  /**
   * Update tenant branding
   */
  async updateBranding(tenantId: string, branding: BrandingConfig) {
    // Validate colors
    if (branding.primaryColor && !this.isValidColor(branding.primaryColor)) {
      throw new Error('Invalid primary color format');
    }
    if (branding.secondaryColor && !this.isValidColor(branding.secondaryColor)) {
      throw new Error('Invalid secondary color format');
    }
    if (branding.accentColor && !this.isValidColor(branding.accentColor)) {
      throw new Error('Invalid accent color format');
    }

    // Validate custom CSS (basic security check)
    if (branding.customCss) {
      this.validateCustomCSS(branding.customCss);
    }

    // Update tenant config
    const config = await prisma.tenantConfig.upsert({
      where: { tenantId },
      update: {
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        customCss: branding.customCss
      },
      create: {
        tenantId,
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        customCss: branding.customCss,
        enableNFT: true,
        enableBonds: true,
        enableFractionalization: true,
        enableEnterprise: false,
        maxContentSize: 2147483648,
        maxUploadRate: 100,
        rateLimitPerMin: 100,
        allowedDomains: [],
        ipWhitelist: []
      }
    });

    // Update tenant custom branding
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customBranding: {
          faviconUrl: branding.faviconUrl,
          accentColor: branding.accentColor,
          backgroundColor: branding.backgroundColor,
          textColor: branding.textColor,
          customFonts: branding.customFonts,
          tagline: branding.tagline,
          footerText: branding.footerText,
          socialLinks: branding.socialLinks
        },
        domain: branding.customDomain
      }
    });

    return this.getBranding(tenantId);
  }

  /**
   * Upload logo file
   */
  async uploadLogo(tenantId: string, file: Express.Multer.File): Promise<string> {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only PNG, JPEG, SVG, and WebP are allowed');
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('File size too large. Maximum 2MB allowed');
    }

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `logo-${tenantId}-${Date.now()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'branding');
    const filepath = path.join(uploadDir, filename);

    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Save file
    await fs.writeFile(filepath, file.buffer);

    // Return URL (in production, this would be a CDN URL)
    const logoUrl = `/uploads/branding/${filename}`;

    // Update tenant config
    await prisma.tenantConfig.upsert({
      where: { tenantId },
      update: { logoUrl },
      create: {
        tenantId,
        logoUrl,
        enableNFT: true,
        enableBonds: true,
        enableFractionalization: true,
        enableEnterprise: false,
        maxContentSize: 2147483648,
        maxUploadRate: 100,
        rateLimitPerMin: 100,
        allowedDomains: [],
        ipWhitelist: []
      }
    });

    return logoUrl;
  }

  /**
   * Generate theme CSS from branding config
   */
  async generateThemeCSS(tenantId: string): Promise<string> {
    const branding = await this.getBranding(tenantId);

    const css = `
/* Auto-generated theme CSS for tenant: ${tenantId} */
:root {
  --primary-color: ${branding.primaryColor || this.defaultBranding.primaryColor};
  --secondary-color: ${branding.secondaryColor || this.defaultBranding.secondaryColor};
  --accent-color: ${branding.accentColor || this.defaultBranding.accentColor};
  --background-color: ${branding.backgroundColor || this.defaultBranding.backgroundColor};
  --text-color: ${branding.textColor || this.defaultBranding.textColor};
}

/* Primary color applications */
.btn-primary,
.bg-primary {
  background-color: var(--primary-color) !important;
}

.text-primary,
.link-primary {
  color: var(--primary-color) !important;
}

.border-primary {
  border-color: var(--primary-color) !important;
}

/* Secondary color applications */
.btn-secondary,
.bg-secondary {
  background-color: var(--secondary-color) !important;
}

.text-secondary {
  color: var(--secondary-color) !important;
}

/* Accent color applications */
.btn-accent,
.bg-accent {
  background-color: var(--accent-color) !important;
}

.text-accent {
  color: var(--accent-color) !important;
}

/* Background and text */
body {
  background-color: var(--background-color);
  color: var(--text-color);
}

/* Custom fonts */
${branding.customFonts?.heading ? `
h1, h2, h3, h4, h5, h6 {
  font-family: ${branding.customFonts.heading}, sans-serif;
}
` : ''}

${branding.customFonts?.body ? `
body, p, span, div {
  font-family: ${branding.customFonts.body}, sans-serif;
}
` : ''}

/* Custom CSS */
${branding.customCss || ''}
`.trim();

    return css;
  }

  /**
   * Preview branding without saving
   */
  async previewBranding(branding: BrandingConfig) {
    // Validate colors
    if (branding.primaryColor && !this.isValidColor(branding.primaryColor)) {
      throw new Error('Invalid primary color format');
    }
    if (branding.secondaryColor && !this.isValidColor(branding.secondaryColor)) {
      throw new Error('Invalid secondary color format');
    }

    // Generate preview CSS
    const css = `
:root {
  --primary-color: ${branding.primaryColor || this.defaultBranding.primaryColor};
  --secondary-color: ${branding.secondaryColor || this.defaultBranding.secondaryColor};
  --accent-color: ${branding.accentColor || this.defaultBranding.accentColor};
}
${branding.customCss || ''}
`.trim();

    return {
      branding,
      css,
      preview: true
    };
  }

  /**
   * Reset branding to defaults
   */
  async resetBranding(tenantId: string) {
    await prisma.tenantConfig.update({
      where: { tenantId },
      data: {
        logoUrl: null,
        primaryColor: this.defaultBranding.primaryColor,
        secondaryColor: this.defaultBranding.secondaryColor,
        customCss: null
      }
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        customBranding: null
      }
    });

    return this.defaultBranding;
  }

  /**
   * Validate color format (hex, rgb, rgba)
   */
  private isValidColor(color: string): boolean {
    // Hex color
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      return true;
    }
    // RGB/RGBA
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(color)) {
      return true;
    }
    return false;
  }

  /**
   * Validate custom CSS for security
   */
  private validateCustomCSS(css: string): void {
    // Check for dangerous patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /expression\(/i,
      /import\s+/i,
      /@import/i,
      /behavior:/i,
      /-moz-binding/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(css)) {
        throw new Error('Custom CSS contains potentially dangerous code');
      }
    }

    // Check CSS size (max 50KB)
    if (css.length > 50 * 1024) {
      throw new Error('Custom CSS too large. Maximum 50KB allowed');
    }
  }
}

export default new BrandingService();
