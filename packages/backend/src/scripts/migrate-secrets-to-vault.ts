/**
 * Migrate Secrets to Vault
 * 
 * This script migrates existing secrets from environment variables
 * and configuration files to HashiCorp Vault.
 * 
 * Usage:
 *   tsx src/scripts/migrate-secrets-to-vault.ts
 */

import { initializeVaultClient } from '../services/vault-client.service';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface SecretMigration {
  vaultPath: string;
  envVars: { [key: string]: string };
  description: string;
}

const secretMigrations: SecretMigration[] = [
  // Backend secrets
  {
    vaultPath: 'backend/database',
    envVars: {
      url: process.env.DATABASE_URL || '',
      username: process.env.DB_USERNAME || 'knowton',
      password: process.env.DB_PASSWORD || '',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'knowton',
    },
    description: 'PostgreSQL database credentials',
  },
  {
    vaultPath: 'backend/redis',
    envVars: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || '',
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || '6379',
    },
    description: 'Redis cache credentials',
  },
  {
    vaultPath: 'backend/jwt',
    envVars: {
      secret: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',
      expires_in: process.env.JWT_EXPIRES_IN || '7d',
      refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },
    description: 'JWT authentication secrets',
  },
  {
    vaultPath: 'backend/encryption',
    envVars: {
      key: process.env.ENCRYPTION_KEY || '',
      algorithm: 'aes-256-gcm',
    },
    description: 'Content encryption keys',
  },

  // Blockchain secrets
  {
    vaultPath: 'blockchain/arbitrum',
    envVars: {
      rpc_url: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      private_key: process.env.PRIVATE_KEY || '',
      chain_id: process.env.CHAIN_ID || '42161',
    },
    description: 'Arbitrum blockchain credentials',
  },
  {
    vaultPath: 'blockchain/contracts',
    envVars: {
      copyright_registry: process.env.COPYRIGHT_REGISTRY_ADDRESS || '',
      royalty_distributor: process.env.ROYALTY_DISTRIBUTOR_ADDRESS || '',
      fractionalization_vault: process.env.FRACTIONALIZATION_VAULT_ADDRESS || '',
      ip_bond: process.env.IP_BOND_ADDRESS || '',
      marketplace_amm: process.env.MARKETPLACE_AMM_ADDRESS || '',
    },
    description: 'Smart contract addresses',
  },

  // API keys
  {
    vaultPath: 'api/pinata',
    envVars: {
      api_key: process.env.PINATA_API_KEY || '',
      secret_key: process.env.PINATA_SECRET_KEY || '',
      jwt: process.env.PINATA_JWT || '',
    },
    description: 'Pinata IPFS service credentials',
  },
  {
    vaultPath: 'api/openai',
    envVars: {
      api_key: process.env.OPENAI_API_KEY || '',
      organization: process.env.OPENAI_ORG_ID || '',
    },
    description: 'OpenAI API credentials',
  },
  {
    vaultPath: 'api/stripe',
    envVars: {
      secret_key: process.env.STRIPE_SECRET_KEY || '',
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || '',
      webhook_secret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    description: 'Stripe payment credentials',
  },
  {
    vaultPath: 'api/alipay',
    envVars: {
      app_id: process.env.ALIPAY_APP_ID || '',
      private_key: process.env.ALIPAY_PRIVATE_KEY || '',
      public_key: process.env.ALIPAY_PUBLIC_KEY || '',
    },
    description: 'Alipay payment credentials',
  },
  {
    vaultPath: 'api/wechat',
    envVars: {
      app_id: process.env.WECHAT_APP_ID || '',
      app_secret: process.env.WECHAT_APP_SECRET || '',
      mch_id: process.env.WECHAT_MCH_ID || '',
      api_key: process.env.WECHAT_API_KEY || '',
    },
    description: 'WeChat Pay credentials',
  },
  {
    vaultPath: 'api/paypal',
    envVars: {
      client_id: process.env.PAYPAL_CLIENT_ID || '',
      client_secret: process.env.PAYPAL_CLIENT_SECRET || '',
      mode: process.env.PAYPAL_MODE || 'sandbox',
    },
    description: 'PayPal payment credentials',
  },

  // Email service
  {
    vaultPath: 'api/email',
    envVars: {
      smtp_host: process.env.SMTP_HOST || '',
      smtp_port: process.env.SMTP_PORT || '587',
      smtp_user: process.env.SMTP_USER || '',
      smtp_password: process.env.SMTP_PASSWORD || '',
      from_email: process.env.FROM_EMAIL || '',
    },
    description: 'Email service credentials',
  },

  // Oracle and AI services
  {
    vaultPath: 'oracle/chainlink',
    envVars: {
      oracle_address: process.env.CHAINLINK_ORACLE_ADDRESS || '',
      job_id: process.env.CHAINLINK_JOB_ID || '',
      link_token: process.env.LINK_TOKEN_ADDRESS || '',
    },
    description: 'Chainlink oracle configuration',
  },
  {
    vaultPath: 'ai/huggingface',
    envVars: {
      api_token: process.env.HUGGINGFACE_TOKEN || '',
    },
    description: 'HuggingFace model API token',
  },
];

