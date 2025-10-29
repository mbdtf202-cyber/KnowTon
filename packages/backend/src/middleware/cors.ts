import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import { logger } from '../utils/logger';

/**
 * CORS Middleware
 * Configures Cross-Origin Resource Sharing for the API
 */

// Allowed origins based on environment
const getAllowedOrigins = (): string[] => {
  const origins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  
  // Default allowed origins for development
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];

  // In production, only use explicitly configured origins
  if (process.env.NODE_ENV === 'production') {
    return origins.length > 0 ? origins : [];
  }

  // In development, merge configured and default origins
  return [...new Set([...origins, ...defaultOrigins])];
};

// CORS configuration
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    'X-API-Key',
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours - how long the results of a preflight request can be cached
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Export configured CORS middleware
export const corsMiddleware = cors(corsOptions);

// Custom CORS error handler
export const corsErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err.message === 'Not allowed by CORS') {
    logger.warn('CORS error', {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
    });
    return res.status(403).json({
      error: 'CORS policy violation',
      message: 'Origin not allowed',
    });
  }
  next(err);
};
