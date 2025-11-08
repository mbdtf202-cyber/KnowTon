import { Request, Response } from 'express';
import apiCustomizationService from '../services/api-customization.service';

class ApiCustomizationController {
  /**
   * Create custom API endpoint
   */
  async createApiEndpoint(req: Request, res: Response) {
    try {
      const { tenantId, path, method, enabled, rateLimit, requiresAuth, customLogic, metadata } = req.body;

      if (!tenantId || !path || !method) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'tenantId, path, and method are required'
        });
      }

      const endpoint = await apiCustomizationService.createApiEndpoint({
        tenantId,
        path,
        method,
        enabled,
        rateLimit,
        requiresAuth,
        customLogic,
        metadata
      });

      res.status(201).json({
        success: true,
        data: endpoint
      });
    } catch (error: any) {
      console.error('Create API endpoint error:', error);
      res.status(500).json({
        error: 'Failed to create API endpoint',
        message: error.message
      });
    }
  }

  /**
   * Get API endpoint
   */
  async getApiEndpoint(req: Request, res: Response) {
    try {
      const { tenantId, path, method } = req.params;

      const endpoint = await apiCustomizationService.getApiEndpoint(
        tenantId,
        decodeURIComponent(path),
        method
      );

      res.json({
        success: true,
        data: endpoint
      });
    } catch (error: any) {
      console.error('Get API endpoint error:', error);
      res.status(404).json({
        error: 'API endpoint not found',
        message: error.message
      });
    }
  }

  /**
   * List API endpoints for tenant
   */
  async listApiEndpoints(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const { enabled, method, search } = req.query;

      const endpoints = await apiCustomizationService.listApiEndpoints(tenantId, {
        enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
        method: method as string,
        search: search as string
      });

      res.json({
        success: true,
        data: endpoints,
        count: endpoints.length
      });
    } catch (error: any) {
      console.error('List API endpoints error:', error);
      res.status(500).json({
        error: 'Failed to list API endpoints',
        message: error.message
      });
    }
  }

  /**
   * Update API endpoint
   */
  async updateApiEndpoint(req: Request, res: Response) {
    try {
      const { tenantId, path, method } = req.params;
      const updates = req.body;

      const endpoint = await apiCustomizationService.updateApiEndpoint(
        tenantId,
        decodeURIComponent(path),
        method,
        updates
      );

      res.json({
        success: true,
        data: endpoint
      });
    } catch (error: any) {
      console.error('Update API endpoint error:', error);
      res.status(500).json({
        error: 'Failed to update API endpoint',
        message: error.message
      });
    }
  }

  /**
   * Delete API endpoint
   */
  async deleteApiEndpoint(req: Request, res: Response) {
    try {
      const { tenantId, path, method } = req.params;

      await apiCustomizationService.deleteApiEndpoint(
        tenantId,
        decodeURIComponent(path),
        method
      );

      res.json({
        success: true,
        message: 'API endpoint deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete API endpoint error:', error);
      res.status(500).json({
        error: 'Failed to delete API endpoint',
        message: error.message
      });
    }
  }

  /**
   * Create API key with custom permissions
   */
  async createApiKey(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const { name, permissions, expiresAt } = req.body;

      if (!name || !permissions) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'name and permissions are required'
        });
      }

      const apiKey = await apiCustomizationService.createApiKey({
        tenantId,
        name,
        permissions,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });

      res.status(201).json({
        success: true,
        data: apiKey,
        message: 'API key created successfully. Save the secret securely - it will not be shown again.'
      });
    } catch (error: any) {
      console.error('Create API key error:', error);
      res.status(500).json({
        error: 'Failed to create API key',
        message: error.message
      });
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const { path, method } = req.query;

      if (!path || !method) {
        return res.status(400).json({
          error: 'Missing required parameters',
          message: 'path and method query parameters are required'
        });
      }

      const validation = await apiCustomizationService.validateApiKey(
        key,
        path as string,
        method as string
      );

      res.json({
        success: true,
        data: validation
      });
    } catch (error: any) {
      console.error('Validate API key error:', error);
      res.status(500).json({
        error: 'Failed to validate API key',
        message: error.message
      });
    }
  }

  /**
   * Get API key usage statistics
   */
  async getApiKeyUsage(req: Request, res: Response) {
    try {
      const { keyId } = req.params;
      const { startDate, endDate } = req.query;

      const usage = await apiCustomizationService.getApiKeyUsage(
        keyId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: usage
      });
    } catch (error: any) {
      console.error('Get API key usage error:', error);
      res.status(500).json({
        error: 'Failed to get API key usage',
        message: error.message
      });
    }
  }

  /**
   * Get tenant rate limit configuration
   */
  async getTenantRateLimit(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const { endpoint } = req.query;

      const rateLimit = await apiCustomizationService.getTenantRateLimit(
        tenantId,
        endpoint as string
      );

      res.json({
        success: true,
        data: {
          rateLimit,
          endpoint: endpoint || 'default'
        }
      });
    } catch (error: any) {
      console.error('Get tenant rate limit error:', error);
      res.status(500).json({
        error: 'Failed to get rate limit',
        message: error.message
      });
    }
  }

  /**
   * Check IP whitelist
   */
  async checkIpWhitelist(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const { ipAddress } = req.query;

      if (!ipAddress) {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'ipAddress query parameter is required'
        });
      }

      const allowed = await apiCustomizationService.isIpWhitelisted(
        tenantId,
        ipAddress as string
      );

      res.json({
        success: true,
        data: {
          ipAddress,
          allowed
        }
      });
    } catch (error: any) {
      console.error('Check IP whitelist error:', error);
      res.status(500).json({
        error: 'Failed to check IP whitelist',
        message: error.message
      });
    }
  }

  /**
   * Check origin allowlist
   */
  async checkOrigin(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const { origin } = req.query;

      if (!origin) {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'origin query parameter is required'
        });
      }

      const allowed = await apiCustomizationService.isOriginAllowed(
        tenantId,
        origin as string
      );

      res.json({
        success: true,
        data: {
          origin,
          allowed
        }
      });
    } catch (error: any) {
      console.error('Check origin error:', error);
      res.status(500).json({
        error: 'Failed to check origin',
        message: error.message
      });
    }
  }
}

export default new ApiCustomizationController();