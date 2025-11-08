import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

export interface CreateTenantInput {
  name: string;
  slug: string;
  domain?: string;
  plan?: string;
  maxUsers?: number;
  maxStorage?: number;
  customBranding?: any;
  features?: any;
  metadata?: any;
}

export interface UpdateTenantInput {
  name?: string;
  domain?: string;
  status?: string;
  plan?: string;
  maxUsers?: number;
  maxStorage?: number;
  customBranding?: any;
  features?: any;
  metadata?: any;
}

export interface TenantConfigInput {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  customCss?: string;
  enableNFT?: boolean;
  enableBonds?: boolean;
  enableFractionalization?: boolean;
  enableEnterprise?: boolean;
  maxContentSize?: number;
  maxUploadRate?: number;
  rateLimitPerMin?: number;
  stripeAccountId?: string;
  paymentMethods?: any;
  emailSettings?: any;
  webhookUrl?: string;
  allowedDomains?: string[];
  ipWhitelist?: string[];
}

export interface CreateApiKeyInput {
  tenantId: string;
  name: string;
  permissions: string[];
  expiresAt?: Date;
}

class TenantService {
  /**
   * Create a new tenant
   */
  async createTenant(input: CreateTenantInput) {
    // Validate slug uniqueness
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: input.slug }
    });

    if (existingTenant) {
      throw new Error('Tenant slug already exists');
    }

    // Validate domain uniqueness if provided
    if (input.domain) {
      const existingDomain = await prisma.tenant.findUnique({
        where: { domain: input.domain }
      });

      if (existingDomain) {
        throw new Error('Domain already in use');
      }
    }

    // Create tenant with default config
    const tenant = await prisma.tenant.create({
      data: {
        name: input.name,
        slug: input.slug,
        domain: input.domain,
        plan: input.plan || 'basic',
        maxUsers: input.maxUsers || 10,
        maxStorage: input.maxStorage || 10737418240, // 10GB
        customBranding: input.customBranding,
        features: input.features,
        metadata: input.metadata,
        tenantConfig: {
          create: {
            enableNFT: true,
            enableBonds: true,
            enableFractionalization: true,
            enableEnterprise: false,
            maxContentSize: 2147483648, // 2GB
            maxUploadRate: 100,
            rateLimitPerMin: 100,
            allowedDomains: [],
            ipWhitelist: []
          }
        }
      },
      include: {
        tenantConfig: true
      }
    });

    return tenant;
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(id: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        tenantConfig: true,
        apiKeys: {
          where: { isActive: true }
        },
        _count: {
          select: {
            users: true,
            contents: true
          }
        }
      }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return tenant;
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      include: {
        tenantConfig: true,
        _count: {
          select: {
            users: true,
            contents: true
          }
        }
      }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return tenant;
  }

  /**
   * List all tenants
   */
  async listTenants(filters?: {
    status?: string;
    plan?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.plan) {
      where.plan = filters.plan;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          tenantConfig: true,
          _count: {
            select: {
              users: true,
              contents: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.tenant.count({ where })
    ]);

    return {
      tenants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update tenant
   */
  async updateTenant(id: string, input: UpdateTenantInput) {
    // Validate domain uniqueness if being updated
    if (input.domain) {
      const existingDomain = await prisma.tenant.findFirst({
        where: {
          domain: input.domain,
          NOT: { id }
        }
      });

      if (existingDomain) {
        throw new Error('Domain already in use');
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: input,
      include: {
        tenantConfig: true
      }
    });

    return tenant;
  }

  /**
   * Update tenant configuration
   */
  async updateTenantConfig(tenantId: string, input: TenantConfigInput) {
    const config = await prisma.tenantConfig.upsert({
      where: { tenantId },
      update: input,
      create: {
        tenantId,
        ...input
      }
    });

    return config;
  }

  /**
   * Delete tenant
   */
  async deleteTenant(id: string) {
    await prisma.tenant.delete({
      where: { id }
    });

    return { success: true };
  }

  /**
   * Suspend tenant
   */
  async suspendTenant(id: string, reason?: string) {
    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        status: 'suspended',
        metadata: {
          suspendedAt: new Date().toISOString(),
          suspensionReason: reason
        }
      }
    });

    return tenant;
  }

  /**
   * Activate tenant
   */
  async activateTenant(id: string) {
    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        status: 'active',
        metadata: {
          activatedAt: new Date().toISOString()
        }
      }
    });

    return tenant;
  }

  /**
   * Create API key for tenant
   */
  async createApiKey(input: CreateApiKeyInput) {
    const key = `kt_${crypto.randomBytes(16).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');

    const apiKey = await prisma.tenantApiKey.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        key,
        secret: this.hashSecret(secret),
        permissions: input.permissions,
        expiresAt: input.expiresAt
      }
    });

    // Return the plain secret only once
    return {
      ...apiKey,
      secret // Plain secret for user to save
    };
  }

  /**
   * List API keys for tenant
   */
  async listApiKeys(tenantId: string) {
    const apiKeys = await prisma.tenantApiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    // Don't return secrets
    return apiKeys.map(({ secret, ...key }) => key);
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(id: string) {
    const apiKey = await prisma.tenantApiKey.update({
      where: { id },
      data: { isActive: false }
    });

    return apiKey;
  }

  /**
   * Get tenant usage metrics
   */
  async getTenantUsage(tenantId: string, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const metrics = await prisma.tenantUsageMetric.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    return metrics;
  }

  /**
   * Record tenant usage
   */
  async recordUsage(tenantId: string, data: {
    activeUsers?: number;
    storageUsed?: bigint;
    bandwidthUsed?: bigint;
    apiCalls?: number;
    contentCreated?: number;
    revenue?: number;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const metric = await prisma.tenantUsageMetric.upsert({
      where: {
        tenantId_date: {
          tenantId,
          date: today
        }
      },
      update: data,
      create: {
        tenantId,
        date: today,
        ...data
      }
    });

    return metric;
  }

  /**
   * Check tenant limits
   */
  async checkLimits(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Check user limit
    const userLimitReached = tenant._count.users >= tenant.maxUsers;

    // Check storage limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const usage = await prisma.tenantUsageMetric.findUnique({
      where: {
        tenantId_date: {
          tenantId,
          date: today
        }
      }
    });

    const storageLimitReached = usage 
      ? usage.storageUsed >= tenant.maxStorage 
      : false;

    return {
      users: {
        current: tenant._count.users,
        limit: tenant.maxUsers,
        limitReached: userLimitReached
      },
      storage: {
        current: usage?.storageUsed || BigInt(0),
        limit: tenant.maxStorage,
        limitReached: storageLimitReached
      }
    };
  }

  /**
   * Hash API secret
   */
  private hashSecret(secret: string): string {
    return crypto
      .createHash('sha256')
      .update(secret)
      .digest('hex');
  }

  /**
   * Verify API secret
   */
  verifySecret(secret: string, hashedSecret: string): boolean {
    return this.hashSecret(secret) === hashedSecret;
  }
}

export default new TenantService();
