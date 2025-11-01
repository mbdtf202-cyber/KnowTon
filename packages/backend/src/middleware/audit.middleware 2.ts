/**
 * Audit Middleware
 * Automatically captures and logs sensitive operations
 */

import { Request, Response, NextFunction } from 'express';
import { auditLogService, AuditEventType, AuditSeverity, AuditStatus } from '../services/audit-log.service';
import { logger } from '../utils/logger';

// Extend Express Request to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        walletAddress: string;
        role?: string;
      };
    }
  }
}

/**
 * Audit middleware configuration
 */
interface AuditConfig {
  eventType: AuditEventType;
  severity?: AuditSeverity;
  resourceType?: string;
  captureRequestBody?: boolean;
  captureResponseBody?: boolean;
}

/**
 * Create audit middleware for specific operations
 */
export function createAuditMiddleware(config: AuditConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Capture original response methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    
    let responseBody: any;
    let responseCaptured = false;
    
    // Override response methods to capture response
    if (config.captureResponseBody) {
      res.json = function (body: any) {
        if (!responseCaptured) {
          responseBody = body;
          responseCaptured = true;
        }
        return originalJson(body);
      };
      
      res.send = function (body: any) {
        if (!responseCaptured) {
          responseBody = body;
          responseCaptured = true;
        }
        return originalSend(body);
      };
    }
    
    // Wait for response to complete
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const status = res.statusCode >= 200 && res.statusCode < 300 
          ? AuditStatus.SUCCESS 
          : AuditStatus.FAILURE;
        
        // Extract resource information from request
        const resourceId = req.params.id || req.params.tokenId || req.body.id;
        
        // Build metadata
        const metadata: Record<string, any> = {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
        };
        
        if (config.captureRequestBody && req.body) {
          metadata.requestBody = sanitizeData(req.body);
        }
        
        if (config.captureResponseBody && responseBody) {
          metadata.responseBody = sanitizeData(responseBody);
        }
        
        // Extract transaction hash if present
        const transactionHash = responseBody?.transactionHash || responseBody?.txHash;
        
        // Log audit event
        await auditLogService.logEvent({
          eventType: config.eventType,
          severity: config.severity || AuditSeverity.INFO,
          status,
          userId: req.user?.id,
          walletAddress: req.user?.walletAddress,
          ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
          resourceType: config.resourceType,
          resourceId,
          action: `${req.method} ${req.path}`,
          description: generateDescription(config.eventType, req, status),
          metadata,
          requestId: req.requestId,
          transactionHash,
          resultCode: res.statusCode.toString(),
          resultMessage: status === AuditStatus.SUCCESS ? 'Operation completed successfully' : 'Operation failed',
        });
      } catch (error) {
        logger.error('Failed to log audit event', { error, path: req.path });
      }
    });
    
    next();
  };
}

/**
 * Generate human-readable description for audit event
 */
function generateDescription(eventType: AuditEventType, req: Request, status: AuditStatus): string {
  const user = req.user?.walletAddress || req.ip || 'Unknown user';
  const statusText = status === AuditStatus.SUCCESS ? 'successfully' : 'unsuccessfully';
  
  switch (eventType) {
    case AuditEventType.AUTH_LOGIN:
      return `User ${user} ${statusText} logged in`;
    case AuditEventType.AUTH_LOGOUT:
      return `User ${user} logged out`;
    case AuditEventType.NFT_MINT:
      return `User ${user} ${statusText} minted NFT`;
    case AuditEventType.NFT_TRANSFER:
      return `User ${user} ${statusText} transferred NFT`;
    case AuditEventType.TRADE_ORDER_CREATE:
      return `User ${user} ${statusText} created trade order`;
    case AuditEventType.TRADE_EXECUTE:
      return `User ${user} ${statusText} executed trade`;
    case AuditEventType.ROYALTY_DISTRIBUTE:
      return `System ${statusText} distributed royalties`;
    case AuditEventType.ROYALTY_CLAIM:
      return `User ${user} ${statusText} claimed royalties`;
    case AuditEventType.STAKE_DEPOSIT:
      return `User ${user} ${statusText} deposited stake`;
    case AuditEventType.STAKE_WITHDRAW:
      return `User ${user} ${statusText} withdrew stake`;
    case AuditEventType.PROPOSAL_CREATE:
      return `User ${user} ${statusText} created governance proposal`;
    case AuditEventType.PROPOSAL_VOTE:
      return `User ${user} ${statusText} voted on proposal`;
    case AuditEventType.CONTENT_UPLOAD:
      return `User ${user} ${statusText} uploaded content`;
    case AuditEventType.ADMIN_USER_BAN:
      return `Admin ${user} ${statusText} banned user`;
    case AuditEventType.ADMIN_CONFIG_CHANGE:
      return `Admin ${user} ${statusText} changed configuration`;
    default:
      return `User ${user} performed ${eventType} ${statusText}`;
  }
}

