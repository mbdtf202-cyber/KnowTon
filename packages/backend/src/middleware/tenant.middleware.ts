import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Express Request to include tenant
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        slug: string;
        name: string;
        plan: string;
        config?: any;
      };
    }
  }
}

/**
 * Tenant resolution middleware
 * Resolves tenant from:
 * 1. Custom domain (e.g., acme.knowton.com)
 * 2. Subdomain (e.g., acme.platform.com)
 * 3. X-Tenant-ID header
 * 4. X-Tenant-Slug header
 * 5. API key
 */
export const resolveTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let tenant = null;

    // 1. Try to resolve from custom domain
    const host = req.hostname;
    if (host && !host.includes('localhost')) {
      tenant = await prisma.tenant.findFirst({
        where: { domain: host, status: 'active' },
        include: { tenantConfig: true }
      });
    }

    // 2. Try to resolve from subdomain
    if (!tenant && host) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        tenant = await prisma.tenant.findFirst({
          where: { slug: subdomain, status: 'active' },
          include: { tenantConfig: true }
        });
      }
    }

    // 3. Try to resolve from X-Tenant-ID header
    if (!tenant) {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (tenantId) {
        tenant = await prisma.tenant.findFirst({
          where: { id: tenantId, status: 'active' },
          include: { tenantConfig: true }
        });
      }
    }

    // 4. Try to resolve from X-Tenant-Slug header
    if (!tenant) {
      const tenantSlug = req.headers['x-tenant-slug'] as string;
      if (tenantSlug) {
        tenant = await prisma.tenant.findFirst({
          where: { slug: tenantSlug, status: 'active' },
          include: { tenantConfig: true }
        });
      }
    }

    // 5. Try to resolve from API key
    if (!tenant) {
      const apiKey = req.headers['x-api-key'] as string;
      if (apiKey) {
        const apiKeyRecord = await prisma.tenantApiKey.findFirst({
          where: { key: apiKey, isActive: true },
          include: { tenant: { include: { tenantConfig: true } } }
        });
        if (apiKeyRecord) {
          tenant = apiKeyRecord.tenant;
          // Update last used timestamp
          await prisma.tenantApiKey.update({
            where: { id: apiKeyRecord.id },
            data: { lastUsedAt: new Date() }
          });
        }
      }
    }

    if (tenant) {
      req.tenant = {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
        config: tenant.tenantConfig
      };
    }

    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    next();
  }
};

/**
 * Require tenant middleware
 * Ensures a tenant is resolved before proceeding
 */
export const requireTenant = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.tenant) {
    return res.status(400).json({
      error: 'Tenant not found',
      message: 'Please provide tenant information via domain, subdomain, or headers'
    });
  }
  next();
};

/**
 * Tenant isolation middleware
 * Ensures queries are scoped to the current tenant
 */
export const enforceTenantIsolation = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.tenant) {
    return res.status(403).json({
      error: 'Tenant isolation violation',
      message: 'No tenant context available'
    });
  }

  // Add tenant filter to query params
  if (!req.query.tenantId) {
    req.query.tenantId = req.tenant.id;
  }

  next();
};

/**
 * Check tenant feature access
 */
export const checkTenantFeature = (feature: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant || !req.tenant.config) {
      return res.status(403).json({
        error: 'Feature not available',
        message: 'Tenant configuration not found'
      });
    }

    const featureEnabled = req.tenant.config[`enable${feature}`];
    if (!featureEnabled) {
      return res.status(403).json({
        error: 'Feature not available',
        message: `Feature '${feature}' is not enabled for this tenant`
      });
    }

    next();
  };
};

/**
 * Check tenant plan access
 */
export const checkTenantPlan = (requiredPlan: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Tenant not found'
      });
    }

    if (!requiredPlan.includes(req.tenant.plan)) {
      return res.status(403).json({
        error: 'Plan upgrade required',
        message: `This feature requires one of the following plans: ${requiredPlan.join(', ')}`
      });
    }

    next();
  };
};
