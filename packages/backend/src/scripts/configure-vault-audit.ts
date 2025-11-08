/**
 * Configure Vault Audit Logging
 * 
 * This script configures audit logging for HashiCorp Vault to track:
 * - Secret access and modifications
 * - Authentication attempts
 * - Policy changes
 * - Unauthorized access attempts
 * 
 * Usage:
 *   tsx src/scripts/configure-vault-audit.ts
 */

import axios from 'axios';
import { logger } from '../utils/logger';

const VAULT_ADDR = process.env.VAULT_ADDR || 'http://vault:8200';
const VAULT_TOKEN = process.env.VAULT_TOKEN || 'knowton-dev-token';

const vaultClient = axios.create({
  baseURL: VAULT_ADDR,
  headers: {
    'X-Vault-Token': VAULT_TOKEN,
  },
});

async function enableFileAudit() {
  console.log('📝 Enabling file audit device...');

  try {
    await vaultClient.put('/v1/sys/audit/file', {
      type: 'file',
      options: {
        file_path: '/vault/logs/audit.log',
        log_raw: false,
        hmac_accessor: true,
        mode: '0600',
        format: 'json',
      },
    });

    console.log('✅ File audit device enabled');
    console.log('   Path: /vault/logs/audit.log');
  } catch (error: any) {
    if (error.response?.status === 400 && error.response?.data?.errors?.[0]?.includes('already in use')) {
      console.log('ℹ️  File audit device already enabled');
    } else {
      console.error('❌ Failed to enable file audit:', error.message);
      throw error;
    }
  }
}

async function enableSyslogAudit() {
  console.log('\n📝 Enabling syslog audit device...');

  try {
    await vaultClient.put('/v1/sys/audit/syslog', {
      type: 'syslog',
      options: {
        facility: 'AUTH',
        tag: 'vault',
        log_raw: false,
        hmac_accessor: true,
        format: 'json',
      },
    });

    console.log('✅ Syslog audit device enabled');
  } catch (error: any) {
    if (error.response?.status === 400 && error.response?.data?.errors?.[0]?.includes('already in use')) {
      console.log('ℹ️  Syslog audit device already enabled');
    } else {
      console.log('⚠️  Syslog audit device not available (optional)');
    }
  }
}

async function listAuditDevices() {
  console.log('\n📋 Listing audit devices...');

  try {
    const response = await vaultClient.get('/v1/sys/audit');
    const devices = response.data;

    if (Object.keys(devices).length === 0) {
      console.log('   No audit devices configured');
      return;
    }

    for (const [path, config] of Object.entries(devices)) {
      console.log(`\n   Device: ${path}`);
      console.log(`   Type: ${(config as any).type}`);
      console.log(`   Options:`, JSON.stringify((config as any).options, null, 2));
    }
  } catch (error: any) {
    console.error('❌ Failed to list audit devices:', error.message);
  }
}

async function testAuditLogging() {
  console.log('\n🧪 Testing audit logging...');

  try {
    // Perform a test operation that will be audited
    await vaultClient.get('/v1/knowton/data/backend/jwt');
    console.log('✅ Test operation completed (check audit logs)');
  } catch (error: any) {
    console.log('⚠️  Test operation failed (this is expected if secret doesn\'t exist)');
  }
}

async function configureAuditPolicies() {
  console.log('\n📋 Configuring audit policies...');

  // Policy for audit log readers
  const auditReaderPolicy = `
# Allow reading audit logs
path "sys/audit" {
  capabilities = ["read", "list"]
}

path "sys/audit/*" {
  capabilities = ["read"]
}
`;

  try {
    await vaultClient.put('/v1/sys/policies/acl/audit-reader', {
      policy: auditReaderPolicy,
    });

    console.log('✅ Audit reader policy created');
  } catch (error: any) {
    console.error('❌ Failed to create audit reader policy:', error.message);
  }

  // Policy for security team
  const securityTeamPolicy = `
# Full access to audit configuration
path "sys/audit" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

path "sys/audit/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Read access to all secrets for investigation
path "knowton/*" {
  capabilities = ["read", "list"]
}

# Access to authentication methods
path "auth/*" {
  capabilities = ["read", "list"]
}
`;

  try {
    await vaultClient.put('/v1/sys/policies/acl/security-team', {
      policy: securityTeamPolicy,
    });

    console.log('✅ Security team policy created');
  } catch (error: any) {
    console.error('❌ Failed to create security team policy:', error.message);
  }
}

async function displayAuditLogFormat() {
  console.log('\n📄 Audit Log Format:');
  console.log(`
Audit logs are written in JSON format with the following structure:

{
  "time": "2024-01-01T12:00:00.000Z",
  "type": "request",
  "auth": {
    "client_token": "hmac-sha256:...",
    "accessor": "hmac-sha256:...",
    "display_name": "token",
    "policies": ["default", "knowton-backend"],
    "token_policies": ["default", "knowton-backend"],
    "metadata": {},
    "entity_id": "...",
    "token_type": "service"
  },
  "request": {
    "id": "...",
    "operation": "read",
    "client_token": "hmac-sha256:...",
    "client_token_accessor": "hmac-sha256:...",
    "namespace": {
      "id": "root"
    },
    "path": "knowton/data/backend/jwt",
    "data": null,
    "remote_address": "10.0.0.1"
  },
  "response": {
    "data": {
      "data": "hmac-sha256:...",
      "metadata": {}
    }
  }
}

Key fields:
- time: Timestamp of the operation
- type: "request" or "response"
- auth: Authentication information (tokens are HMAC'd)
- request.operation: Type of operation (read, write, delete, etc.)
- request.path: Path to the secret
- request.remote_address: Client IP address
- response: Response data (sensitive values are HMAC'd)
`);
}

async function displayMonitoringCommands() {
  console.log('\n📊 Monitoring Commands:');
  console.log(`
# Tail audit logs in real-time
kubectl exec -it vault-0 -n vault -- tail -f /vault/logs/audit.log

# Search for failed authentication attempts
kubectl exec -it vault-0 -n vault -- grep '"error"' /vault/logs/audit.log

# Count operations by path
kubectl exec -it vault-0 -n vault -- cat /vault/logs/audit.log | jq -r '.request.path' | sort | uniq -c

# Find operations by specific user
kubectl exec -it vault-0 -n vault -- cat /vault/logs/audit.log | jq 'select(.auth.display_name == "knowton-backend")'

# Export logs to external system (e.g., Elasticsearch)
kubectl exec -it vault-0 -n vault -- cat /vault/logs/audit.log | curl -X POST "http://elasticsearch:9200/vault-audit/_bulk" --data-binary @-
`);
}

async function main() {
  console.log('🔐 Configuring Vault Audit Logging\n');

  try {
    // Check Vault health
    const healthResponse = await vaultClient.get('/v1/sys/health');
    console.log('✅ Vault is healthy\n');

    // Enable audit devices
    await enableFileAudit();
    await enableSyslogAudit();

    // Configure policies
    await configureAuditPolicies();

    // List configured devices
    await listAuditDevices();

    // Test audit logging
    await testAuditLogging();

    // Display information
    displayAuditLogFormat();
    displayMonitoringCommands();

    console.log('\n✅ Vault audit logging configured successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Configure log rotation for /vault/logs/audit.log');
    console.log('   2. Set up log forwarding to centralized logging system');
    console.log('   3. Create alerts for suspicious activities');
    console.log('   4. Review audit logs regularly');
  } catch (error: any) {
    console.error('\n❌ Configuration failed:', error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
