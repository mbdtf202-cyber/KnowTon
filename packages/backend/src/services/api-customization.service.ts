import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

export interface TenantApiEndpoint {
  id: string;
  tenantId: string;
  path: string;
  method: string;
  enabled: boolean;
  rateLimit?: number;
  requiresAuth: boolean;
  customLogic?: string;
  metadata?: any;
}

export interface CreateApiEndpointInput {
  tenantId: string;
  path: string;
  method: string;
  enabled?: boolean;
  rateLimit?: number;
  requiresAuth?: boolean;
  customLogic?: string;
  metadata?: any;
}

export interface UpdateApiEndpointInput {
  enabled?: boolean;
  rateLimit?: number;
  requiresAuth?: boolean;
  customLogic?: string;
  metadata?: any;
}

export interface ApiKeyPermissions {
  endpoints: string[];
  methods: string[];
  rateLimit?: number;
  ipWhitelist?: string[];
  allowedOrigins?: string[];
}

class ApiCustomizationService {
  /**
   * Create custom API endpoint for tenant
   */
  async createApiEndpoint(input: CreateApiEndpointInput): Promise<TenantApiEndpoint> {
    // Validate tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: input.tenantId }
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Validate path format
    if (!input.path.startsWith('/')) {
      throw new Error('Path must start with /');
    }

    // Check for duplicate endpoint
    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM tenant_api_endpoints 
      WHERE tenant_id = ${input.tenantId} 
      AND path = ${input.path} 
      AND method = ${input.method}
    `;

    if (existing && existing.length > 0) {
      throw new Error('Endpoint already exists for this tenant');
    }

    // Create endpoint
    const endpoint = await prisma.$executeRaw`
      INSERT INTO tenant_api_endpoints (
        id, tenant_id, path, method, enabled, rate_limit, 
        requires_auth, custom_logic, metadata, created_at, updated_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${input.tenantId},
        ${input.path},
        ${input.method},
        ${input.enabled ?? true},
        ${input.rateLimit ?? null},
        ${input.requiresAuth ?? true},
        ${input.customLogic ?? null},
        ${JSON.stringify(input.metadata ?? {})},
        NOW(),
        NOW()
      )
    `;

    // Fetch and return the created endpoint
    const created = await this.getApiEndpoint(input.tenantId, input.path, input.method);
    return created;
  }

  /**
   * Get API endpoint
   */
  async getApiEndpoint(tenantId: string, path: string, method: string): Promise<TenantApiEndpoint> {
    const endpoints = await prisma.$queryRaw<any[]>`
      SELECT * FROM tenant_api_endpoints 
      WHERE tenant_id = ${tenantId} 
      AND path = ${path} 
      AND method = ${method}
      LIMIT 1
    `;

    if (!endpoints || endpoints.length === 0) {
      throw new Error('API endpoint not found');
    }

    return this.mapEndpoint(endpoints[0]);
  }

  /**
   * List API endpoints for tenant
   */
  async listApiEndpoints(tenantId: string, filters?: {
    enabled?: boolean;
    method?: string;
    search?: string;
  }): Promise<TenantApiEndpoint[]> {
    let query = `SELECT * FROM tenant_api_endpoints WHERE tenant_id = '${tenantId}'`;
    
    if (filters?.enabled !== undefined) {
      query += ` AND enabled = ${filters.enabled}`;
    }
    
    if (filters?.method) {
      query += ` AND method = '${filters.method}'`;
    }
    
    if (filters?.search) {
      query += ` AND path ILIKE '%${filters.search}%'`;
    }
    
    query += ' ORDER BY created_at DESC';

    const endpoints = await prisma.$queryRawUnsafe<any[]>(query);
    return endpoints.map(e => this.mapEndpoint(e));
  }

  /**
   * Update API endpoint
   */
  async updateApiEndpoint(
    tenantId: string,
    path: string,
    method: string,
    input: UpdateApiEndpointInput
  ): Promise<TenantApiEndpoint> {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.enabled !== undefined) {
      updates.push(`enabled = $${values.length + 1}`);
      values.push(input.enabled);
    }

    if (input.rateLimit !== undefined) {
      updates.push(`rate_limit = $${values.length + 1}`);
      values.push(input.rateLimit);
    }

    if (input.requiresAuth !== undefined) {
      updates.push(`requires_auth = $${values.length + 1}`);
      values.push(input.requiresAuth);
    }

    if (input.customLogic !== undefined) {
      updates.push(`custom_logic = $${values.length + 1}`);
      values.push(input.customLogic);
    }

    if (input.metadata !== undefined) {
      updates.push(`metadata = $${values.length + 1}`);
      values.push(JSON.stringify(input.metadata));
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) { // Only updated_at
      throw new Error('No fields to update');
    }

    await prisma.$executeRawUnsafe(`
      UPDATE tenant_api_endpoints 
      SET ${updates.join(', ')}
      WHERE tenant_id = '${tenantId}' 
      AND path = '${path}' 
      AND method = '${method}'
    `);

    return this.getApiEndpoint(tenantId, path, method);
  }

  /**
   * Delete API endpoint
   */
  async deleteApiEndpoint(tenantId: string, path: string, method: string): Promise<void> {
    await prisma.$executeRaw`
      DELETE FROM tenant_api_endpoints 
      WHERE tenant_id = ${tenantId} 
      AND path = ${path} 
      AND method = ${method}
    `;
  }

  /**
   * Create API key with custom permissions
   */
  async createApiKey(input: {
    tenantId: string;
    name: string;
    permissions: ApiKeyPermissions;
    expiresAt?: Date;
  }) {
    const key = `kt_${crypto.randomBytes(16).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');
    const hashedSecret = this.hashSecret(secret);

    const apiKey = await prisma.tenantApiKey.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        key,
        secret: hashedSecret,
        permissions: input.permissions as any,
        expiresAt: input.expiresAt
      }
    });

    return {
      ...apiKey,
      secret // Return plain secret only once
    };
  }

  /**
   * Validate API key and check permissions
   */
  async validateApiKey(key: string, path: string, method: string): Promise<{
    valid: boolean;
    tenantId?: string;
    permissions?: ApiKeyPermissions;
    rateLimit?: number;
  }> {
    const apiKey = await prisma.tenantApiKey.findFirst({
      where: { 
        key, 
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    if (!apiKey) {
      return { valid: false };
    }

    const permissions = apiKey.permissions as any as ApiKeyPermissions;

    // Check if endpoint is allowed
    const endpointAllowed = permissions.endpoints.includes('*') || 
                           permissions.endpoints.includes(path);
    
    const methodAllowed = permissions.methods.includes('*') || 
                         permissions.methods.includes(method);

    if (!endpointAllowed || !methodAllowed) {
      return { valid: false };
    }

    // Update last used timestamp
    await prisma.tenantApiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() }
    });

    return {
      valid: true,
      tenantId: apiKey.tenantId,
      permissions,
      rateLimit: permissions.rateLimit
    };
  }

  /**
   * Get API key usage statistics
   */
  async getApiKeyUsage(keyId: string, startDate?: Date, endDate?: Date) {
    const where: any = { apiKeyId: keyId };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const usage = await prisma.$queryRaw<any[]>`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as request_count,
        COUNT(DISTINCT endpoint) as unique_endpoints,
        AVG(response_time) as avg_response_time,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
      FROM api_key_usage_logs
      WHERE api_key_id = ${keyId}
      ${startDate ? `AND timestamp >= ${startDate.toISOString()}` : ''}
      ${endDate ? `AND timestamp <= ${endDate.toISOString()}` : ''}
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `;

    return usage;
  }

  /**
   * Log API key usage
   */
  async logApiKeyUsage(data: {
    apiKeyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await prisma.$executeRaw`
      INSERT INTO api_key_usage_logs (
        id, api_key_id, endpoint, method, status_code, 
        response_time, ip_address, user_agent, timestamp
      ) VALUES (
        ${crypto.randomUUID()},
        ${data.apiKeyId},
        ${data.endpoint},
        ${data.method},
        ${data.statusCode},
        ${data.responseTime},
        ${data.ipAddress ?? null},
        ${data.userAgent ?? null},
        NOW()
      )
    `;
  }

  /**
   * Get tenant rate limit configuration
   */
  async getTenantRateLimit(tenantId: string, endpoint?: string): Promise<number> {
    // Check endpoint-specific rate limit first
    if (endpoint) {
      const endpointConfig = await prisma.$queryRaw<any[]>`
        SELECT rate_limit FROM tenant_api_endpoints 
        WHERE tenant_id = ${tenantId} 
        AND path = ${endpoint}
        AND enabled = true
        LIMIT 1
      `;

      if (endpointConfig && endpointConfig.length > 0 && endpointConfig[0].rate_limit) {
        return endpointConfig[0].rate_limit;
      }
    }

    // Fall back to tenant-level rate limit
    const config = await prisma.tenantConfig.findUnique({
      where: { tenantId }
    });

    return config?.rateLimitPerMin ?? 100;
  }

  /**
   * Check if IP is whitelisted for tenant
   */
  async isIpWhitelisted(tenantId: string, ipAddress: string): Promise<boolean> {
    const config = await prisma.tenantConfig.findUnique({
      where: { tenantId }
    });

    if (!config || !config.ipWhitelist || config.ipWhitelist.length === 0) {
      return true; // No whitelist means all IPs allowed
    }

    return config.ipWhitelist.includes(ipAddress);
  }

  /**
   * Check if origin is allowed for tenant
   */
  async isOriginAllowed(tenantId: string, origin: string): Promise<boolean> {
    const config = await prisma.tenantConfig.findUnique({
      where: { tenantId }
    });

    if (!config || !config.allowedDomains || config.allowedDomains.length === 0) {
      return true; // No restrictions means all origins allowed
    }

    return config.allowedDomains.some(domain => {
      if (domain.startsWith('*.')) {
        const baseDomain = domain.substring(2);
        return origin.endsWith(baseDomain);
      }
      return origin === domain || origin.endsWith(`.${domain}`);
    });
  }

  /**
   * Helper: Map database row to TenantApiEndpoint
   */
  private mapEndpoint(row: any): TenantApiEndpoint {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      path: row.path,
      method: row.method,
      enabled: row.enabled,
      rateLimit: row.rate_limit,
      requiresAuth: row.requires_auth,
      customLogic: row.custom_logic,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
    };
  }

  /**
   * Helper: Hash API secret
   */
  private hashSecret(secret: string): string {
    return crypto
      .createHash('sha256')
      .update(secret)
      .digest('hex');
  }
}

export default new ApiCustomizationService();
