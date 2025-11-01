import { Router, Request, Response } from 'express'
import { creatorQualificationService } from '../services/creator-qualification.service'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'

const router = Router()

/**
 * POST /api/creator-qualification/portfolio
 * Upload portfolio item for creator verification
 * Requires authentication
 */
router.post('/portfolio', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { creatorId, title, description, fileUrl, fileType, fileSize } = req.body

    if (!creatorId || !title || !fileUrl || !fileType || !fileSize) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    const portfolioItem = await creatorQualificationService.uploadPortfolioItem({
      creatorId,
      title,
      description,
      fileUrl,
      fileType,
      fileSize,
    })

    res.status(201).json({
      success: true,
      portfolioItem,
    })
  } catch (error: any) {
    console.error('Portfolio upload error:', error)
    res.status(400).json({ error: error.message || 'Failed to upload portfolio item' })
  }
})

/**
 * GET /api/creator-qualification/portfolio/:creatorId
 * Get creator's portfolio items
 * Requires authentication
 */
router.get('/portfolio/:creatorId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { creatorId } = req.params

    const portfolioItems = await creatorQualificationService.getCreatorPortfolio(creatorId)

    res.json({
      success: true,
      portfolioItems,
    })
  } catch (error: any) {
    console.error('Get portfolio error:', error)
    res.status(400).json({ error: error.message || 'Failed to get portfolio' })
  }
})

/**
 * DELETE /api/creator-qualification/portfolio/:portfolioItemId
 * Delete portfolio item
 * Requires authentication
 */
router.delete('/portfolio/:portfolioItemId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { portfolioItemId } = req.params
    const { creatorId } = req.body

    if (!creatorId) {
      res.status(400).json({ error: 'Creator ID is required' })
      return
    }

    const result = await creatorQualificationService.deletePortfolioItem(portfolioItemId, creatorId)

    res.json(result)
  } catch (error: any) {
    console.error('Delete portfolio item error:', error)
    res.status(400).json({ error: error.message || 'Failed to delete portfolio item' })
  }
})

/**
 * POST /api/creator-qualification/submit/:creatorId
 * Submit creator for verification
 * Requires authentication
 */
router.post('/submit/:creatorId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { creatorId } = req.params

    const result = await creatorQualificationService.submitForVerification(creatorId)

    res.json(result)
  } catch (error: any) {
    console.error('Submit for verification error:', error)
    res.status(400).json({ error: error.message || 'Failed to submit for verification' })
  }
})

/**
 * GET /api/creator-qualification/queue
 * Get verification queue (admin only)
 * Requires admin authentication
 */
router.get('/queue', authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, creatorType, limit, offset } = req.query

    const result = await creatorQualificationService.getVerificationQueue({
      status: status as string,
      creatorType: creatorType as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    })

    res.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('Get verification queue error:', error)
    res.status(400).json({ error: error.message || 'Failed to get verification queue' })
  }
})

/**
 * GET /api/creator-qualification/details/:creatorId
 * Get creator verification details (admin only)
 * Requires admin authentication
 */
router.get('/details/:creatorId', authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { creatorId } = req.params

    const creator = await creatorQualificationService.getCreatorVerificationDetails(creatorId)

    res.json({
      success: true,
      creator,
    })
  } catch (error: any) {
    console.error('Get creator details error:', error)
    res.status(400).json({ error: error.message || 'Failed to get creator details' })
  }
})

/**
 * POST /api/creator-qualification/verify
 * Approve or reject creator verification (admin only)
 * Requires admin authentication
 */
router.post('/verify', authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { creatorId, status, note } = req.body
    const adminUserId = (req as any).user?.userId || (req as any).user?.address

    if (!creatorId || !status) {
      res.status(400).json({ error: 'Creator ID and status are required' })
      return
    }

    if (status !== 'approved' && status !== 'rejected') {
      res.status(400).json({ error: 'Status must be either "approved" or "rejected"' })
      return
    }

    const creator = await creatorQualificationService.updateVerificationStatus({
      creatorId,
      status,
      note,
      adminUserId,
    })

    res.json({
      success: true,
      creator,
    })
  } catch (error: any) {
    console.error('Verification decision error:', error)
    res.status(400).json({ error: error.message || 'Failed to update verification status' })
  }
})

/**
 * GET /api/creator-qualification/stats
 * Get verification statistics (admin only)
 * Requires admin authentication
 */
router.get('/stats', authMiddleware, adminMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await creatorQualificationService.getVerificationStats()

    res.json({
      success: true,
      stats,
    })
  } catch (error: any) {
    console.error('Get verification stats error:', error)
    res.status(400).json({ error: error.message || 'Failed to get verification stats' })
  }
})

export default router
