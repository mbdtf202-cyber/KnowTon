import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/error';
import { logger } from './utils/logger';

import authRoutes from './routes/auth.routes';
import ssoRoutes from './routes/sso.routes';
import creatorRoutes from './routes/creator.routes';
import creatorQualificationRoutes from './routes/creator-qualification.routes';
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
import kycRoutes from './routes/kyc.routes';
import uploadRoutes, { uploadService } from './routes/upload.routes';
import similarityRoutes from './routes/similarity.routes';
import plagiarismRoutes from './routes/plagiarism.routes';
import royaltyDistributionRoutes from './routes/royalty-distribution.routes';
import videoPreviewRoutes from './routes/video-preview.routes';
import pdfPreviewRoutes from './routes/pdf-preview.routes';
import audioPreviewRoutes from './routes/audio-preview.routes';
import bulkPurchaseRoutes from './routes/bulk-purchase.routes';
import paymentRoutes from './routes/payment.routes';
import payoutRoutes from './routes/payout.routes';
import contentEncryptionRoutes from './routes/content-encryption.routes';
import deviceManagementRoutes from './routes/device-management.routes';
import watermarkRoutes from './routes/watermark.routes';
import screenRecordingPreventionRoutes from './routes/screen-recording-prevention.routes';
import recommendationRoutes from './routes/recommendation.routes';
import tenantRoutes from './routes/tenant.routes';
import brandingRoutes from './routes/branding.routes';
import apiCustomizationRoutes from './routes/api-customization.routes';
import dataSyncHealthRoutes from './routes/data-sync-health.routes';
import { autoAuditMiddleware } from './middleware/audit.middleware';
import { requestIdMiddleware, requestLoggerMiddleware } from './middleware/requestLogger';
import { auditMetricsRegistry } from './services/audit-metrics.service';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(cookieParser());
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

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth/sso', ssoRoutes);
app.use('/api/v1/creators', creatorRoutes);
app.use('/api/v1/creator-qualification', creatorQualificationRoutes);
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
app.use('/api/v1/kyc', kycRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/similarity', similarityRoutes);
app.use('/api/v1/plagiarism', plagiarismRoutes);
app.use('/api/royalty-distribution', royaltyDistributionRoutes);
app.use('/api/v1/preview', videoPreviewRoutes);
app.use('/api/v1/preview', pdfPreviewRoutes);
app.use('/api/v1/audio-preview', audioPreviewRoutes);
app.use('/api/v1/bulk-purchase', bulkPurchaseRoutes);
app.use('/api/v1/devices', deviceManagementRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/payouts', payoutRoutes);
app.use('/api/v1/content-encryption', contentEncryptionRoutes);
app.use('/api/v1/watermark', watermarkRoutes);
app.use('/api/v1/screen-recording-prevention', screenRecordingPreventionRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/branding', brandingRoutes);
app.use('/api/v1/api-customization', apiCustomizationRoutes);
app.use('/api/v1/data-sync', dataSyncHealthRoutes);

// Tus upload server for resumable uploads
app.all('/api/v1/upload/files', (req, res) => {
  uploadService.getServer().handle(req, res);
});
app.all('/api/v1/upload/files/*', (req, res) => {
  uploadService.getServer().handle(req, res);
});

app.use(errorHandler);

export default app;
