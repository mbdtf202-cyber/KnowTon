import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import apiCustomizationService from '../services/api-customization.service';

const prisma = new PrismaClient();

// In-memory rate limit store (use Redis in production)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Tenant-specific rate limiting middleware
 */
export const tenantRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenant) {
      return next();
    }

    const tenantId = req.tenant.id;
    const endpoint = req.path;
    const method = req.method;

    // Get rate limit for this tenant/endpoint
    const rateLimit = await apiCustomizationService.getTenantRateLimit(
      tenantId,
      endpoint
    );

    // Create rate limit key
    const key = `${tenantId}:${endpoint}:${method}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      // Create new window
      entry = {
        count: 0,
        resetAt: now + windowMs
      };
      rateLimitStore.set(key, entry);
    }

    // Increment counter
    entry.count++;

    // Check if limit exceeded
    if (entry.count > rateLimit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      
      res.set({
        'X-RateLimit-Limit': rateLimit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': entry.resetAt.toString(),
        'Retry-After': retryAfter.toString()
      });

      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
        limit: rateLimit,
        retryAfter
      });
    }

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': rateLimit.toString(),
      'X-RateLimit-Remaining': (rateLimit - entry.count).toString(),
      'X-RateLimit-Reset': entry.resetAt.toString()
    });

    next();
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    next(); // Don't block on rate limit errors
  }
};

/**
 * API key rate limiting middleware
 */
export const apiKeyRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return next();
    }

    const endpoint = req.path;
    const method = req.method;

    // Validate API key and get permissions
    const validation = await apiCustomizationService.validateApiKey(
      apiKey,
      endpoint,
      method
    );

    if (!validation.valid) {
      return res.status(403).json({
        error: 'Invalid API key',
        message: 'API key is invalid or does not have permission for this endpoint'
      });
    }

    // Get rate limit from API key permissions or tenant config
    const rateLimit = validation.rateLimit ?? 
                     await apiCustomizationService.getTenantRateLimit(validation.tenantId!);

    // Create rate limit key
    const key = `apikey:${apiKey}:${endpoint}:${method}`;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + windowMs
      };
      rateLimitStore.set(key, entry);
    }

    // Increment counter
    entry.count++;

    // Check if limit exceeded
    if (entry.count > rateLimit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      
      res.set({
        'X-RateLimit-Limit': rateLimit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': entry.resetAt.toString(),
        'Retry-After': retryAfter.toString()
      });

      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `API key rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        limit: rateLimit,
        retryAfter
      });
    }

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': rateLimit.toString(),
      'X-RateLimit-Remaining': (rateLimit - entry.count).toString(),
      'X-RateLimit-Reset': entry.resetAt.toString()
    });

    next();
  } catch (error) {
    console.error('API key rate limit middleware error:', error);
    next();
  }
};

/**
 * IP whitelist middleware
 */
export const checkIpWhitelist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenant) {
      return next();
    }

    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const allowed = await apiCustomizationService.isIpWhitelisted(
      req.tenant.id,
      ipAddress
    );

    if (!allowed) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not whitelisted for this tenant'
      });
    }

    next();
  } catch (error) {
    console.error('IP whitelist middleware error:', error);
    next();
  }
};

/**
 * Origin validation middleware
 */
export const checkOrigin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenant) {
      return next();
    }

    const origin = req.headers.origin || req.headers.referer || '';
    
    if (!origin) {
      return next(); // Allow requests without origin (e.g., server-to-server)
    }

    const allowed = await apiCustomizationService.isOriginAllowed(
      req.tenant.id,
      origin
    );

    if (!allowed) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Origin not allowed for this tenant'
      });
    }

    next();
  } catch (error) {
    console.error('Origin validation middleware error:', error);
    next();
  }
};

/**
 * Cleanup expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt + 60000) { // 1 minute after reset
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Run every minute

export default {
  tenantRateLimit,
  apiKeyRateLimit,
  checkIpWhitelist,
  checkOrigin
};
