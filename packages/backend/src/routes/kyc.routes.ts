import { Router, Request, Response } from 'express'
import { kycService, KYCLevel } from '../services/kyc.service'
import { authService } from '../services/auth.service'
import { logger } from '../utils/logger'

const router = Router()

/**
 * Middleware to verify authentication
 */
const requireAuth = async (req: Request, res: Response, next: Function) => {
  try {
    const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    const decoded = authService.verifyToken(token)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

/**
 * Middleware to verify admin role
 */
const requireAdmin = (req: Request, res: Response, next: Function) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' })
    return
  }
  next()
}

/**
 * POST /api/v1/kyc/initiate
 * Initiate KYC verification process
 */
router.post('/initiate', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { level = 1, locale = 'en' } = req.body
    const userId = req.user.userId || req.user.id

    if (!userId) {
      res.status(400).json({ error: 'User ID not found' })
      return
    }

    // Validate KYC level
    if (![1, 2].includes(level)) {
      res.status(400).json({ error: 'Invalid KYC level. Must be 1 (basic) or 2 (advanced)' })
      return
    }

    const result = await kycService.initiateKYC(userId, level as KYCLevel, locale)

    res.json({
      success: true,
      transactionId: result.transactionId,
      redirectUrl: result.redirectUrl,
      message: 'KYC verification initiated. Please complete the verification process.',
    })
  } catch (error: any) {
    logger.error('KYC initiation error:', error)
    res.status(400).json({ error: error.message || 'Failed to initiate KYC' })
  }
})

/**
 * POST /api/v1/kyc/callback
 * Webhook endpoint for Jumio callbacks
 */
router.post('/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-jumio-signature'] as string
    const payload = JSON.stringify(req.body)

    // Verify webhook signature for security
    if (signature && !kycService.verifyWebhookSignature(payload, signature)) {
      logger.warn('Invalid webhook signature', { signature })
      res.status(401).json({ error: 'Invalid signature' })
      return
    }

    await kycService.handleCallback(req.body)

    res.json({ success: true })
  } catch (error: any) {
    logger.error('KYC callback error:', error)
    res.status(500).json({ error: 'Failed to process callback' })
  }
})

/**
 * GET /api/v1/kyc/status
 * Get current user's KYC status
 */
router.get('/status', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId || req.user.id

    if (!userId) {
      res.status(400).json({ error: 'User ID not found' })
      return
    }

    const status = await kycService.getUserKYCStatus(userId)

    res.json({
      success: true,
      kyc: status,
    })
  } catch (error: any) {
    logger.error('Get KYC status error:', error)
    res.status(500).json({ error: error.message || 'Failed to get KYC status' })
  }
})

/**
 * GET /api/v1/kyc/details/:transactionId
 * Get verification details for a transaction
 */
router.get(
  '/details/:transactionId',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { transactionId } = req.params

      const details = await kycService.getVerificationDetails(transactionId)

      if (!details) {
        res.status(404).json({ error: 'Verification details not found' })
        return
      }

      res.json({
        success: true,
        details,
      })
    } catch (error: any) {
      logger.error('Get verification details error:', error)
      res.status(500).json({ error: 'Failed to get verification details' })
    }
  }
)

/**
 * POST /api/v1/kyc/check-requirement
 * Check if user meets KYC requirement
 */
router.post(
  '/check-requirement',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { requiredLevel = 1 } = req.body
      const userId = req.user.userId || req.user.id

      if (!userId) {
        res.status(400).json({ error: 'User ID not found' })
        return
      }

      const meetsRequirement = await kycService.checkKYCRequirement(
        userId,
        requiredLevel as KYCLevel
      )

      res.json({
        success: true,
        meetsRequirement,
        requiredLevel,
      })
    } catch (error: any) {
      logger.error('Check KYC requirement error:', error)
      res.status(500).json({ error: 'Failed to check KYC requirement' })
    }
  }
)

/**
 * PUT /api/v1/kyc/update-level
 * Update user KYC level (admin only)
 */
router.put(
  '/update-level',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, level, status } = req.body
      const adminId = req.user.userId || req.user.id

      if (!userId || level === undefined || !status) {
        res.status(400).json({ error: 'Missing required fields: userId, level, status' })
        return
      }

      if (![0, 1, 2].includes(level)) {
        res.status(400).json({ error: 'Invalid KYC level. Must be 0, 1, or 2' })
        return
      }

      if (!['none', 'pending', 'approved', 'rejected'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' })
        return
      }

      await kycService.updateKYCLevel(userId, level as KYCLevel, status, adminId)

      res.json({
        success: true,
        message: 'KYC level updated successfully',
      })
    } catch (error: any) {
      logger.error('Update KYC level error:', error)
      res.status(500).json({ error: error.message || 'Failed to update KYC level' })
    }
  }
)

/**
 * GET /api/v1/kyc/statistics
 * Get KYC statistics (admin only)
 */
router.get(
  '/statistics',
  requireAuth,
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const statistics = await kycService.getKYCStatistics()

      res.json({
        success: true,
        statistics,
      })
    } catch (error: any) {
      logger.error('Get KYC statistics error:', error)
      res.status(500).json({ error: 'Failed to get KYC statistics' })
    }
  }
)

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

export default router
