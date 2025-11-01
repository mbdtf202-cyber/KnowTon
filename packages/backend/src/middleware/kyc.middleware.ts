import { Request, Response, NextFunction } from 'express'
import { kycService, KYCLevel } from '../services/kyc.service'
import { logger } from '../utils/logger'

/**
 * Middleware to require KYC verification
 * Usage: router.post('/endpoint', requireKYC(1), handler)
 */
export const requireKYC = (requiredLevel: KYCLevel = 1) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id

      if (!userId) {
        res.status(401).json({ error: 'Not authenticated' })
        return
      }

      const meetsRequirement = await kycService.checkKYCRequirement(userId, requiredLevel)

      if (!meetsRequirement) {
        const status = await kycService.getUserKYCStatus(userId)

        res.status(403).json({
          error: 'KYC verification required',
          required: {
            level: requiredLevel,
            message: `This action requires KYC level ${requiredLevel} verification`,
          },
          current: {
            status: status.status,
            level: status.level,
          },
        })
        return
      }

      next()
    } catch (error: any) {
      logger.error('KYC middleware error:', error)
      res.status(500).json({ error: 'Failed to verify KYC status' })
    }
  }
}

/**
 * Middleware to check if user has any KYC verification
 */
export const requireAnyKYC = requireKYC(1)

/**
 * Middleware to require advanced KYC verification
 */
export const requireAdvancedKYC = requireKYC(2)
