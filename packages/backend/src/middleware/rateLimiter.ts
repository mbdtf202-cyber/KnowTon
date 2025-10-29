import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Rate Limiter Middleware
 * Implements rate limiting to prevent abuse and DDoS attacks
 */

// General API rate limiter - 100 requests per 15 minutes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

// Strict rate limiter for authentication endpoints - 5 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes',
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes',
    });
  },
});

// Upload rate limiter - 10 uploads per hour
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: {
    error: 'Too many upload requests, please try again later.',
    retryAfter: '1 hour',
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many upload requests, please try again later.',
      retryAfter: '1 hour',
    });
  },
});

// Minting rate limiter - 20 mints per hour
export const mintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 mints per hour
  message: {
    error: 'Too many minting requests, please try again later.',
    retryAfter: '1 hour',
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Mint rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many minting requests, please try again later.',
      retryAfter: '1 hour',
    });
  },
});

// Trading rate limiter - 200 requests per minute
export const tradingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // Limit each IP to 200 requests per minute
  message: {
    error: 'Too many trading requests, please slow down.',
    retryAfter: '1 minute',
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Trading rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many trading requests, please slow down.',
      retryAfter: '1 minute',
    });
  },
});
