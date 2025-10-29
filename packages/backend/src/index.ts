import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import creatorRoutes from './routes/creator.routes';
import contentRoutes from './routes/content.routes';
import nftRoutes from './routes/nft.routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/v1/creators', creatorRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/nft', nftRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready' });
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Creator Service listening on port ${PORT}`);
});

export default app;
