import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error';
import { logger } from './utils/logger';

import creatorRoutes from './routes/creator.routes';
import contentRoutes from './routes/content.routes';
import nftRoutes from './routes/nft.routes';
import royaltyRoutes from './routes/royalty.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import fractionalizationRoutes from './routes/fractionalization.routes';
import stakingRoutes from './routes/staking.routes';
import governanceRoutes from './routes/governance.routes';
import bondingRoutes from './routes/bonding.routes';
import lendingRoutes from './routes/lending.routes';
import analyticsRoutes from './routes/analytics.routes';
import tradingRoutes from './routes/trading';
import auditRoutes from './routes/audit.routes';
import { autoAuditMiddleware } from './middleware/audit.middleware';
import { requestIdMiddleware, requestLoggerMiddleware } from './middleware/requestLogger';
import { auditMetricsRegistry } from './services/audit-metrics.service';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Request tracking and logging
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// Auto audit middleware for sensitive operations
app.use(autoAuditMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Audit metrics endpoint for Prometheus
app.get('/metrics/audit', async (req, res) => {
  try {
    res.set('Content-Type', auditMetricsRegistry.contentType);
    const metrics = await auditMetricsRegistry.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Failed to get audit metrics', { error });
    res.status(500).end();
  }
});

app.use('/api/v1/creators', creatorRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/nft', nftRoutes);
app.use('/api/v1/royalty', royaltyRoutes);
app.use('/api/v1/marketplace', marketplaceRoutes);
app.use('/api/v1/fractionalization', fractionalizationRoutes);
app.use('/api/v1/staking', stakingRoutes);
app.use('/api/v1/governance', governanceRoutes);
app.use('/api/v1/bonding', bondingRoutes);
app.use('/api/v1/lending', lendingRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/trading', tradingRoutes);
app.use('/api/v1/audit', auditRoutes);

app.use(errorHandler);

export default app;
