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

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

app.use(errorHandler);

export default app;
