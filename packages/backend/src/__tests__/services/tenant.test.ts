import { PrismaClient } from '@prisma/client';
import tenantService from '../../services/tenant.service';

const prisma = new PrismaClient();

// Note: Run 'npx prisma generate' before running tests to ensure Prisma client is up to date

describe('TenantService', () => {
  let testTenant: any;

  beforeEach(async () => {
    // Clean up test data
    await prisma.tenantApiKey.deleteMany({});
    await prisma.tenantUsageMetric.deleteMany({});
    await prisma.tenantConfig.deleteMany({});
    await prisma.tenant.deleteMany({
      where: {
        slug: {
          startsWith: 'test-'
        }
      }
    });
  });

  afterEach(async () => {
    // Clean up after tests
    if (testTenant) {
      await prisma.tenant.delete({
        where: { id: testTenant.id }
      }).catch(() => {});
    }
  });

  describe('createTenant', () => {
    it('should create a new tenant with default config', async () => {
      const input = {
        name: 'Test Company',
        slug: 'test-company',
        plan: 'basic'
      };

      testTenant = await tenantService.createTenant(input);

      expect(testTenant).toBeDefined();
      expect(testTenant.name).toBe(input.name);
      expect(testTenant.slug).toBe(input.slug);
      expect(testTenant.plan).toBe(input.plan);
      expect(testTenant.status).toBe('active');
      expect(testTenant.tenantConfig).toBeDefined();
      expect(testTenant.tenantConfig.enableNFT).toBe(true);
    });

    it('should throw error for duplicate slug', async () => {
      const input = {
        name: 'Test Company',
        slug: 'test-duplicate',
        plan: 'basic'
      };

      testTenant = await tenantService.createTenant(input);

      await expect(
        tenantService.createTenant(input)
      ).rejects.toThrow('Tenant slug already exists');
    });

    it('should create tenant with custom configuration', async () => {
      const input = {
        name: 'Custom Company',
        slug: 'test-custom',
        plan: 'enterprise',
        maxUsers: 100,
        maxStorage: 107374182400,
        customBranding: {
          logo: 'https://example.com/logo.png'
        }
      };

      testTenant = await tenantService.createTenant(input);

      expect(testTenant.maxUsers).toBe(100);
      expect(testTenant.maxStorage).toBe(107374182400n);
      expect(testTenant.customBranding).toEqual(input.customBranding);
    });
  });

  describe('getTenantById', () => {
    beforeEach(async () => {
      testTenant = await tenantService.createTenant({
        name: 'Test Company',
        slug: 'test-get-by-id',
        plan: 'basic'
      });
    });

    it('should get tenant by ID', async () => {
      const tenant = await tenantService.getTenantById(testTenant.id);

      expect(tenant).toBeDefined();
      expect(tenant.id).toBe(testTenant.id);
      expect(tenant.name).toBe(testTenant.name);
    });

    it('should throw error for non-existent tenant', async () => {
      await expect(
        tenantService.getTenantById('non-existent-id')
      ).rejects.toThrow('Tenant not found');
    });
  });

  describe('getTenantBySlug', () => {
    beforeEach(async () => {
      testTenant = await tenantService.createTenant({
        name: 'Test Company',
        slug: 'test-get-by-slug',
        plan: 'basic'
      });
    });

    it('should get tenant by slug', async () => {
      const tenant = await tenantService.getTenantBySlug(testTenant.slug);

      expect(tenant).toBeDefined();
      expect(tenant.slug).toBe(testTenant.slug);
      expect(tenant.name).toBe(testTenant.name);
    });

    it('should throw error for non-existent slug', async () => {
      await expect(
        tenantService.getTenantBySlug('non-existent-slug')
      ).rejects.toThrow('Tenant not found');
    });
  });

  describe('listTenants', () => {
    beforeEach(async () => {
      // Create multiple test tenants
      await tenantService.createTenant({
        name: 'Active Company',
        slug: 'test-active',
        plan: 'basic'
      });

      testTenant = await tenantService.createTenant({
        name: 'Enterprise Company',
        slug: 'test-enterprise',
        plan: 'enterprise'
      });
    });

    it('should list all tenants', async () => {
      const result = await tenantService.listTenants();

      expect(result.tenants).toBeDefined();
      expect(result.tenants.length).toBeGreaterThan(0);
      expect(result.pagination).toBeDefined();
    });

    it('should filter tenants by plan', async () => {
      const result = await tenantService.listTenants({
        plan: 'enterprise'
      });

      expect(result.tenants.length).toBeGreaterThan(0);
      expect(result.tenants.every((t: any) => t.plan === 'enterprise')).toBe(true);
    });

    it('should search tenants by name', async () => {
      const result = await tenantService.listTenants({
        search: 'Enterprise'
      });

      expect(result.tenants.length).toBeGreaterThan(0);
      expect(result.tenants.some((t: any) => t.name.includes('Enterprise'))).toBe(true);
    });

    it('should paginate results', async () => {
      const result = await tenantService.listTenants({
        page: 1,
        limit: 1
      });

      expect(result.tenants.length).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(1);
    });
  });

  describe('updateTenant', () => {
    beforeEach(async () => {
      testTenant = await tenantService.createTenant({
        name: 'Test Company',
        slug: 'test-update',
        plan: 'basic'
      });
    });

    it('should update tenant properties', async () => {
      const updated = await tenantService.updateTenant(testTenant.id, {
        name: 'Updated Company',
        plan: 'professional',
        maxUsers: 50
      });

      expect(updated.name).toBe('Updated Company');
      expect(updated.plan).toBe('professional');
      expect(updated.maxUsers).toBe(50);
    });

    it('should update tenant domain', async () => {
      const updated = await tenantService.updateTenant(testTenant.id, {
        domain: 'test.knowton.com'
      });

      expect(updated.domain).toBe('test.knowton.com');
    });
  });

  describe('updateTenantConfig', () => {
    beforeEach(async () => {
      testTenant = await tenantService.createTenant({
        name: 'Test Company',
        slug: 'test-config',
        plan: 'basic'
      });
    });

    it('should update tenant configuration', async () => {
      const config = await tenantService.updateTenantConfig(testTenant.id, {
        logoUrl: 'https://example.com/logo.png',
        primaryColor: '#FF5733',
        enableNFT: false,
        maxContentSize: 5368709120,
        rateLimitPerMin: 200
      });

      expect(config.logoUrl).toBe('https://example.com/logo.png');
      expect(config.primaryColor).toBe('#FF5733');
      expect(config.enableNFT).toBe(false);
      expect(config.maxContentSize).toBe(5368709120n);
      expect(config.rateLimitPerMin).toBe(200);
    });
  });

  describe('suspendTenant', () => {
    beforeEach(async () => {
      testTenant = await tenantService.createTenant({
        name: 'Test Company',
        slug: 'test-suspend',
        plan: 'basic'
      });
    });

    it('should suspend tenant', async () => {
      const suspended = await tenantService.suspendTenant(
        testTenant.id,
        'Payment overdue'
      );

      expect(suspended.status).toBe('suspended');
      expect(suspended.metadata).toBeDefined();
    });
  });

  describe('activateTenant', () => {
    beforeEach(async () => {
      testTenant = await tenantService.createTenant({
        name: 'Test Company',
        slug: 'test-activate',
        plan: 'basic'
      });
      await tenantService.suspendTenant(testTenant.id);
    });

    it('should activate suspended tenant', async () => {
      const activated = await tenantService.activateTenant(testTenant.id);

      expect(activated.status).toBe('active');
    });
  });

  describe('API Key Management', () => {
    beforeEach(async () => {
      testTenant = await tenantService.createTenant({
        name: 'Test Company',
        slug: 'test-api-key',
        plan: 'basic'
      });
    });

    it('should create API key', async () => {
      const apiKey = await tenantService.createApiKey({
        tenantId: testTenant.id,
        name: 'Test API Key',
        permissions: ['read:content', 'write:content']
      });

      expect(apiKey).toBeDefined();
      expect(apiKey.key).toMatch(/^kt_/);
      expect(apiKey.secret).toBeDefined();
      expect(apiKey.name).toBe('Test API Key');
      expect(apiKey.permissions).toEqual(['read:content', 'write:content']);
    });

    it('should list API keys', async () => {
      await tenantService.createApiKey({
        tenantId: testTenant.id,
        name: 'Test API Key 1',
        permissions: ['read:content']
      });

      await tenantService.createApiKey({
        tenantId: testTenant.id,
        name: 'Test API Key 2',
        permissions: ['write:content']
      });

      const apiKeys = await tenantService.listApiKeys(testTenant.id);

      expect(apiKeys.length).toBe(2);
      expect(apiKeys.every((k: any) => !(k as any).secret)).toBe(true); // Secrets should not be returned
    });

    it('should revoke API key', async () => {
      const apiKey = await tenantService.createApiKey({
        tenantId: testTenant.id,
        name: 'Test API Key',
        permissions: ['read:content']
      });

      const revoked = await tenantService.revokeApiKey(apiKey.id);

      expect(revoked.isActive).toBe(false);
    });
  });

  describe('Usage Tracking', () => {
    beforeEach(async () => {
      testTenant = await tenantService.createTenant({
        name: 'Test Company',
        slug: 'test-usage',
        plan: 'basic'
      });
    });

    it('should record usage metrics', async () => {
      const metric = await tenantService.recordUsage(testTenant.id, {
        activeUsers: 10,
        storageUsed: 1073741824n,
        bandwidthUsed: 5368709120n,
        apiCalls: 1000,
        contentCreated: 5,
        revenue: 100.50
      });

      expect(metric).toBeDefined();
      expect(metric.activeUsers).toBe(10);
      expect(metric.storageUsed).toBe(1073741824n);
      expect(metric.apiCalls).toBe(1000);
    });

    it('should get usage metrics', async () => {
      await tenantService.recordUsage(testTenant.id, {
        activeUsers: 10,
        apiCalls: 1000
      });

      const metrics = await tenantService.getTenantUsage(testTenant.id);

      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].tenantId).toBe(testTenant.id);
    });
  });

  describe('checkLimits', () => {
    beforeEach(async () => {
      testTenant = await tenantService.createTenant({
        name: 'Test Company',
        slug: 'test-limits',
        plan: 'basic',
        maxUsers: 10,
        maxStorage: 10737418240
      });
    });

    it('should check tenant limits', async () => {
      const limits = await tenantService.checkLimits(testTenant.id);

      expect(limits).toBeDefined();
      expect(limits.users).toBeDefined();
      expect(limits.users.limit).toBe(10);
      expect(limits.storage).toBeDefined();
      expect(limits.storage.limit).toBe(10737418240n);
    });
  });
});
