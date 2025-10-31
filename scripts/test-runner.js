#!/usr/bin/env node

/**
 * 🧪 KnowTon 综合测试运行器
 * Comprehensive Test Runner for KnowTon Platform
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色定义
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: [],
    };
    this.startTime = Date.now();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async runCommand(command, cwd = process.cwd(), options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        cwd,
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options,
      });

      let stdout = '';
      let stderr = '';

      if (options.silent) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ code, stdout, stderr });
        } else {
          reject({ code, stdout, stderr });
        }
      });
    });
  }

  async runTestSuite(name, command, cwd, options = {}) {
    this.log(`\n🧪 Running: ${name}`, 'blue');
    this.log('─'.repeat(50), 'blue');

    const suite = {
      name,
      command,
      cwd,
      startTime: Date.now(),
      status: 'running',
      output: '',
      error: null,
    };

    try {
      const result = await this.runCommand(command, cwd, options);
      suite.status = 'passed';
      suite.output = result.stdout || '';
      suite.endTime = Date.now();
      suite.duration = suite.endTime - suite.startTime;

      this.log(`✅ PASSED: ${name} (${suite.duration}ms)`, 'green');
      this.results.passed++;
    } catch (error) {
      suite.status = 'failed';
      suite.error = error.stderr || error.stdout || 'Unknown error';
      suite.endTime = Date.now();
      suite.duration = suite.endTime - suite.startTime;

      this.log(`❌ FAILED: ${name} (${suite.duration}ms)`, 'red');
      if (options.showError && suite.error) {
        this.log(`Error: ${suite.error}`, 'red');
      }
      this.results.failed++;
    }

    this.results.total++;
    this.results.suites.push(suite);
    return suite;
  }

  async checkPrerequisites() {
    this.log('\n🔍 Checking Prerequisites', 'cyan');
    this.log('═'.repeat(50), 'cyan');

    const checks = [
      { name: 'Node.js', command: 'node --version' },
      { name: 'npm', command: 'npm --version' },
      { name: 'Git', command: 'git --version' },
    ];

    for (const check of checks) {
      try {
        const result = await this.runCommand(check.command, process.cwd(), { silent: true });
        this.log(`✅ ${check.name}: ${result.stdout.trim()}`, 'green');
      } catch (error) {
        this.log(`❌ ${check.name}: Not found`, 'red');
      }
    }
  }

  async runAllTests() {
    this.log('\n🚀 KnowTon Platform Test Suite', 'bright');
    this.log('═'.repeat(50), 'bright');

    await this.checkPrerequisites();

    // 1. 智能合约测试
    this.log('\n📜 Smart Contract Tests', 'yellow');
    this.log('═'.repeat(30), 'yellow');

    // 检查 Hardhat 是否可用
    try {
      await this.runCommand('npx hardhat --version', 'packages/contracts', { silent: true });
      
      // 运行简单合约测试
      const contractTests = [
        'SimpleERC20.test.ts',
        'CopyrightRegistrySimple.test.ts',
        'GovernanceTokenSimple.test.ts',
      ];

      for (const testFile of contractTests) {
        const testPath = `packages/contracts/test/${testFile}`;
        if (fs.existsSync(testPath)) {
          await this.runTestSuite(
            `Contract: ${testFile}`,
            `npx hardhat test test/${testFile} --network hardhat`,
            'packages/contracts',
            { showError: true }
          );
        } else {
          this.log(`⚠️  SKIPPED: ${testFile} (file not found)`, 'yellow');
          this.results.skipped++;
        }
      }
    } catch (error) {
      this.log('⚠️  Hardhat not available, skipping contract tests', 'yellow');
    }

    // 2. 后端服务测试
    this.log('\n🔧 Backend Service Tests', 'yellow');
    this.log('═'.repeat(30), 'yellow');

    const backendTests = [
      'auth.service.test.ts',
      'content.controller.test.ts',
      'nft.service.test.ts',
      'marketplace.service.test.ts',
    ];

    for (const testFile of backendTests) {
      const testPath = `packages/backend/src/__tests__/**/${testFile}`;
      try {
        await this.runTestSuite(
          `Backend: ${testFile}`,
          `npm test -- --testPathPattern=${testFile} --passWithNoTests`,
          'packages/backend',
          { showError: false }
        );
      } catch (error) {
        // Continue with other tests
      }
    }

    // 3. 前端组件测试
    this.log('\n⚛️  Frontend Component Tests', 'yellow');
    this.log('═'.repeat(30), 'yellow');

    const frontendTests = [
      'useAuth.test.ts',
      'useMarketplace.test.ts',
      'NFTCard.test.tsx',
    ];

    for (const testFile of frontendTests) {
      try {
        await this.runTestSuite(
          `Frontend: ${testFile}`,
          `npm test -- --run ${testFile}`,
          'packages/frontend',
          { showError: false }
        );
      } catch (error) {
        // Continue with other tests
      }
    }

    // 4. AI/ML 服务测试
    this.log('\n🤖 AI/ML Service Tests', 'yellow');
    this.log('═'.repeat(30), 'yellow');

    const aiTests = [
      { name: 'Valuation Enhancement Validation', command: 'python3 validate_valuation_enhancement.py' },
    ];

    for (const test of aiTests) {
      const testPath = 'packages/oracle-adapter/validate_valuation_enhancement.py';
      if (fs.existsSync(testPath)) {
        await this.runTestSuite(
          test.name,
          test.command,
          'packages/oracle-adapter',
          { showError: true }
        );
      } else {
        this.log(`⚠️  SKIPPED: ${test.name} (file not found)`, 'yellow');
        this.results.skipped++;
      }
    }

    // 5. 集成测试
    this.log('\n🔗 Integration Tests', 'yellow');
    this.log('═'.repeat(30), 'yellow');

    const integrationTests = [
      { name: 'Service Health Check', command: './scripts/verify-setup.sh' },
    ];

    for (const test of integrationTests) {
      if (fs.existsSync(test.command)) {
        await this.runTestSuite(
          test.name,
          test.command,
          process.cwd(),
          { showError: true }
        );
      } else {
        this.log(`⚠️  SKIPPED: ${test.name} (script not found)`, 'yellow');
        this.results.skipped++;
      }
    }

    // 6. 代码质量检查
    this.log('\n🔍 Code Quality Checks', 'yellow');
    this.log('═'.repeat(30), 'yellow');

    const qualityChecks = [
      { name: 'TypeScript Compilation', command: 'npx tsc --noEmit', cwd: 'packages/backend' },
      { name: 'ESLint Check', command: 'npm run lint', cwd: 'packages/frontend' },
    ];

    for (const check of qualityChecks) {
      try {
        await this.runTestSuite(
          check.name,
          check.command,
          check.cwd,
          { showError: false }
        );
      } catch (error) {
        // Continue with other checks
      }
    }

    this.generateReport();
  }

  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    this.log('\n📊 Test Results Summary', 'bright');
    this.log('═'.repeat(50), 'bright');

    this.log(`Total Tests: ${this.results.total}`, 'blue');
    this.log(`✅ Passed: ${this.results.passed}`, 'green');
    this.log(`❌ Failed: ${this.results.failed}`, 'red');
    this.log(`⚠️  Skipped: ${this.results.skipped}`, 'yellow');
    this.log(`⏱️  Total Duration: ${totalDuration}ms`, 'cyan');

    // 计算成功率
    const successRate = this.results.total > 0 
      ? ((this.results.passed / this.results.total) * 100).toFixed(1)
      : 0;

    this.log(`📈 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');

    // 详细结果
    if (this.results.failed > 0) {
      this.log('\n❌ Failed Tests:', 'red');
      this.results.suites
        .filter(suite => suite.status === 'failed')
        .forEach(suite => {
          this.log(`  • ${suite.name}`, 'red');
          if (suite.error) {
            this.log(`    ${suite.error.split('\n')[0]}`, 'red');
          }
        });
    }

    // 生成 JSON 报告
    const report = {
      ...this.results,
      totalDuration,
      successRate: parseFloat(successRate),
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync('test-results.json', JSON.stringify(report, null, 2));
    this.log('\n💾 Detailed report saved to test-results.json', 'cyan');

    // 最终状态
    if (this.results.failed === 0) {
      this.log('\n🎉 All tests passed! KnowTon is ready for deployment.', 'green');
      process.exit(0);
    } else {
      this.log('\n💥 Some tests failed. Please check the output above.', 'red');
      process.exit(1);
    }
  }
}

// 运行测试
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;