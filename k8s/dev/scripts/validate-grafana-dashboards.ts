#!/usr/bin/env ts-node
/**
 * Grafana Dashboard Validation Script
 * 
 * This script validates that all Prometheus queries in Grafana dashboards
 * return data and identifies any placeholder or broken queries.
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface PrometheusQuery {
  expr: string;
  legendFormat?: string;
  refId: string;
}

interface DashboardPanel {
  id: number;
  title: string;
  targets: PrometheusQuery[];
  type: string;
}

interface ValidationResult {
  dashboard: string;
  panel: string;
  query: string;
  status: 'success' | 'no_data' | 'error';
  message?: string;
  dataPoints?: number;
}

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';
const DASHBOARD_DIR = path.join(__dirname, '../grafana-dashboards');

class DashboardValidator {
  private results: ValidationResult[] = [];

  /**
   * Validate all dashboards
   */
  async validateAll(): Promise<void> {
    console.log('🔍 Starting Grafana dashboard validation...\n');
    console.log(`Prometheus URL: ${PROMETHEUS_URL}\n`);

    const dashboardFiles = fs.readdirSync(DASHBOARD_DIR)
      .filter(file => file.endsWith('.json'));

    for (const file of dashboardFiles) {
      await this.validateDashboard(file);
    }

    this.printSummary();
  }

  /**
   * Validate a single dashboard
   */
  private async validateDashboard(filename: string): Promise<void> {
    console.log(`📊 Validating dashboard: ${filename}`);
    
    const filePath = path.join(DASHBOARD_DIR, filename);
    const dashboard = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (!dashboard.panels || dashboard.panels.length === 0) {
      console.log(`  ⚠️  No panels found in dashboard\n`);
      return;
    }

    for (const panel of dashboard.panels) {
      await this.validatePanel(filename, panel);
    }

    console.log('');
  }

  /**
   * Validate a single panel
   */
  private async validatePanel(dashboardName: string, panel: DashboardPanel): Promise<void> {
    if (!panel.targets || panel.targets.length === 0) {
      console.log(`  ℹ️  Panel "${panel.title}" has no queries`);
      return;
    }

    for (const target of panel.targets) {
      if (!target.expr) {
        continue;
      }

      await this.validateQuery(dashboardName, panel.title, target);
    }
  }

  /**
   * Validate a single Prometheus query
   */
  private async validateQuery(
    dashboardName: string,
    panelTitle: string,
    query: PrometheusQuery
  ): Promise<void> {
    try {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: {
          query: query.expr,
        },
        timeout: 5000,
      });

      if (response.data.status === 'success') {
        const resultType = response.data.data.resultType;
        const results = response.data.data.result;

        if (results.length === 0) {
          console.log(`  ⚠️  Panel "${panelTitle}" - Query returns no data`);
          console.log(`      Query: ${query.expr}`);
          
          this.results.push({
            dashboard: dashboardName,
            panel: panelTitle,
            query: query.expr,
            status: 'no_data',
            message: 'Query returns no data points',
            dataPoints: 0,
          });
        } else {
          console.log(`  ✅ Panel "${panelTitle}" - Query OK (${results.length} series)`);
          
          this.results.push({
            dashboard: dashboardName,
            panel: panelTitle,
            query: query.expr,
            status: 'success',
            dataPoints: results.length,
          });
        }
      } else {
        console.log(`  ❌ Panel "${panelTitle}" - Query failed`);
        console.log(`      Query: ${query.expr}`);
        console.log(`      Error: ${response.data.error}`);
        
        this.results.push({
          dashboard: dashboardName,
          panel: panelTitle,
          query: query.expr,
          status: 'error',
          message: response.data.error,
        });
      }
    } catch (error: any) {
      console.log(`  ❌ Panel "${panelTitle}" - Query error`);
      console.log(`      Query: ${query.expr}`);
      console.log(`      Error: ${error.message}`);
      
      this.results.push({
        dashboard: dashboardName,
        panel: panelTitle,
        query: query.expr,
        status: 'error',
        message: error.message,
      });
    }
  }

  /**
   * Print validation summary
   */
  private printSummary(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📈 VALIDATION SUMMARY');
    console.log('='.repeat(80) + '\n');

    const totalQueries = this.results.length;
    const successQueries = this.results.filter(r => r.status === 'success').length;
    const noDataQueries = this.results.filter(r => r.status === 'no_data').length;
    const errorQueries = this.results.filter(r => r.status === 'error').length;

    console.log(`Total Queries:    ${totalQueries}`);
    console.log(`✅ Success:       ${successQueries} (${((successQueries / totalQueries) * 100).toFixed(1)}%)`);
    console.log(`⚠️  No Data:       ${noDataQueries} (${((noDataQueries / totalQueries) * 100).toFixed(1)}%)`);
    console.log(`❌ Errors:        ${errorQueries} (${((errorQueries / totalQueries) * 100).toFixed(1)}%)`);

    if (noDataQueries > 0) {
      console.log('\n' + '-'.repeat(80));
      console.log('⚠️  QUERIES WITH NO DATA:');
      console.log('-'.repeat(80) + '\n');

      const noDataResults = this.results.filter(r => r.status === 'no_data');
      for (const result of noDataResults) {
        console.log(`Dashboard: ${result.dashboard}`);
        console.log(`Panel:     ${result.panel}`);
        console.log(`Query:     ${result.query}`);
        console.log('');
      }
    }

    if (errorQueries > 0) {
      console.log('\n' + '-'.repeat(80));
      console.log('❌ QUERIES WITH ERRORS:');
      console.log('-'.repeat(80) + '\n');

      const errorResults = this.results.filter(r => r.status === 'error');
      for (const result of errorResults) {
        console.log(`Dashboard: ${result.dashboard}`);
        console.log(`Panel:     ${result.panel}`);
        console.log(`Query:     ${result.query}`);
        console.log(`Error:     ${result.message}`);
        console.log('');
      }
    }

    // Save results to JSON file
    const resultsPath = path.join(__dirname, '../validation-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed results saved to: ${resultsPath}\n`);
  }
}

// Run validation
const validator = new DashboardValidator();
validator.validateAll().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});