/**
 * Sanitize sensitive data from request/response
 */
function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveFields = [
    'password',
    'privateKey',
    'secret',
    'token',
    'apiKey',
    'signature',
    'mnemonic',
    'seed',
  ];
  
  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  
  return sanitized;
}

/**
 * Pre-configured audit middleware for common operations
 */

// Authentication operations
export const auditLogin = createAuditMiddleware({
  eventType: AuditEventType.AUTH_LOGIN,
  severity: AuditSeverity.INFO,
  captureRequestBody: false,
});

export const auditLogout = createAuditMiddleware({
  eventType: AuditEventType.AUTH_LOGOUT,
  severity: AuditSeverity.INFO,
});

// NFT operations
export const auditNFTMint = createAuditMiddleware({
  eventType: AuditEventType.NFT_MINT,
  severity: AuditSeverity.INFO,
  resourceType: 'nft',
  captureRequestBody: true,
  captureResponseBody: true,
});

export const auditNFTTransfer = createAuditMiddleware({
  eventType: AuditEventType.NFT_TRANSFER,
  severity: AuditSeverity.INFO,
  resourceType: 'nft',
  captureRequestBody: true,
});

export const auditNFTBurn = createAuditMiddleware({
  eventType: AuditEventType.NFT_BURN,
  severity: AuditSeverity.WARNING,
  resourceType: 'nft',
  captureRequestBody: true,
});

// Trading operations
export const auditTradeOrderCreate = createAuditMiddleware({
  eventType: AuditEventType.TRADE_ORDER_CREATE,
  severity: AuditSeverity.INFO,
  resourceType: 'trade_order',
  captureRequestBody: true,
});

export const auditTradeExecute = createAuditMiddleware({
  eventType: AuditEventType.TRADE_EXECUTE,
  severity: AuditSeverity.INFO,
  resourceType: 'trade',
  captureRequestBody: true,
  captureResponseBody: true,
});

// Financial operations
export const auditRoyaltyDistribute = createAuditMiddleware({
  eventType: AuditEventType.ROYALTY_DISTRIBUTE,
  severity: AuditSeverity.INFO,
  resourceType: 'royalty',
  captureResponseBody: true,
});

export const auditRoyaltyClaim = createAuditMiddleware({
  eventType: AuditEventType.ROYALTY_CLAIM,
  severity: AuditSeverity.INFO,
  resourceType: 'royalty',
  captureRequestBody: true,
});

export const auditStakeDeposit = createAuditMiddleware({
  eventType: AuditEventType.STAKE_DEPOSIT,
  severity: AuditSeverity.INFO,
  resourceType: 'stake',
  captureRequestBody: true,
});

export const auditStakeWithdraw = createAuditMiddleware({
  eventType: AuditEventType.STAKE_WITHDRAW,
  severity: AuditSeverity.INFO,
  resourceType: 'stake',
  captureRequestBody: true,
});

export const auditLendingBorrow = createAuditMiddleware({
  eventType: AuditEventType.LENDING_BORROW,
  severity: AuditSeverity.INFO,
  resourceType: 'loan',
  captureRequestBody: true,
  captureResponseBody: true,
});

export const auditLendingRepay = createAuditMiddleware({
  eventType: AuditEventType.LENDING_REPAY,
  severity: AuditSeverity.INFO,
  resourceType: 'loan',
  captureRequestBody: true,
});

export const auditBondIssue = createAuditMiddleware({
  eventType: AuditEventType.BOND_ISSUE,
  severity: AuditSeverity.INFO,
  resourceType: 'bond',
  captureRequestBody: true,
  captureResponseBody: true,
});

export const auditBondRedeem = createAuditMiddleware({
  eventType: AuditEventType.BOND_REDEEM,
  severity: AuditSeverity.INFO,
  resourceType: 'bond',
  captureRequestBody: true,
});

// Governance operations
export const auditProposalCreate = createAuditMiddleware({
  eventType: AuditEventType.PROPOSAL_CREATE,
  severity: AuditSeverity.INFO,
  resourceType: 'proposal',
  captureRequestBody: true,
});

export const auditProposalVote = createAuditMiddleware({
  eventType: AuditEventType.PROPOSAL_VOTE,
  severity: AuditSeverity.INFO,
  resourceType: 'proposal',
  captureRequestBody: true,
});

export const auditProposalExecute = createAuditMiddleware({
  eventType: AuditEventType.PROPOSAL_EXECUTE,
  severity: AuditSeverity.WARNING,
  resourceType: 'proposal',
  captureResponseBody: true,
});

