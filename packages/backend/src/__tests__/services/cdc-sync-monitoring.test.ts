/**
 * CDC Sync Monitoring Tests
 * Tests health checks, metrics, and consistency validation
 */

import { CDCSyncService } from '../../services/cdc-sync.service';

describe('CDC Sync Monitoring', () => {
  let cdcService: CDCSyncService;

  beforeAll(() => {
    cdcService = new CDCSyncService();
  });

  afterAll(async () => {
    await cdcService.stop();
  });

  describe('Health Checks', () => {
    it('should return health status', async () => {
      const health = await cdcService.getHealthStatus();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('metrics');
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });

    it('should check service readiness', async () => {
      const ready = await cdcService.isReady();
      expect(typeof ready).toBe('boolean');
    });

    it('should check service liveness', async () => {
      const alive = await cdcService.isAlive();
      expect(typeof alive).toBe('boolean');
    });
  });

  describe('Metrics', () => {
    it('should export Prometheus metrics', async () => {
      const metrics = await cdcService.getMetrics();
      
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('cdc_sync_events_total');
      expect(metrics).toContain('cdc_sync_errors_total');
      expect(metrics).toContain('cdc_sync_latency_seconds');
      expect(metrics).toContain('cdc_sync_lag_seconds');
    });

    it('should include metric labels', async () => {
      const metrics = await cdcService.getMetrics();
      
      // Check for label presence
      expect(metrics).toMatch(/table=/);
      expect(metrics).toMatch(/status=/);
      expect(metrics).toMatch(/operation=/);
    });
  });

  describe('Data Consistency', () => {
    it('should validate data consistency', async () => {
      const result = await cdcService.validateDataConsistency();
      
      expect(result).toHaveProperty('consistent');
      expect(result).toHaveProperty('issues');
      expect(typeof result.consistent).toBe('boolean');
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should report consistency issues', async () => {
      const result = await cdcService.validateDataConsistency();
      
      if (!result.consistent) {
        expect(result.issues.length).toBeGreaterThan(0);
        
        result.issues.forEach(issue => {
          expect(issue).toHaveProperty('table');
          expect(issue).toHaveProperty('issue');
          expect(issue).toHaveProperty('count');
        });
      }
    });
  });

  describe('Service Health Components', () => {
    it('should check Kafka health', async () => {
      const health = await cdcService.getHealthStatus();
      expect(typeof health.services.kafka).toBe('boolean');
    });

    it('should check ClickHouse health', async () => {
      const health = await cdcService.getHealthStatus();
      expect(typeof health.services.clickhouse).toBe('boolean');
    });

    it('should check Elasticsearch health', async () => {
      const health = await cdcService.getHealthStatus();
      expect(typeof health.services.elasticsearch).toBe('boolean');
    });

    it('should check PostgreSQL health', async () => {
      const health = await cdcService.getHealthStatus();
      expect(typeof health.services.postgres).toBe('boolean');
    });
  });

  describe('Metrics Values', () => {
    it('should report sync lag', async () => {
      const health = await cdcService.getHealthStatus();
      expect(typeof health.metrics.syncLag).toBe('number');
      expect(health.metrics.syncLag).toBeGreaterThanOrEqual(0);
    });

    it('should report error rate', async () => {
      const health = await cdcService.getHealthStatus();
      expect(typeof health.metrics.errorRate).toBe('number');
      expect(health.metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(health.metrics.errorRate).toBeLessThanOrEqual(1);
    });

    it('should report throughput', async () => {
      const health = await cdcService.getHealthStatus();
      expect(typeof health.metrics.throughput).toBe('number');
      expect(health.metrics.throughput).toBeGreaterThanOrEqual(0);
    });
  });
});