async function migrateSecrets() {
  console.log('🔐 Starting secret migration to Vault...\n');

  // Initialize Vault client
  const vaultClient = initializeVaultClient();

  // Check Vault health
  const isHealthy = await vaultClient.healthCheck();
  if (!isHealthy) {
    console.error('❌ Vault is not healthy. Please check Vault status.');
    process.exit(1);
  }

  console.log('✅ Vault is healthy\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const migration of secretMigrations) {
    try {
      console.log(`📝 Migrating: ${migration.description}`);
      console.log(`   Path: ${migration.vaultPath}`);

      // Check if any values are empty
      const hasEmptyValues = Object.values(migration.envVars).some(
        (value) => !value || value === ''
      );

      if (hasEmptyValues) {
        console.log(`   ⚠️  Skipped (empty values detected)\n`);
        skipCount++;
        continue;
      }

      // Write to Vault
      await vaultClient.setSecret(migration.vaultPath, migration.envVars);

      console.log(`   ✅ Migrated successfully\n`);
      successCount++;
    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}\n`);
      errorCount++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ⚠️  Skipped: ${skipCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📦 Total: ${secretMigrations.length}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some secrets failed to migrate. Please check the errors above.');
    process.exit(1);
  }

  console.log('\n✅ Secret migration completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Update your services to use Vault client');
  console.log('   2. Remove secrets from .env files');
  console.log('   3. Enable secret rotation for critical secrets');
  console.log('   4. Configure Vault audit logging');
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migrated secrets...\n');

  const vaultClient = initializeVaultClient();

  for (const migration of secretMigrations) {
    try {
      const secret = await vaultClient.getSecret(migration.vaultPath, false);
      const keyCount = Object.keys(secret).length;
      console.log(`✅ ${migration.vaultPath}: ${keyCount} keys`);
    } catch (error: any) {
      console.log(`❌ ${migration.vaultPath}: ${error.message}`);
    }
  }
}

async function listAllSecrets() {
  console.log('\n📋 Listing all secrets in Vault...\n');

  const vaultClient = initializeVaultClient();

  const paths = ['backend', 'blockchain', 'api', 'oracle', 'ai'];

  for (const path of paths) {
    try {
      const secrets = await vaultClient.listSecrets(path);
      console.log(`\n📁 ${path}/`);
      secrets.forEach((secret) => {
        console.log(`   - ${secret}`);
      });
    } catch (error: any) {
      console.log(`   ❌ Failed to list: ${error.message}`);
    }
  }
}

// Main execution
const command = process.argv[2] || 'migrate';

(async () => {
  try {
    switch (command) {
      case 'migrate':
        await migrateSecrets();
        break;
      case 'verify':
        await verifyMigration();
        break;
      case 'list':
        await listAllSecrets();
        break;
      default:
        console.log('Usage: tsx migrate-secrets-to-vault.ts [migrate|verify|list]');
        process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
})();
