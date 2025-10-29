import http from 'http';
import app from './app';
import { logger } from './utils/logger';
import { MarketplaceService } from './services/marketplace.service';
import { RoyaltyService } from './services/royalty.service';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const marketplaceService = new MarketplaceService();
marketplaceService.setupWebSocket(server);

const royaltyService = new RoyaltyService();
royaltyService.startEventListener();

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await royaltyService.stopEventListener();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await royaltyService.stopEventListener();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default server;