// Content operations
export const auditContentUpload = createAuditMiddleware({
  eventType: AuditEventType.CONTENT_UPLOAD,
  severity: AuditSeverity.INFO,
  resourceType: 'content',
  captureRequestBody: true,
});

export const auditContentDelete = createAuditMiddleware({
  eventType: AuditEventType.CONTENT_DELETE,
  severity: AuditSeverity.WARNING,
  resourceType: 'content',
});

// Admin operations
export const auditAdminUserBan = createAuditMiddleware({
  eventType: AuditEventType.ADMIN_USER_BAN,
  severity: AuditSeverity.WARNING,
  resourceType: 'user',
  captureRequestBody: true,
});

export const auditAdminConfigChange = createAuditMiddleware({
  eventType: AuditEventType.ADMIN_CONFIG_CHANGE,
  severity: AuditSeverity.WARNING,
  resourceType: 'config',
  captureRequestBody: true,
});

export const auditAdminContractUpgrade = createAuditMiddleware({
  eventType: AuditEventType.ADMIN_CONTRACT_UPGRADE,
  severity: AuditSeverity.CRITICAL,
  resourceType: 'contract',
  captureRequestBody: true,
  captureResponseBody: true,
});

/**
 * Security event logging middleware
 */
export const auditSecurityEvent = (eventType: AuditEventType, severity: AuditSeverity = AuditSeverity.WARNING) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await auditLogService.logEvent({
        eventType,
        severity,
        status: AuditStatus.SUCCESS,
        userId: req.user?.id,
        walletAddress: req.user?.walletAddress,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        action: `${req.method} ${req.path}`,
        description: `Security event: ${eventType}`,
        metadata: {
          method: req.method,
          path: req.path,
          query: req.query,
        },
        requestId: req.requestId,
      });
    } catch (error) {
      logger.error('Failed to log security event', { error, eventType });
    }
    
    next();
  };
};

/**
 * Audit all sensitive endpoints middleware
 * Automatically detects and logs sensitive operations
 */
export const autoAuditMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Define sensitive endpoint patterns
  const sensitivePatterns = [
    { pattern: /\/auth\/login/, eventType: AuditEventType.AUTH_LOGIN },
    { pattern: /\/auth\/logout/, eventType: AuditEventType.AUTH_LOGOUT },
    { pattern: /\/nft\/mint/, eventType: AuditEventType.NFT_MINT },
    { pattern: /\/nft\/.*\/transfer/, eventType: AuditEventType.NFT_TRANSFER },
    { pattern: /\/trade\/order/, eventType: AuditEventType.TRADE_ORDER_CREATE },
    { pattern: /\/trade\/execute/, eventType: AuditEventType.TRADE_EXECUTE },
    { pattern: /\/royalty\/claim/, eventType: AuditEventType.ROYALTY_CLAIM },
    { pattern: /\/staking\/deposit/, eventType: AuditEventType.STAKE_DEPOSIT },
    { pattern: /\/staking\/withdraw/, eventType: AuditEventType.STAKE_WITHDRAW },
    { pattern: /\/governance\/proposal/, eventType: AuditEventType.PROPOSAL_CREATE },
    { pattern: /\/governance\/vote/, eventType: AuditEventType.PROPOSAL_VOTE },
    { pattern: /\/content\/upload/, eventType: AuditEventType.CONTENT_UPLOAD },
    { pattern: /\/admin\//, eventType: AuditEventType.ADMIN_CONFIG_CHANGE },
  ];
  
  // Check if current path matches any sensitive pattern
  const match = sensitivePatterns.find(({ pattern }) => pattern.test(req.path));
  
  if (match) {
    // Apply audit middleware dynamically
    const auditMiddleware = createAuditMiddleware({
      eventType: match.eventType,
      severity: match.eventType.startsWith('admin.') ? AuditSeverity.WARNING : AuditSeverity.INFO,
      captureRequestBody: true,
    });
    
    return auditMiddleware(req, res, next);
  }
  
  next();
};

export default {
  createAuditMiddleware,
  auditLogin,
  auditLogout,
  auditNFTMint,
  auditNFTTransfer,
  auditNFTBurn,
  auditTradeOrderCreate,
  auditTradeExecute,
  auditRoyaltyDistribute,
  auditRoyaltyClaim,
  auditStakeDeposit,
  auditStakeWithdraw,
  auditLendingBorrow,
  auditLendingRepay,
  auditBondIssue,
  auditBondRedeem,
  auditProposalCreate,
  auditProposalVote,
  auditProposalExecute,
  auditContentUpload,
  auditContentDelete,
  auditAdminUserBan,
  auditAdminConfigChange,
  auditAdminContractUpgrade,
  auditSecurityEvent,
  autoAuditMiddleware,
};
