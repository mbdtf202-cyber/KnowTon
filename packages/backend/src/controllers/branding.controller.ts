import { Request, Response } from 'express';
import brandingService from '../services/branding.service';

class BrandingController {
  /**
   * Get tenant branding configuration
   */
  async getBranding(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'Tenant context required'
        });
      }

      const branding = await brandingService.getBranding(tenantId);

      res.json({
        success: true,
        data: branding
      });
    } catch (error: any) {
      console.error('Get branding error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get branding'
      });
    }
  }

  /**
   * Update tenant branding
   */
  async updateBranding(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'Tenant context required'
        });
      }

      const branding = await brandingService.updateBranding(tenantId, req.body);

      res.json({
        success: true,
        data: branding
      });
    } catch (error: any) {
      console.error('Update branding error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update branding'
      });
    }
  }

  /**
   * Upload logo
   */
  async uploadLogo(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'Tenant context required'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const logoUrl = await brandingService.uploadLogo(tenantId, req.file);

      res.json({
        success: true,
        data: { logoUrl }
      });
    } catch (error: any) {
      console.error('Upload logo error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload logo'
      });
    }
  }

  /**
   * Get theme CSS
   */
  async getThemeCSS(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'Tenant context required'
        });
      }

      const css = await brandingService.generateThemeCSS(tenantId);

      res.setHeader('Content-Type', 'text/css');
      res.send(css);
    } catch (error: any) {
      console.error('Get theme CSS error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate theme CSS'
      });
    }
  }

  /**
   * Preview branding
   */
  async previewBranding(req: Request, res: Response) {
    try {
      const preview = await brandingService.previewBranding(req.body);

      res.json({
        success: true,
        data: preview
      });
    } catch (error: any) {
      console.error('Preview branding error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to preview branding'
      });
    }
  }

  /**
   * Reset branding to defaults
   */
  async resetBranding(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: 'Tenant context required'
        });
      }

      const branding = await brandingService.resetBranding(tenantId);

      res.json({
        success: true,
        data: branding
      });
    } catch (error: any) {
      console.error('Reset branding error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to reset branding'
      });
    }
  }
}

export default new BrandingController();
