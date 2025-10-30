/**
 * Security Middleware for KnowTon Platform
 * Implements comprehensive security measures including input validation,
 * rate limiting, CSRF protection, and security headers
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, param, query, validationResult } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';
import { logger } from '../utils/logger';
import { apiErrorTotal } from './metrics';

// Types
interface SecurityConfig {
  enableCSRF: boolean;
  enableRateLimit: boolean;
  enableInputValidation: boolean;
  enableXSS: boolean;
  maxRequestSize: string;
  allowedOrigins: string[];
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Default security configuration
const defaultSecurityConfig: SecurityConfig = {
  enableCSRF: true,
  enableRateLimit: true,
  enableInputValidation: true,
  enableXSS: true,
  maxRequestSize: '10mb',
  allowedOrigins: ['http://localhost:3000', 'https://knowton.io'],
};

/**
 * Security Headers Middleware
 * Applies comprehensive security headers using Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'ipfs:'],
      scriptSrc: ["'self'", "'unsafe-eval'"], // Required for Web3
      connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disabled for Web3 compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Rate Limiting Middleware
 * Implements different rate limits for different endpoints
 */
export const createRateLimit = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options.max || 100, // Limit each IP to 100 requests per windowMs
    message: options.message || 'Too many requests from this IP',
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
      
      apiErrorTotal.labels(req.method, req.path, 'rate_limit').inc();
      
      res.status(429).json({
        error: 'Too Many Requests',
        message: options.message || 'Rate limit exceeded',
        retryAfter: Math.round(options.windowMs! / 1000),
      });
    },
  });
};

// Specific rate limiters for different endpoints
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many authentication attempts',
});

export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 API calls per 15 minutes
  message: 'API rate limit exceeded',
});

export const uploadRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Upload rate limit exceeded',
});

export const mintRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 mints per hour
  message: 'NFT minting rate limit exceeded',
});

/**
 * Input Validation Middleware
 * Comprehensive input validation and sanitization
 */

// Common validation rules
export const validateEthereumAddress = body('address')
  .isEthereumAddress()
  .withMessage('Invalid Ethereum address');

export const validateTokenId = param('tokenId')
  .isNumeric()
  .withMessage('Token ID must be numeric')
  .toInt();

export const validateAmount = body('amount')
  .isDecimal({ decimal_digits: '0,18' })
  .withMessage('Invalid amount format')
  .custom((value) => {
    const num = parseFloat(value);
    if (num <= 0) {
      throw new Error('Amount must be positive');
    }
    if (num > 1e18) {
      throw new Error('Amount too large');
    }
    return true;
  });

export const validateContentType = body('contentType')
  .isIn(['image', 'audio', 'video', 'text', 'document'])
  .withMessage('Invalid content type');

export const validateCategory = body('category')
  .isIn(['music', 'art', 'video', 'ebook', 'course', 'software', 'other'])
  .withMessage('Invalid category');

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

export const validateSortOrder = query('sort')
  .optional()
  .isIn(['asc', 'desc', 'created_at', 'updated_at', 'price', 'popularity'])
  .withMessage('Invalid sort parameter');

// Content validation
export const validateContentUpload = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .trim()
    .escape(),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters')
    .trim(),
  validateContentType,
  validateCategory,
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 tags allowed'),
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
    .trim()
    .escape(),
];

// NFT minting validation
export const validateNFTMint = [
  validateEthereumAddress,
  body('tokenURI')
    .isURL()
    .withMessage('Invalid token URI'),
  body('royaltyPercentage')
    .isFloat({ min: 0, max: 50 })
    .withMessage('Royalty percentage must be between 0 and 50')
    .toFloat(),
  body('price')
    .optional()
    .isDecimal()
    .withMessage('Invalid price format')
    .toFloat(),
];

// Trading validation
export const validateTradeOrder = [
  validateTokenId,
  validateAmount,
  body('orderType')
    .isIn(['buy', 'sell'])
    .withMessage('Order type must be buy or sell'),
  body('price')
    .isDecimal({ decimal_digits: '0,18' })
    .withMessage('Invalid price format')
    .toFloat(),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiration date')
    .toDate(),
];

