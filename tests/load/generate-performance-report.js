#!/usr/bin/env node

/**
 * Performance Report Generator
 * Task 17.3.5: 生成性能报告
 * 
 * Generates comprehensive performance reports from load test results:
 * - 汇总所有测试结果
 * - 识别性能瓶颈和优化建议
 * - 创建性能基准文档
 * - 制定性能优化计划
 */

const fs = require('fs');
const path = require('path');

// Configuration
const REPORTS_DIR = path.join(__dirname, 'reports');
const OUTPUT_FILE = path.join(REPORTS_DIR, 'performance-report.md');
const BASELINE_FILE = path.join(REPORTS_DIR, 'performance-baseline.json');

// Performance thresholds
const THRESHOLDS = {
  api: {
    p95: 500,  // ms
    p99: 1000, // ms
    errorRate: 0.05, // 5%
  },
  database: {
    postgres: {
      read: 200,  // ms
      write: 300, // ms
    },
    mongodb: 250,   // ms
    clickhouse: 1000, // ms
    redis: 50,      // ms
  },
  stress: {
    maxUsers: 500,
    errorRate: 0.25, // 25%
  },
  soak: {
    duration: 24, // hours
    degradation: 0.5, // 50% latency increase
    errorRate: 0.05, // 5%
  },
};

class PerformanceReportGenerator {
  constructor() {
    this.reports = {
      api: null,
      database: null,
      stress: null,
      soak: null,
    };
    this.baseline = null;
  }

  // Load all test reports
  loadReports() {
    console.log('📂 Loading test reports...');
    
    if (!fs.existsSync(REPORTS_DIR)) {
      console.error('❌ Reports directory not found. Run load tests first.');
      process.exit(1);
    }

    const files = fs.readdirSync(REPORTS_DIR);
    
    // Load latest reports for each test type
    const testTypes = ['api-load-test', 'database-load-test', 'stress-test', 'soak-test'];
    
    testTypes.forEach(testType => {
      const testFiles = files.filter(f => f.startsWith(testType) && f.endsWith('.json') && !f.includes('summary'));
      
      if (testFiles.length > 0) {
        // Get the latest file
        const latestFile = testFiles.sort().reverse()[0];
        const filePath = path.join(REPORTS_DIR, latestFile);
        
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const key = testType.replace('-load-test', '').replace('-test', '');
          this.reports[key] = data;
          console.log(`✅ Loaded ${testType}: ${latestFile}`);
        } catch (error) {
          console.warn(`⚠️  Failed to load ${testType}: ${error.message}`);
        }
      } else {
        console.warn(`⚠️  No reports found for ${testType}`);
      }
    });

