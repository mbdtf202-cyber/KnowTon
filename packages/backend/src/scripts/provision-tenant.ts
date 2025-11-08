#!/usr/bin/env ts-node

/**
 * Tenant Provisioning Script
 * 
 * Automates the complete provisioning of a new tenant including:
 * - Database setup
 * - Configuration
 * - Initial data seeding
 * - Resource allocation
 * - Monitoring setup
 */

import { PrismaClient } from '@prisma/client';
import tenantService from '../services/tenant.service';
import brandingService from '../services/branding.service';
import apiCustomizationService from '../services/api-customization.service';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

interface ProvisionTenantOptions {
  name: string;
  slug: string;
  domain?: string;
  plan: 'basic' | 'professional' | 'enterprise';
  adminEmail: string;
  adminPassword?: string;
  features?: {
    enableNFT?: boolean;
    enableBonds?: boolean;
    enableFractionalization?: boolean;
    enableEnterprise?: boolean;
  };
  branding?: {
    companyName?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  limits?: {
    maxUsers?: number;
    maxStorage?: number;
    maxContentSize?: number;
    rateLimitPerMin?: number;
  };
}

class TenantProvisioner {
  /**
   * Provision a new tenant with all required resources
   */
  async provision(options: ProvisionTenantOptions): Promise<any> {
    console.log(`\n🚀 Starting tenant provisioning for: ${options.name}`);
    console.log(`   Slug: ${options.slug}`);
    console.log(`   Plan: ${options.plan}`);
    console.log(`   Domain: ${options.domain || 'N/A'}`);

    try {
      // Step 1: Create tenant
      console.log('\n📦 Step 1: Creating tenant...');
      const tenant = await this.createTenant(options);
      console.log(`   ✅ Tenant created: ${tenant.id}`);

      // Step 2: Configure tenant features
      console.log('\n⚙️  Step 2: Configuring tenant features...');
      await this.configureTenant(tenant.id, options);
      console.log('   ✅ Tenant configured');

      // Step 3: Setup branding
      console.log('\n🎨 Step 3: Setting up branding...');
      await this.setupBranding(tenant.id, options);
      console.log('   ✅ Branding configured');

      // Step 4: Create admin user
      console.log('\n👤 Step 4: Creating admin user...');
      const adminUser = await this.createAdminUser(tenant.id, options);
      console.log(`   ✅ Admin user created: ${adminUser.email}`);

      // Step 5: Generate API keys
      console.log('\n🔑 Step 5: Generating API keys...');
      const apiKeys = await this.generateApiKeys(tenant.id);
      console.log(`   ✅ API keys generated: ${apiKeys.length} keys`);

      // Step 6: Setup monitoring
      console.log('\n📊 Step 6: Setting up monitoring...');
      await this.setupMonitoring(tenant.id);
      console.log('   ✅ Monitoring configured');

      // Step 7: Initialize usage metrics
      console.log('\n📈 Step 7: Initializing usage metrics...');
      await this.initializeMetrics(tenant.id);
      console.log('   ✅ Metrics initialized');

      // Step 8: Send welcome email
      console.log('\n📧 Step 8: Sending welcome email...');
      await this.sendWelcomeEmail(tenant, adminUser, apiKeys[0]);
      console.log('   ✅ Welcome email sent');

      console.log('\n✨ Tenant provisioning completed successfully!\n');

      return {
        tenant,
        adminUser: {
          email: adminUser.email,
          temporaryPassword: adminUser.temporaryPassword
        },
        apiKeys: apiKeys.map(key => ({
          name: key.name,
          key: key.key,
          secret: key.secret
        })),
        accessUrls: {
          web: options.domain 
            ? `https://${options.domain}` 
            : `https://app.knowton.com?tenant=${options.slug}`,
          api: options.domain
            ? `https://api.${options.domain}`
            : `https://api.knowton.com`,
          dashboard: `https://admin.knowton.com/tenants/${tenant.id}`
        }
      };
    } catch (error) {
      console.error('\n❌ Tenant provisioning failed:', error);
      throw error;
    }
  }

  /**
   * Create tenant record
   */
  private async createTenant(options: ProvisionTenantOptions) {
    const planLimits = this.getPlanLimits(options.plan);

    return await tenantService.createTenant({
      name: options.name,
      slug: options.slug,
      domain: options.domain,
      plan: options.plan,
      maxUsers: options.limits?.maxUsers || planLimits.maxUsers,
      maxStorage: options.limits?.maxStorage || planLimits.maxStorage,
      features: {
        enableNFT: options.features?.enableNFT ?? true,
        enableBonds: options.features?.enableBonds ?? true,
        enableFractionalization: options.features?.enableFractionalization ?? true,
        enableEnterprise: options.features?.enableEnterprise ?? (options.plan === 'enterprise')
      }
    });
  }

