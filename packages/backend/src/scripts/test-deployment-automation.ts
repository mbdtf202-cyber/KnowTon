#!/usr/bin/env ts-node

/**
 * Test Deployment Automation
 * 
 * Tests the tenant provisioning and monitoring systems
 */

import TenantProvisioner from './provision-tenant';
import TenantMonitor from './monitor-tenants';
import tenantService from '../services/tenant.service';
import tenantMonitoringService from '../services/tenant-monitoring.service';

async function testProvisioningSystem() {
  console.log('\n🧪 Testing Tenant Provisioning System\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const provisioner = new TenantProvisioner();

    // Test 1: Provision a test tenant
    console.log('Test 1: Provisioning test tenant...');
    const result = await provisioner.provision({
      name: 'Test Tenant',
      slug: `test-${Date.now()}`,
      plan: 'professional',
      adminEmail: 'admin@test.com',
      features: {
        enableNFT: true,
        enableBonds: true,
        enableFractionalization: true,
        enableEnterprise: false
      },
      branding: {
        companyName: 'Test Company',
        primaryColor: '#3B82F6',
        secondaryColor: '#8B5CF6'
      }
    });

    console.log('✅ Test 1 passed: Tenant provisioned successfully');
    console.log(`   Tenant ID: ${result.tenant.id}`);
    console.log(`   Admin Email: ${result.adminUser.email}`);
    console.log(`   API Keys: ${result.apiKeys.length}`);

    // Test 2: Verify tenant configuration
    console.log('\nTest 2: Verifying tenant configuration...');
    const tenant = await tenantService.getTenantById(result.tenant.id);
    
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    
    if (tenant.plan !== 'professional') {
      throw new Error('Tenant plan mismatch');
    }
    
    if (!tenant.tenantConfig) {
      throw new Error('Tenant config not found');
    }

    console.log('✅ Test 2 passed: Tenant configuration verified');

    // Test 3: Verify API keys
    console.log('\nTest 3: Verifying API keys...');
    const apiKeys = await tenantService.listApiKeys(result.tenant.id);
    
    if (apiKeys.length !== 2) {
      throw new Error(`Expected 2 API keys, got ${apiKeys.length}`);
    }

    console.log('✅ Test 3 passed: API keys verified');

    // Test 4: Check tenant limits
    console.log('\nTest 4: Checking tenant limits...');
    const limits = await tenantService.checkLimits(result.tenant.id);
    
    if (limits.users.limit !== 100) {
      throw new Error('User limit mismatch');
    }

    console.log('✅ Test 4 passed: Tenant limits correct');

    // Test 5: Deprovision tenant
    console.log('\nTest 5: Deprovisioning test tenant...');
    await provisioner.deprovision(result.tenant.id);

    console.log('✅ Test 5 passed: Tenant deprovisioned successfully');

    console.log('\n✅ All provisioning tests passed!\n');
    return true;

  } catch (error) {
    console.error('\n❌ Provisioning test failed:', error);
    return false;
  }
}

