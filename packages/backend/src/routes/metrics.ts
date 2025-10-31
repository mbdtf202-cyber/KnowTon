/**
 * Metrics Routes
 * Exposes Prometheus metrics endpoint
 */

import { Router } from 'express';
import { metricsExporter } from '../services/metrics-exporter.service';

const router = Router();

/**
 * GET /metrics
 * Returns Prometheus metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await metricsExporter.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});

export default router;
