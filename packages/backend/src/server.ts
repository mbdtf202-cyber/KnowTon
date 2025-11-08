import http from 'http';
import app from './app';
import { logger } from './utils/logger';
import { MarketplaceService } from './services/marketplace.service';
import { RoyaltyService } from './services/royalty.service';
import { metricsExporter } from './services/metrics-exporter.service';
import { websocketService } from './services/websocket.service';
import { CDCSyncService } from './services/cdc-sync.service';
import { setCDCService } from './routes/data-sync-health.routes';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const marketplaceService = new MarketplaceService();
marketplaceService.setupWebSocket(server);

const royaltyService = new RoyaltyService();
royaltyService.startEventListener();

// Initialize CDC Sync Service
const cdcSyncService = new CDCSyncService();
setCDCService(cdcSyncService);

// Start CDC sync service
cdcSyncService.start().then(() => {
  logger.info('CDC Sync Service started');
}).catch((error) => {
  logger.error('Failed to start CDC Sync Service', { error });
});

// Start metrics exporter
metricsExporter.start();

// Initialize WebSocket for real-time metrics
websocketService.initialize(server);

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Metrics exporter started');
  logger.info('CDC Sync Service initialized');
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  metricsExporter.stop();
  websocketService.shutdown();
  await royaltyService.stopEventListener();
  await cdcSyncService.stop();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  metricsExporter.stop();
  websocketService.shutdown();
  await royaltyService.stopEventListener();
  await cdcSyncService.stop();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default server;