async function testMonitoringSystem() {
  console.log('\n🧪 Testing Tenant Monitoring System\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Create a test tenant for monitoring
    const provisioner = new TenantProvisioner();
    const result = await provisioner.provision({
      name: 'Monitor Test Tenant',
      slug: `monitor-test-${Date.now()}`,
      plan: 'basic',
      adminEmail: 'monitor@test.com'
    });

    const tenantId = result.tenant.id;

    // Test 1: Check tenant health
    console.log('Test 1: Checking tenant health...');
    const health = await tenantMonitoringService.checkTenantHealth(tenantId);
    
    if (!health) {
      throw new Error('Health check failed');
    }
    
    if (!health.status) {
      throw new Error('Health status missing');
    }

    console.log('✅ Test 1 passed: Health check completed');
    console.log(`   Status: ${health.status}`);
    console.log(`   Alerts: ${health.alerts.length}`);

    // Test 2: Get health history
    console.log('\nTest 2: Getting health history...');
    const history = await tenantMonitoringService.getHealthHistory(tenantId);
    
    if (!Array.isArray(history)) {
      throw new Error('Health history should be an array');
    }

    console.log('✅ Test 2 passed: Health history retrieved');
    console.log(`   Records: ${history.length}`);

    // Test 3: Get monitoring dashboard
    console.log('\nTest 3: Getting monitoring dashboard...');
    const dashboard = await tenantMonitoringService.getMonitoringDashboard(tenantId);
    
    if (!dashboard.tenant || !dashboard.health) {
      throw new Error('Dashboard data incomplete');
    }

    console.log('✅ Test 3 passed: Dashboard data retrieved');

    // Test 4: Check all tenants
    console.log('\nTest 4: Checking all tenants...');
    const monitor = new TenantMonitor();
    const report = await monitor.checkAll();
    
    if (!report || report.totalTenants === 0) {
      throw new Error('No tenants found');
    }

    console.log('✅ Test 4 passed: All tenants checked');
    console.log(`   Total: ${report.totalTenants}`);
    console.log(`   Healthy: ${report.healthy}`);

    // Cleanup
    console.log('\nCleaning up test tenant...');
    await provisioner.deprovision(tenantId);

    console.log('\n✅ All monitoring tests passed!\n');
    return true;

  } catch (error) {
    console.error('\n❌ Monitoring test failed:', error);
    return false;
  }
}

async function testDeploymentScripts() {
  console.log('\n🧪 Testing Deployment Scripts\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Test 1: Verify deployment script exists
    console.log('Test 1: Verifying deployment script...');
    const fs = require('fs');
    const path = require('path');
    
    const scriptPath = path.join(__dirname, 'deploy-tenant.sh');
    if (!fs.existsSync(scriptPath)) {
      throw new Error('Deployment script not found');
    }

    console.log('✅ Test 1 passed: Deployment script exists');

    // Test 2: Verify script is executable
    console.log('\nTest 2: Checking script permissions...');
    const stats = fs.statSync(scriptPath);
    const isExecutable = !!(stats.mode & fs.constants.S_IXUSR);
    
    if (!isExecutable) {
      console.log('⚠️  Warning: Script is not executable');
      console.log('   Run: chmod +x deploy-tenant.sh');
    } else {
      console.log('✅ Test 2 passed: Script is executable');
    }

    // Test 3: Verify Kubernetes CronJob config
    console.log('\nTest 3: Verifying Kubernetes CronJob config...');
    const cronJobPath = path.join(__dirname, '../../../k8s/dev/tenant-monitoring-cronjob.yaml');
    
    if (!fs.existsSync(cronJobPath)) {
      throw new Error('CronJob config not found');
    }

    console.log('✅ Test 3 passed: CronJob config exists');

    console.log('\n✅ All deployment script tests passed!\n');
    return true;

  } catch (error) {
    console.error('\n❌ Deployment script test failed:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║     Deployment Automation Test Suite                 ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const results = {
    provisioning: false,
    monitoring: false,
    deployment: false
  };

  // Run tests
  results.provisioning = await testProvisioningSystem();
  results.monitoring = await testMonitoringSystem();
  results.deployment = await testDeploymentScripts();

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║     Test Summary                                      ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const icon = (passed: boolean) => passed ? '✅' : '❌';
  
  console.log(`${icon(results.provisioning)} Provisioning System`);
  console.log(`${icon(results.monitoring)} Monitoring System`);
  console.log(`${icon(results.deployment)} Deployment Scripts`);

  const allPassed = Object.values(results).every(r => r);
  
  console.log('\n═══════════════════════════════════════════════════════\n');
  
  if (allPassed) {
    console.log('✅ All tests passed! Deployment automation is ready.\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { testProvisioningSystem, testMonitoringSystem, testDeploymentScripts };
