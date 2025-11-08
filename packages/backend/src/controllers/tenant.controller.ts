import { Request, Response } from 'express';
import tenantService from '../services/tenant.service';

class TenantController {
  /**
   * Create a new tenant
   * POST /api/v1/tenants
   */
  async createTenant(req: Request, res: Response) {
    try {
      const tenant = await tenantService.createTenant(req.body);

      res.status(201).json({
        success: true,
        data: tenant
      });
    } catch (error: any) {
      console.error('Create tenant error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create tenant'
      });
    }
  }

  /**
   * Get tenant by ID
   * GET /api/v1/tenants/:id
   */
  async getTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenant = await tenantService.getTenantById(id);

      res.json({
        success: true,
        data: tenant
      });
    } catch (error: any) {
      console.error('Get tenant error:', error);
      res.status(404).json({
        success: false,
        error: error.message || 'Tenant not found'
      });
    }
  }

  /**
   * Get tenant by slug
   * GET /api/v1/tenants/slug/:slug
   */
  async getTenantBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const tenant = await tenantService.getTenantBySlug(slug);

      res.json({
        success: true,
        data: tenant
      });
    } catch (error: any) {
      console.error('Get tenant by slug error:', error);
      res.status(404).json({
        success: false,
        error: error.message || 'Tenant not found'
      });
    }
  }

  /**
   * List all tenants
   * GET /api/v1/tenants
   */
  async listTenants(req: Request, res: Response) {
    try {
      const filters = {
        status: req.query.status as string,
        plan: req.query.plan as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
      };

      const result = await tenantService.listTenants(filters);

      res.json({
        success: true,
        data: result.tenants,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('List tenants error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list tenants'
      });
    }
  }

  /**
   * Update tenant
   * PUT /api/v1/tenants/:id
   */
  async updateTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenant = await tenantService.updateTenant(id, req.body);

      res.json({
        success: true,
        data: tenant
      });
    } catch (error: any) {
      console.error('Update tenant error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update tenant'
      });
    }
  }

  /**
   * Update tenant configuration
   * PUT /api/v1/tenants/:id/config
   */
  async updateTenantConfig(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const config = await tenantService.updateTenantConfig(id, req.body);

      res.json({
        success: true,
        data: config
      });
    } catch (error: any) {
      console.error('Update tenant config error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update tenant configuration'
      });
    }
  }

  /**
   * Delete tenant
   * DELETE /api/v1/tenants/:id
   */
  async deleteTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await tenantService.deleteTenant(id);

      res.json({
        success: true,
        message: 'Tenant deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete tenant error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete tenant'
      });
    }
  }

  /**
   * Suspend tenant
   * POST /api/v1/tenants/:id/suspend
   */
  async suspendTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const tenant = await tenantService.suspendTenant(id, reason);

      res.json({
        success: true,
        data: tenant
      });
    } catch (error: any) {
      console.error('Suspend tenant error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to suspend tenant'
      });
    }
  }

  /**
   * Activate tenant
   * POST /api/v1/tenants/:id/activate
   */
  async activateTenant(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenant = await tenantService.activateTenant(id);

      res.json({
        success: true,
        data: tenant
      });
    } catch (error: any) {
      console.error('Activate tenant error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to activate tenant'
      });
    }
  }

  /**
   * Create API key for tenant
   * POST /api/v1/tenants/:id/api-keys
   */
  async createApiKey(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const apiKey = await tenantService.createApiKey({
        tenantId: id,
        ...req.body
      });

      res.status(201).json({
        success: true,
        data: apiKey,
        message: 'API key created. Save the secret securely - it will not be shown again.'
      });
    } catch (error: any) {
      console.error('Create API key error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create API key'
      });
    }
  }

  /**
   * List API keys for tenant
   * GET /api/v1/tenants/:id/api-keys
   */
  async listApiKeys(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const apiKeys = await tenantService.listApiKeys(id);

      res.json({
        success: true,
        data: apiKeys
      });
    } catch (error: any) {
      console.error('List API keys error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list API keys'
      });
    }
  }

  /**
   * Revoke API key
   * DELETE /api/v1/tenants/:id/api-keys/:keyId
   */
  async revokeApiKey(req: Request, res: Response) {
    try {
      const { keyId } = req.params;
      await tenantService.revokeApiKey(keyId);

      res.json({
        success: true,
        message: 'API key revoked successfully'
      });
    } catch (error: any) {
      console.error('Revoke API key error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to revoke API key'
      });
    }
  }

  /**
   * Get tenant usage metrics
   * GET /api/v1/tenants/:id/usage
   */
  async getTenantUsage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string) 
        : undefined;
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string) 
        : undefined;

      const metrics = await tenantService.getTenantUsage(id, startDate, endDate);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error: any) {
      console.error('Get tenant usage error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get tenant usage'
      });
    }
  }

  /**
   * Check tenant limits
   * GET /api/v1/tenants/:id/limits
   */
  async checkLimits(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const limits = await tenantService.checkLimits(id);

      res.json({
        success: true,
        data: limits
      });
    } catch (error: any) {
      console.error('Check limits error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check limits'
      });
    }
  }

  /**
   * Get current tenant info (from middleware)
   * GET /api/v1/tenant/current
   */
  async getCurrentTenant(req: Request, res: Response) {
    try {
      if (!req.tenant) {
        return res.status(404).json({
          success: false,
          error: 'No tenant context found'
        });
      }

      const tenant = await tenantService.getTenantById(req.tenant.id);

      res.json({
        success: true,
        data: tenant
      });
    } catch (error: any) {
      console.error('Get current tenant error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get current tenant'
      });
    }
  }
}

export default new TenantController();
