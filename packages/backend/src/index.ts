import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import simpleRoutes from './routes/simple.routes';
import tradingRoutes from './routes/trading';
import bondsRoutes from './routes/bonds';
import paymentRoutes from './routes/payment.routes';
import payoutRoutes from './routes/payout.routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
  credentials: true,
}));

// Special handling for Stripe webhooks (needs raw body)
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/v1/payouts/webhook/connect', express.raw({ type: 'application/json' }));

// Regular JSON parsing for other routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/v1', simpleRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/bonds', bondsRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/payouts', payoutRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      database: 'mock data',
      redis: 'not connected'
    }
  });
});

app.get('/ready', (_req, res) => {
  res.json({ status: 'ready' });
});

// API documentation
app.get('/api-docs', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>KnowTon API Documentation</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .endpoint { margin: 20px 0; padding: 15px; border-left: 4px solid #007acc; background: #f8f9fa; }
        .method { color: #007acc; font-weight: bold; }
        h1 { color: #333; }
        h3 { color: #555; margin: 0 0 10px 0; }
      </style>
    </head>
    <body>
      <h1>🚀 KnowTon API Documentation</h1>
      <p>RESTful API for the KnowTon Web3 IP Platform</p>
      
      <h2>📊 System</h2>
      <div class="endpoint">
        <h3><span class="method">GET</span> /health</h3>
        <p>System health check</p>
      </div>
      
      <h2>👥 Creators</h2>
      <div class="endpoint">
        <h3><span class="method">GET</span> /api/v1/creators</h3>
        <p>Get all creators</p>
      </div>
      <div class="endpoint">
        <h3><span class="method">GET</span> /api/v1/creators/:address</h3>
        <p>Get creator by wallet address</p>
      </div>
      <div class="endpoint">
        <h3><span class="method">POST</span> /api/v1/creators/register</h3>
        <p>Register new creator</p>
      </div>
      
      <h2>🎨 NFTs</h2>
      <div class="endpoint">
        <h3><span class="method">GET</span> /api/v1/nfts</h3>
        <p>Get NFTs with pagination and sorting</p>
      </div>
      <div class="endpoint">
        <h3><span class="method">GET</span> /api/v1/nfts/:tokenId</h3>
        <p>Get NFT details</p>
      </div>
      
      <h2>📄 Content</h2>
      <div class="endpoint">
        <h3><span class="method">GET</span> /api/v1/content</h3>
        <p>Get all content</p>
      </div>
      <div class="endpoint">
        <h3><span class="method">POST</span> /api/v1/content/upload</h3>
        <p>Upload new content</p>
      </div>
      
      <h2>📈 Analytics</h2>
      <div class="endpoint">
        <h3><span class="method">GET</span> /api/v1/analytics/summary</h3>
        <p>Get platform analytics summary</p>
      </div>
      
      <h2>🏪 Marketplace</h2>
      <div class="endpoint">
        <h3><span class="method">GET</span> /api/v1/marketplace/featured</h3>
        <p>Get featured NFTs</p>
      </div>
      
      <h2>🔒 Staking</h2>
      <div class="endpoint">
        <h3><span class="method">GET</span> /api/v1/staking/stats</h3>
        <p>Get staking statistics</p>
      </div>
      
      <h2>🗳️ Governance</h2>
      <div class="endpoint">
        <h3><span class="method">GET</span> /api/v1/governance/proposals</h3>
        <p>Get governance proposals</p>
      </div>
    </body>
    </html>
  `);
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`🚀 KnowTon Backend Service listening on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`📚 API docs: http://localhost:${PORT}/api-docs`);
  logger.info(`🔗 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5176'}`);
});

export default app;