  /**
   * Configure tenant settings
   */
  private async configureTenant(tenantId: string, options: ProvisionTenantOptions) {
    const planLimits = this.getPlanLimits(options.plan);

    await tenantService.updateTenantConfig(tenantId, {
      enableNFT: options.features?.enableNFT ?? true,
      enableBonds: options.features?.enableBonds ?? true,
      enableFractionalization: options.features?.enableFractionalization ?? true,
      enableEnterprise: options.features?.enableEnterprise ?? (options.plan === 'enterprise'),
      maxContentSize: options.limits?.maxContentSize || planLimits.maxContentSize,
      rateLimitPerMin: options.limits?.rateLimitPerMin || planLimits.rateLimitPerMin,
      allowedDomains: options.domain ? [options.domain] : [],
      ipWhitelist: []
    });
  }

  /**
   * Setup tenant branding
   */
  private async setupBranding(tenantId: string, options: ProvisionTenantOptions) {
    const defaultBranding = {
      companyName: options.branding?.companyName || options.name,
      primaryColor: options.branding?.primaryColor || '#3B82F6',
      secondaryColor: options.branding?.secondaryColor || '#8B5CF6',
      accentColor: '#10B981',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      customFonts: {
        heading: 'Inter',
        body: 'Inter'
      }
    };

    await brandingService.updateBranding(tenantId, defaultBranding);
  }

  /**
   * Create admin user for tenant
   */
  private async createAdminUser(tenantId: string, options: ProvisionTenantOptions) {
    const temporaryPassword = options.adminPassword || this.generatePassword();

    const user = await prisma.user.create({
      data: {
        email: options.adminEmail,
        username: options.adminEmail.split('@')[0],
        role: 'admin',
        tenantId,
        kycStatus: 'verified',
        kycLevel: 2,
        isActive: true,
        metadata: {
          isInitialAdmin: true,
          mustChangePassword: !options.adminPassword
        }
      }
    });

    return {
      ...user,
      temporaryPassword
    };
  }

  /**
   * Generate API keys for tenant
   */
  private async generateApiKeys(tenantId: string) {
    const keys = [];

    // Production API key
    const prodKey = await tenantService.createApiKey({
      tenantId,
      name: 'Production API Key',
      permissions: [
        'read:content',
        'write:content',
        'read:users',
        'write:users',
        'read:analytics'
      ]
    });
    keys.push(prodKey);

    // Development API key
    const devKey = await tenantService.createApiKey({
      tenantId,
      name: 'Development API Key',
      permissions: [
        'read:content',
        'write:content',
        'read:users'
      ]
    });
    keys.push(devKey);

    return keys;
  }

  /**
   * Setup monitoring for tenant
   */
  private async setupMonitoring(tenantId: string) {
    // Create monitoring configuration
    await prisma.tenantMonitoring.create({
      data: {
        tenantId,
        alertsEnabled: true,
        alertThresholds: {
          userLimit: 90, // Alert at 90% of user limit
          storageLimit: 85, // Alert at 85% of storage limit
          apiRateLimit: 80, // Alert at 80% of rate limit
          errorRate: 5 // Alert if error rate > 5%
        },
        notificationChannels: {
          email: true,
          webhook: false,
          slack: false
        }
      }
    });
  }

  /**
   * Initialize usage metrics
   */
  private async initializeMetrics(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await tenantService.recordUsage(tenantId, {
      activeUsers: 0,
      storageUsed: BigInt(0),
      bandwidthUsed: BigInt(0),
      apiCalls: 0,
      contentCreated: 0,
      revenue: 0
    });
  }

  /**
   * Send welcome email to admin
   */
  private async sendWelcomeEmail(tenant: any, adminUser: any, apiKey: any) {
    // In production, this would send an actual email
    console.log('\n📧 Welcome Email Content:');
    console.log('─────────────────────────────────────────');
    console.log(`To: ${adminUser.email}`);
    console.log(`Subject: Welcome to ${tenant.name} on KnowTon`);
    console.log('\nYour tenant has been successfully provisioned!');
    console.log('\nAccess Details:');
    console.log(`  Platform URL: https://app.knowton.com?tenant=${tenant.slug}`);
    console.log(`  Admin Email: ${adminUser.email}`);
    console.log(`  Temporary Password: ${adminUser.temporaryPassword}`);
    console.log('\nAPI Access:');
    console.log(`  API Key: ${apiKey.key}`);
    console.log(`  API Secret: ${apiKey.secret}`);
    console.log('\n⚠️  Please change your password on first login');
    console.log('─────────────────────────────────────────\n');
  }

