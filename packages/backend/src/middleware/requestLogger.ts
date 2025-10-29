import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

/**
 * Request Logger Middleware
 * Logs all incoming requests with detailed information and assigns unique request IDs
 */

// Extend Express Request to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Request ID middleware - assigns unique ID to each request
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Generate or use existing request ID
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.requestId = requestId;
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

/**
 * Request logger middleware - logs request details
 */
export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Record start time
  req.startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
  });

  // Log request body for non-GET requests (excluding sensitive data)
  if (req.method !== 'GET' && req.body) {
    const sanitizedBody = sanitizeBody(req.body);
    logger.debug('Request body', {
      requestId: req.requestId,
      body: sanitizedBody,
    });
  }

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any): Response {
    res.send = originalSend;
    
    // Calculate response time
    const responseTime = req.startTime ? Date.now() - req.startTime : 0;

    // Log response
    logger.info('Outgoing response', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
    });

    // Log slow requests (> 1 second)
    if (responseTime > 1000) {
      logger.warn('Slow request detected', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        responseTime: `${responseTime}ms`,
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'privateKey',
    'signature',
    'authorization',
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeBody(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Performance monitoring middleware
 */
export const performanceMonitoringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = process.hrtime();

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

    // Log performance metrics
    logger.debug('Request performance', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      contentLength: res.get('content-length'),
    });

    // Add performance header
    res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
  });

  next();
};