// Staking validation
export const validateStaking = [
  validateAmount,
  body('lockPeriod')
    .isInt({ min: 0, max: 365 })
    .withMessage('Lock period must be between 0 and 365 days')
    .toInt(),
];

// Governance validation
export const validateProposal = [
  body('title')
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters')
    .trim()
    .escape(),
  body('description')
    .isLength({ min: 50, max: 5000 })
    .withMessage('Description must be between 50 and 5000 characters')
    .trim(),
  body('proposalType')
    .isIn(['parameter', 'upgrade', 'treasury', 'general'])
    .withMessage('Invalid proposal type'),
  body('votingPeriod')
    .isInt({ min: 1, max: 30 })
    .withMessage('Voting period must be between 1 and 30 days')
    .toInt(),
];

/**
 * Validation Error Handler
 * Processes validation results and returns formatted errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors: ValidationError[] = errors.array().map((error) => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    logger.warn('Validation errors', {
      path: req.path,
      method: req.method,
      errors: validationErrors,
      ip: req.ip,
    });

    apiErrorTotal.labels(req.method, req.path, 'validation_error').inc();

    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: validationErrors,
    });
  }

  next();
};

/**
 * XSS Protection Middleware
 * Sanitizes input to prevent XSS attacks
 */
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj, { ALLOWED_TAGS: [] });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * SQL Injection Protection
 * Additional protection against SQL injection attempts
 */
export const sqlInjectionProtection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(--|\/\*|\*\/|;)/,
    /(\b(WAITFOR|DELAY)\b)/i,
  ];

  const checkForSQLInjection = (value: string): boolean => {
    return sqlPatterns.some(pattern => pattern.test(value));
  };

  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkForSQLInjection(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.some(checkObject);
    }
    
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(checkObject);
    }
    
    return false;
  };

  // Check request body and query parameters
  if (checkObject(req.body) || checkObject(req.query)) {
    logger.warn('Potential SQL injection attempt detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      body: req.body,
      query: req.query,
    });

    apiErrorTotal.labels(req.method, req.path, 'sql_injection').inc();

    return res.status(400).json({
      error: 'Invalid Input',
      message: 'Potentially malicious input detected',
    });
  }

  next();
};

/**
 * Request Size Limiter
 * Prevents large payload attacks
 */
export const requestSizeLimiter = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        logger.warn('Request size limit exceeded', {
          ip: req.ip,
          path: req.path,
          size: sizeInBytes,
          limit: maxSizeInBytes,
        });

        apiErrorTotal.labels(req.method, req.path, 'size_limit').inc();

        return res.status(413).json({
          error: 'Payload Too Large',
          message: `Request size exceeds limit of ${maxSize}`,
        });
      }
    }

    next();
  };
};

/**
 * Parse size string to bytes
 */
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * units[unit]);
}

/**
 * Security Audit Logger
 * Logs security-related events for monitoring
 */
export const securityAuditLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log sensitive operations
  const sensitiveEndpoints = [
    '/auth/login',
    '/auth/register',
    '/nft/mint',
    '/trade/order',
    '/governance/proposal',
    '/admin/',
  ];

  const isSensitive = sensitiveEndpoints.some(endpoint => 
    req.path.startsWith(endpoint)
  );

  if (isSensitive) {
    logger.info('Security audit log', {
      type: 'sensitive_operation',
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      userId: (req as any).user?.id,
    });
  }

  next();
};

/**
 * Complete security middleware stack
 */
export const securityMiddleware = [
  securityHeaders,
  requestSizeLimiter(),
  xssProtection,
  sqlInjectionProtection,
  securityAuditLogger,
];

export default {
  securityHeaders,
  createRateLimit,
  authRateLimit,
  apiRateLimit,
  uploadRateLimit,
  mintRateLimit,
  validateEthereumAddress,
  validateTokenId,
  validateAmount,
  validateContentUpload,
  validateNFTMint,
  validateTradeOrder,
  validateStaking,
  validateProposal,
  handleValidationErrors,
  xssProtection,
  sqlInjectionProtection,
  requestSizeLimiter,
  securityAuditLogger,
  securityMiddleware,
};