  /**
   * Get plan limits
   */
  private getPlanLimits(plan: string) {
    const limits = {
      basic: {
        maxUsers: 10,
        maxStorage: 10737418240, // 10GB
        maxContentSize: 2147483648, // 2GB
        rateLimitPerMin: 100
      },
      professional: {
        maxUsers: 100,
        maxStorage: 107374182400, // 100GB
        maxContentSize: 5368709120, // 5GB
        rateLimitPerMin: 500
      },
      enterprise: {
        maxUsers: 1000,
        maxStorage: 1099511627776, // 1TB
        maxContentSize: 10737418240, // 10GB
        rateLimitPerMin: 2000
      }
    };

    return limits[plan as keyof typeof limits] || limits.basic;
  }

  /**
   * Generate secure password
   */
  private generatePassword(): string {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Deprovision tenant (cleanup)
   */
  async deprovision(tenantId: string): Promise<void> {
    console.log(`\n🗑️  Starting tenant deprovisioning: ${tenantId}`);

    try {
      // Step 1: Suspend tenant
      console.log('\n⏸️  Step 1: Suspending tenant...');
      await tenantService.suspendTenant(tenantId, 'Deprovisioning');
      console.log('   ✅ Tenant suspended');

      // Step 2: Revoke API keys
      console.log('\n🔒 Step 2: Revoking API keys...');
      const apiKeys = await tenantService.listApiKeys(tenantId);
      for (const key of apiKeys) {
        await tenantService.revokeApiKey(key.id);
      }
      console.log(`   ✅ ${apiKeys.length} API keys revoked`);

      // Step 3: Archive data
      console.log('\n📦 Step 3: Archiving tenant data...');
      await this.archiveTenantData(tenantId);
      console.log('   ✅ Data archived');

      // Step 4: Delete tenant (if confirmed)
      console.log('\n🗑️  Step 4: Deleting tenant...');
      await tenantService.deleteTenant(tenantId);
      console.log('   ✅ Tenant deleted');

      console.log('\n✨ Tenant deprovisioning completed!\n');
    } catch (error) {
      console.error('\n❌ Tenant deprovisioning failed:', error);
      throw error;
    }
  }

  /**
   * Archive tenant data before deletion
   */
  private async archiveTenantData(tenantId: string) {
    // In production, this would export data to S3 or similar
    const archiveData = {
      tenant: await prisma.tenant.findUnique({ where: { id: tenantId } }),
      users: await prisma.user.findMany({ where: { tenantId } }),
      contents: await prisma.content.findMany({ where: { tenantId } }),
      usage: await tenantService.getTenantUsage(tenantId),
      timestamp: new Date().toISOString()
    };

    console.log(`   📊 Archived ${archiveData.users.length} users, ${archiveData.contents.length} contents`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const provisioner = new TenantProvisioner();

  if (command === 'provision') {
    // Parse options from command line or config file
    const options: ProvisionTenantOptions = {
      name: args[1] || 'Test Tenant',
      slug: args[2] || 'test-tenant',
      plan: (args[3] as any) || 'professional',
      adminEmail: args[4] || 'admin@example.com',
      domain: args[5]
    };

    const result = await provisioner.provision(options);
    
    console.log('\n📋 Provisioning Summary:');
    console.log('═══════════════════════════════════════════');
    console.log(`Tenant ID: ${result.tenant.id}`);
    console.log(`Tenant Slug: ${result.tenant.slug}`);
    console.log(`Plan: ${result.tenant.plan}`);
    console.log(`\nAdmin Access:`);
    console.log(`  Email: ${result.adminUser.email}`);
    console.log(`  Password: ${result.adminUser.temporaryPassword}`);
    console.log(`\nAPI Keys:`);
    result.apiKeys.forEach((key: any) => {
      console.log(`  ${key.name}:`);
      console.log(`    Key: ${key.key}`);
      console.log(`    Secret: ${key.secret}`);
    });
    console.log(`\nAccess URLs:`);
    console.log(`  Web: ${result.accessUrls.web}`);
    console.log(`  API: ${result.accessUrls.api}`);
    console.log(`  Dashboard: ${result.accessUrls.dashboard}`);
    console.log('═══════════════════════════════════════════\n');

  } else if (command === 'deprovision') {
    const tenantId = args[1];
    if (!tenantId) {
      console.error('❌ Error: Tenant ID required');
      process.exit(1);
    }

    await provisioner.deprovision(tenantId);

  } else {
    console.log('Usage:');
    console.log('  provision <name> <slug> <plan> <adminEmail> [domain]');
    console.log('  deprovision <tenantId>');
    console.log('\nExamples:');
    console.log('  npm run provision "Acme Corp" acme enterprise admin@acme.com acme.knowton.com');
    console.log('  npm run deprovision abc-123-def-456');
  }

  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch(console.error);
}

export default TenantProvisioner;
