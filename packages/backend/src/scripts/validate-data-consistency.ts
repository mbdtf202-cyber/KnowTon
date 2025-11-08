#!/usr/bin/env ts-node

/**
 * Data Consistency Validation Script
 * Validates data consistency between PostgreSQL, Elasticsearch, and ClickHouse
 * Requirements: 数据一致性需求
 */

import { CDCSyncService } from '../services/cdc-sync.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ValidationReport {
  timestamp: Date;
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  checks: Array<{
    name: string;
    status: 'PASS' | 'FAIL' | 'WARNING';
    details: string;
    expected?: number;
    actual?: number;
    difference?: number;
  }>;
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

async function validateDataConsistency(): Promise<ValidationReport> {
  console.log('🔍 Starting data consistency validation...\n');

  const cdcService = new CDCSyncService();
  const checks: ValidationReport['checks'] = [];

  try {
    // Check 1: CDC Service Health
    console.log('1️⃣  Checking CDC service health...');
    try {
      const health = await cdcService.getHealthStatus();
      checks.push({
        name: 'CDC Service Health',
        status: health.status === 'healthy' ? 'PASS' : health.status === 'degraded' ? 'WARNING' : 'FAIL',
        details: `Service status: ${health.status}, Sync lag: ${health.metrics.syncLag.toFixed(2)}s`,
      });
      console.log(`   ✓ Status: ${health.status}`);
    } catch (error) {
      checks.push({
        name: 'CDC Service Health',
        status: 'FAIL',
        details: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      console.log(`   ✗ Health check failed`);
    }

    // Check 2: Data Consistency
    console.log('\n2️⃣  Checking data consistency...');
    try {
      const consistency = await cdcService.validateDataConsistency();
      
      if (consistency.consistent) {
        checks.push({
          name: 'Data Consistency',
          status: 'PASS',
          details: 'All data is consistent across systems',
        });
        console.log('   ✓ All data is consistent');
      } else {
        checks.push({
          name: 'Data Consistency',
          status: 'FAIL',
          details: `Found ${consistency.issues.length} consistency issues`,
        });
        console.log(`   ✗ Found ${consistency.issues.length} issues:`);
        
        for (const issue of consistency.issues) {
          console.log(`      - ${issue.table}: ${issue.issue} (${issue.count} records)`);
          checks.push({
            name: `${issue.table} Consistency`,
            status: 'FAIL',
            details: issue.issue,
            difference: issue.count,
          });
        }
      }
    } catch (error) {
      checks.push({
        name: 'Data Consistency',
        status: 'FAIL',
        details: `Consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      console.log(`   ✗ Consistency check failed`);
    }

    // Check 3: Sync Lag
    console.log('\n3️⃣  Checking sync lag...');
    try {
      const health = await cdcService.getHealthStatus();
      const maxLag = health.metrics.syncLag;
      const lagThreshold = 60; // 60 seconds
      
      if (maxLag < lagThreshold) {
        checks.push({
          name: 'Sync Lag',
          status: 'PASS',
          details: `Maximum sync lag: ${maxLag.toFixed(2)}s (threshold: ${lagThreshold}s)`,
          actual: maxLag,
          expected: lagThreshold,
        });
        console.log(`   ✓ Sync lag: ${maxLag.toFixed(2)}s`);
      } else {
        checks.push({
          name: 'Sync Lag',
          status: 'WARNING',
          details: `Sync lag exceeds threshold: ${maxLag.toFixed(2)}s > ${lagThreshold}s`,
          actual: maxLag,
          expected: lagThreshold,
        });
        console.log(`   ⚠ Sync lag high: ${maxLag.toFixed(2)}s`);
      }
    } catch (error) {
      checks.push({
        name: 'Sync Lag',
        status: 'FAIL',
        details: `Lag check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      console.log(`   ✗ Lag check failed`);
    }

    // Check 4: Error Rate
    console.log('\n4️⃣  Checking error rate...');
    try {
      const health = await cdcService.getHealthStatus();
      const errorRate = health.metrics.errorRate;
      const errorThreshold = 0.05; // 5%
      
      if (errorRate < errorThreshold) {
        checks.push({
          name: 'Error Rate',
          status: 'PASS',
          details: `Error rate: ${(errorRate * 100).toFixed(2)}% (threshold: ${errorThreshold * 100}%)`,
          actual: errorRate,
          expected: errorThreshold,
        });
        console.log(`   ✓ Error rate: ${(errorRate * 100).toFixed(2)}%`);
      } else {
        checks.push({
          name: 'Error Rate',
          status: 'WARNING',
          details: `Error rate exceeds threshold: ${(errorRate * 100).toFixed(2)}% > ${errorThreshold * 100}%`,
          actual: errorRate,
          expected: errorThreshold,
        });
        console.log(`   ⚠ Error rate high: ${(errorRate * 100).toFixed(2)}%`);
      }
    } catch (error) {
      checks.push({
        name: 'Error Rate',
        status: 'FAIL',
        details: `Error rate check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      console.log(`   ✗ Error rate check failed`);
    }

    // Check 5: Throughput
    console.log('\n5️⃣  Checking throughput...');
    try {
      const health = await cdcService.getHealthStatus();
      const throughput = health.metrics.throughput;
      
      checks.push({
        name: 'Throughput',
        status: 'PASS',
        details: `Current throughput: ${throughput.toFixed(2)} events/second`,
        actual: throughput,
      });
      console.log(`   ✓ Throughput: ${throughput.toFixed(2)} events/s`);
    } catch (error) {
      checks.push({
        name: 'Throughput',
        status: 'FAIL',
        details: `Throughput check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      console.log(`   ✗ Throughput check failed`);
    }

  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    checks.push({
      name: 'Overall Validation',
      status: 'FAIL',
      details: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  } finally {
    await cdcService.stop();
    await prisma.$disconnect();
  }

  // Generate summary
  const summary = {
    totalChecks: checks.length,
    passed: checks.filter(c => c.status === 'PASS').length,
    failed: checks.filter(c => c.status === 'FAIL').length,
    warnings: checks.filter(c => c.status === 'WARNING').length,
  };

  const overallStatus: ValidationReport['overallStatus'] = 
    summary.failed > 0 ? 'FAIL' : 
    summary.warnings > 0 ? 'WARNING' : 
    'PASS';

  const report: ValidationReport = {
    timestamp: new Date(),
    overallStatus,
    checks,
    summary,
  };

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Overall Status: ${overallStatus}`);
  console.log(`Total Checks: ${summary.totalChecks}`);
  console.log(`✓ Passed: ${summary.passed}`);
  console.log(`✗ Failed: ${summary.failed}`);
  console.log(`⚠ Warnings: ${summary.warnings}`);
  console.log('='.repeat(60));

  return report;
}

// Run validation if executed directly
if (require.main === module) {
  validateDataConsistency()
    .then(report => {
      // Save report to file
      const fs = require('fs');
      const path = require('path');
      const reportDir = path.join(__dirname, '../../reports');
      
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      const reportFile = path.join(
        reportDir,
        `data-consistency-${new Date().toISOString().replace(/:/g, '-')}.json`
      );
      
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      console.log(`\n📄 Report saved to: ${reportFile}`);

      // Exit with appropriate code
      process.exit(report.overallStatus === 'FAIL' ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { validateDataConsistency, ValidationReport };