    // Load baseline if exists
    if (fs.existsSync(BASELINE_FILE)) {
      this.baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
      console.log('✅ Loaded performance baseline');
    } else {
      console.log('ℹ️  No baseline found. This will be the first baseline.');
    }
  }

  // Extract metrics from report
  extractMetrics(report) {
    if (!report || !report.metrics) return null;

    const metrics = report.metrics;
    
    return {
      duration: metrics.http_req_duration?.values || {},
      failed: metrics.http_req_failed?.values || {},
      reqs: metrics.http_reqs?.values || {},
      vus: metrics.vus?.values || {},
      custom: Object.keys(metrics)
        .filter(k => !k.startsWith('http_') && !k.startsWith('vus'))
        .reduce((acc, k) => {
          acc[k] = metrics[k].values;
          return acc;
        }, {}),
    };
  }

  // Analyze API load test results
  analyzeAPITest() {
    if (!this.reports.api) return null;

    const metrics = this.extractMetrics(this.reports.api);
    if (!metrics) return null;

    const p95 = metrics.duration['p(95)'] || 0;
    const p99 = metrics.duration['p(99)'] || 0;
    const errorRate = metrics.failed.rate || 0;
    const totalRequests = metrics.reqs.count || 0;
    const throughput = metrics.reqs.rate || 0;

    const analysis = {
      summary: {
        totalRequests,
        throughput: throughput.toFixed(2) + ' req/s',
        p95Latency: p95.toFixed(2) + 'ms',
        p99Latency: p99.toFixed(2) + 'ms',
        errorRate: (errorRate * 100).toFixed(2) + '%',
      },
      status: {
        p95: p95 < THRESHOLDS.api.p95 ? 'PASS' : 'FAIL',
        p99: p99 < THRESHOLDS.api.p99 ? 'PASS' : 'FAIL',
        errorRate: errorRate < THRESHOLDS.api.errorRate ? 'PASS' : 'FAIL',
      },
      bottlenecks: [],
      recommendations: [],
    };

    // Identify bottlenecks
    if (p95 >= THRESHOLDS.api.p95) {
      analysis.bottlenecks.push(`High P95 latency: ${p95.toFixed(2)}ms (threshold: ${THRESHOLDS.api.p95}ms)`);
      analysis.recommendations.push('Optimize slow API endpoints and database queries');
    }

    if (errorRate >= THRESHOLDS.api.errorRate) {
      analysis.bottlenecks.push(`High error rate: ${(errorRate * 100).toFixed(2)}% (threshold: ${THRESHOLDS.api.errorRate * 100}%)`);
      analysis.recommendations.push('Improve error handling and implement retry mechanisms');
    }

    // Endpoint-specific analysis
    const endpointMetrics = ['nft_mint_latency', 'marketplace_latency', 'trading_latency', 'analytics_latency'];
    endpointMetrics.forEach(metric => {
      if (metrics.custom[metric]) {
        const p95Value = metrics.custom[metric]['p(95)'];
        if (p95Value > 1000) {
          analysis.bottlenecks.push(`${metric}: ${p95Value.toFixed(2)}ms`);
        }
      }
    });

    return analysis;
  }

  // Analyze database load test results
  analyzeDatabaseTest() {
    if (!this.reports.database) return null;

    const metrics = this.extractMetrics(this.reports.database);
    if (!metrics) return null;

    const analysis = {
      summary: {},
      status: {},
      bottlenecks: [],
      recommendations: [],
    };

    // Analyze each database
    const databases = {
      postgres_read: { threshold: THRESHOLDS.database.postgres.read, name: 'PostgreSQL Read' },
      postgres_write: { threshold: THRESHOLDS.database.postgres.write, name: 'PostgreSQL Write' },
      mongo_query: { threshold: THRESHOLDS.database.mongodb, name: 'MongoDB Query' },
      clickhouse_query: { threshold: THRESHOLDS.database.clickhouse, name: 'ClickHouse Query' },
    };

    Object.entries(databases).forEach(([key, config]) => {
      const metricKey = `${key}_latency`;
      if (metrics.custom[metricKey]) {
        const p95 = metrics.custom[metricKey]['p(95)'] || 0;
        analysis.summary[config.name] = p95.toFixed(2) + 'ms';
        analysis.status[config.name] = p95 < config.threshold ? 'PASS' : 'FAIL';

        if (p95 >= config.threshold) {
          analysis.bottlenecks.push(`${config.name}: ${p95.toFixed(2)}ms (threshold: ${config.threshold}ms)`);
        }
      }
    });

    // Redis cache analysis
    if (metrics.custom.redis_cache_hit_rate) {
      const hitRate = metrics.custom.redis_cache_hit_rate.rate || 0;
      analysis.summary['Redis Cache Hit Rate'] = (hitRate * 100).toFixed(2) + '%';
      analysis.status['Redis Cache'] = hitRate > 0.80 ? 'PASS' : 'FAIL';

      if (hitRate < 0.80) {
        analysis.bottlenecks.push(`Low cache hit rate: ${(hitRate * 100).toFixed(2)}%`);
        analysis.recommendations.push('Review caching strategy and increase cache TTL for frequently accessed data');
      }
    }

    // Slow queries
    if (metrics.custom.slow_queries) {
      const slowQueries = metrics.custom.slow_queries.count || 0;
      if (slowQueries > 0) {
        analysis.bottlenecks.push(`${slowQueries} slow queries detected`);
        analysis.recommendations.push('Analyze slow query logs and add database indexes');
      }
    }

    return analysis;
  }

  // Analyze stress test results
  analyzeStressTest() {
    if (!this.reports.stress) return null;

    const metrics = this.extractMetrics(this.reports.stress);
    if (!metrics) return null;

    const p95 = metrics.duration['p(95)'] || 0;
    const errorRate = metrics.failed.rate || 0;
    const maxVUs = metrics.vus.max || 0;
    const breakpoint = metrics.custom.system_breakpoint?.count || 0;

    const analysis = {
      summary: {
        maxConcurrentUsers: maxVUs,
        p95Latency: p95.toFixed(2) + 'ms',
        errorRate: (errorRate * 100).toFixed(2) + '%',
        breakpointDetected: breakpoint > 0 ? 'Yes' : 'No',
      },
      status: {
        capacity: maxVUs >= THRESHOLDS.stress.maxUsers ? 'PASS' : 'FAIL',
        errorRate: errorRate < THRESHOLDS.stress.errorRate ? 'PASS' : 'FAIL',
      },
      bottlenecks: [],
      recommendations: [],
    };

    if (breakpoint > 0) {
      analysis.bottlenecks.push('System breakpoint detected during stress test');
      analysis.recommendations.push('Scale horizontally by adding more instances');
      analysis.recommendations.push('Review HPA configuration for automatic scaling');
    }

    if (errorRate >= THRESHOLDS.stress.errorRate) {
      analysis.bottlenecks.push(`High error rate under stress: ${(errorRate * 100).toFixed(2)}%`);
      analysis.recommendations.push('Implement circuit breakers and graceful degradation');
    }

    return analysis;
  }

  // Analyze soak test results
  analyzeSoakTest() {
    if (!this.reports.soak) return null;

    const metrics = this.extractMetrics(this.reports.soak);
    if (!metrics) return null;

    const errorRate = metrics.failed.rate || 0;
    const memoryLeaks = metrics.custom.memory_leak_indicators?.count || 0;
    const degradation = metrics.custom.performance_degradation?.count || 0;

    const analysis = {
      summary: {
        duration: THRESHOLDS.soak.duration + ' hours',
        errorRate: (errorRate * 100).toFixed(2) + '%',
        memoryLeakIndicators: memoryLeaks,
        performanceDegradation: degradation,
      },
      status: {
        errorRate: errorRate < THRESHOLDS.soak.errorRate ? 'PASS' : 'FAIL',
        memoryLeaks: memoryLeaks === 0 ? 'PASS' : 'FAIL',
        degradation: degradation === 0 ? 'PASS' : 'FAIL',
      },
      bottlenecks: [],
      recommendations: [],
    };

    if (memoryLeaks > 0) {
      analysis.bottlenecks.push(`${memoryLeaks} memory leak indicators detected`);
      analysis.recommendations.push('Perform heap dump analysis');
      analysis.recommendations.push('Review database connection pooling');
      analysis.recommendations.push('Check for unclosed event listeners');
    }

    if (degradation > 0) {
      analysis.bottlenecks.push(`${degradation} performance degradation events`);
      analysis.recommendations.push('Monitor resource utilization trends');
      analysis.recommendations.push('Implement periodic cache cleanup');
    }

    return analysis;
  }

  // Generate markdown report
  generateMarkdownReport() {
    console.log('📝 Generating performance report...');

    const apiAnalysis = this.analyzeAPITest();
    const dbAnalysis = this.analyzeDatabaseTest();
    const stressAnalysis = this.analyzeStressTest();
    const soakAnalysis = this.analyzeSoakTest();

    let report = `# KnowTon Platform Performance Report

Generated: ${new Date().toISOString()}

## Executive Summary

This report summarizes the performance testing results for the KnowTon platform, including API load tests, database performance tests, stress tests, and soak tests.

`;

    // API Load Test Results
    if (apiAnalysis) {
      report += `## 1. API Load Test Results

### Summary
- **Total Requests**: ${apiAnalysis.summary.totalRequests}
- **Throughput**: ${apiAnalysis.summary.throughput}
- **P95 Latency**: ${apiAnalysis.summary.p95Latency} ${apiAnalysis.status.p95 === 'PASS' ? '✅' : '❌'}
- **P99 Latency**: ${apiAnalysis.summary.p99Latency} ${apiAnalysis.status.p99 === 'PASS' ? '✅' : '❌'}
- **Error Rate**: ${apiAnalysis.summary.errorRate} ${apiAnalysis.status.errorRate === 'PASS' ? '✅' : '❌'}

`;

      if (apiAnalysis.bottlenecks.length > 0) {
        report += `### Bottlenecks Identified
${apiAnalysis.bottlenecks.map(b => `- ${b}`).join('\n')}

`;
      }

      if (apiAnalysis.recommendations.length > 0) {
        report += `### Recommendations
${apiAnalysis.recommendations.map(r => `- ${r}`).join('\n')}

`;
      }
    }

    // Database Load Test Results
    if (dbAnalysis) {
      report += `## 2. Database Performance Test Results

### Summary
${Object.entries(dbAnalysis.summary).map(([key, value]) => {
  const status = dbAnalysis.status[key];
  return `- **${key}**: ${value} ${status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : ''}`;
}).join('\n')}

`;

      if (dbAnalysis.bottlenecks.length > 0) {
        report += `### Bottlenecks Identified
${dbAnalysis.bottlenecks.map(b => `- ${b}`).join('\n')}

`;
      }

      if (dbAnalysis.recommendations.length > 0) {
        report += `### Recommendations
${dbAnalysis.recommendations.map(r => `- ${r}`).join('\n')}

`;
      }
    }

    // Stress Test Results
    if (stressAnalysis) {
      report += `## 3. Stress Test Results

### Summary
- **Max Concurrent Users**: ${stressAnalysis.summary.maxConcurrentUsers} ${stressAnalysis.status.capacity === 'PASS' ? '✅' : '❌'}
- **P95 Latency**: ${stressAnalysis.summary.p95Latency}
- **Error Rate**: ${stressAnalysis.summary.errorRate} ${stressAnalysis.status.errorRate === 'PASS' ? '✅' : '❌'}
- **Breakpoint Detected**: ${stressAnalysis.summary.breakpointDetected}

`;

      if (stressAnalysis.bottlenecks.length > 0) {
        report += `### Bottlenecks Identified
${stressAnalysis.bottlenecks.map(b => `- ${b}`).join('\n')}

`;
      }

      if (stressAnalysis.recommendations.length > 0) {
        report += `### Recommendations
${stressAnalysis.recommendations.map(r => `- ${r}`).join('\n')}

`;
      }
    }

    // Soak Test Results
    if (soakAnalysis) {
      report += `## 4. Soak Test Results

### Summary
- **Duration**: ${soakAnalysis.summary.duration}
- **Error Rate**: ${soakAnalysis.summary.errorRate} ${soakAnalysis.status.errorRate === 'PASS' ? '✅' : '❌'}
- **Memory Leak Indicators**: ${soakAnalysis.summary.memoryLeakIndicators} ${soakAnalysis.status.memoryLeaks === 'PASS' ? '✅' : '❌'}
- **Performance Degradation**: ${soakAnalysis.summary.performanceDegradation} ${soakAnalysis.status.degradation === 'PASS' ? '✅' : '❌'}

`;

      if (soakAnalysis.bottlenecks.length > 0) {
        report += `### Bottlenecks Identified
${soakAnalysis.bottlenecks.map(b => `- ${b}`).join('\n')}

`;
      }

      if (soakAnalysis.recommendations.length > 0) {
        report += `### Recommendations
${soakAnalysis.recommendations.map(r => `- ${r}`).join('\n')}

`;
      }
    }

    // Overall Recommendations
    report += `## 5. Performance Optimization Plan

### Immediate Actions (P0)
`;

    const allRecommendations = [
      ...(apiAnalysis?.recommendations || []),
      ...(dbAnalysis?.recommendations || []),
      ...(stressAnalysis?.recommendations || []),
      ...(soakAnalysis?.recommendations || []),
    ];

    const uniqueRecommendations = [...new Set(allRecommendations)];
    
    if (uniqueRecommendations.length > 0) {
      uniqueRecommendations.slice(0, 3).forEach((rec, i) => {
        report += `${i + 1}. ${rec}\n`;
      });
    } else {
      report += `No critical issues identified. System is performing well.\n`;
    }

    report += `
### Short-term Improvements (P1)
1. Implement comprehensive caching strategy
2. Optimize database indexes and queries
3. Set up automated performance monitoring

### Long-term Improvements (P2)
1. Implement CDN for static assets
2. Consider database sharding for scalability
3. Implement advanced load balancing strategies

## 6. Performance Baseline

`;

    if (this.baseline) {
      report += `Previous baseline from: ${this.baseline.timestamp}

### Comparison
- API P95 Latency: ${this.baseline.api?.p95 || 'N/A'} → ${apiAnalysis?.summary.p95Latency || 'N/A'}
- Database Performance: ${this.baseline.database?.status || 'N/A'} → ${dbAnalysis ? 'See above' : 'N/A'}
- Max Concurrent Users: ${this.baseline.stress?.maxUsers || 'N/A'} → ${stressAnalysis?.summary.maxConcurrentUsers || 'N/A'}

`;
    } else {
      report += `This is the first performance test. Establishing baseline for future comparisons.

`;
    }

    // Save new baseline
    const newBaseline = {
      timestamp: new Date().toISOString(),
      api: apiAnalysis ? {
        p95: apiAnalysis.summary.p95Latency,
        p99: apiAnalysis.summary.p99Latency,
        errorRate: apiAnalysis.summary.errorRate,
        throughput: apiAnalysis.summary.throughput,
      } : null,
      database: dbAnalysis ? {
        status: Object.values(dbAnalysis.status).every(s => s === 'PASS') ? 'PASS' : 'FAIL',
        summary: dbAnalysis.summary,
      } : null,
      stress: stressAnalysis ? {
        maxUsers: stressAnalysis.summary.maxConcurrentUsers,
        breakpoint: stressAnalysis.summary.breakpointDetected,
      } : null,
      soak: soakAnalysis ? {
        memoryLeaks: soakAnalysis.summary.memoryLeakIndicators,
        degradation: soakAnalysis.summary.performanceDegradation,
      } : null,
    };

    fs.writeFileSync(BASELINE_FILE, JSON.stringify(newBaseline, null, 2));
    console.log('✅ Updated performance baseline');

    report += `## 7. Next Steps

1. Review and prioritize recommendations
2. Implement performance optimizations
3. Re-run tests to validate improvements
4. Update performance baseline
5. Set up continuous performance monitoring

---

*Report generated by KnowTon Performance Testing Suite*
`;

    return report;
  }

  // Generate report
  generate() {
    this.loadReports();
    const report = this.generateMarkdownReport();
    
    // Ensure reports directory exists
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, report);
    console.log(`✅ Performance report generated: ${OUTPUT_FILE}`);
    
    // Also output to console
    console.log('\n' + '='.repeat(80));
    console.log(report);
    console.log('='.repeat(80));
  }
}

// Run report generator
if (require.main === module) {
  const generator = new PerformanceReportGenerator();
  generator.generate();
}

module.exports = PerformanceReportGenerator;
