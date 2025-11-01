import { PrismaClient } from '@prisma/client'
import { emailService } from './email.service'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

interface PortfolioUploadInput {
  creatorId: string
  title: string
  description?: string
  fileUrl: string
  fileType: string
  fileSize: number
}

interface VerificationDecisionInput {
  creatorId: string
  status: 'approved' | 'rejected'
  note?: string
  adminUserId: string
}

export class CreatorQualificationService {
  /**
   * Upload portfolio item for creator verification
   */
  async uploadPortfolioItem(input: PortfolioUploadInput) {
    const { creatorId, title, description, fileUrl, fileType, fileSize } = input

    // Verify creator exists
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
    })

    if (!creator) {
      throw new Error('Creator not found')
    }

    // Create portfolio item
    const portfolioItem = await prisma.creatorPortfolio.create({
      data: {
        creatorId,
        title,
        description,
        fileUrl,
        fileType,
        fileSize,
      },
    })

    logger.info(`Portfolio item uploaded for creator ${creatorId}: ${portfolioItem.id}`)

    return portfolioItem
  }

  /**
   * Get creator's portfolio items
   */
  async getCreatorPortfolio(creatorId: string) {
    const portfolioItems = await prisma.creatorPortfolio.findMany({
      where: { creatorId },
      orderBy: { uploadedAt: 'desc' },
    })

    return portfolioItems
  }

  /**
   * Delete portfolio item
   */
  async deletePortfolioItem(portfolioItemId: string, creatorId: string) {
    // Verify ownership
    const portfolioItem = await prisma.creatorPortfolio.findUnique({
      where: { id: portfolioItemId },
    })

    if (!portfolioItem) {
      throw new Error('Portfolio item not found')
    }

    if (portfolioItem.creatorId !== creatorId) {
      throw new Error('Unauthorized to delete this portfolio item')
    }

    await prisma.creatorPortfolio.delete({
      where: { id: portfolioItemId },
    })

    logger.info(`Portfolio item deleted: ${portfolioItemId}`)

    return { success: true }
  }

  /**
   * Get verification queue (pending creators)
   */
  async getVerificationQueue(filters?: {
    status?: string
    creatorType?: string
    limit?: number
    offset?: number
  }) {
    const { status = 'pending', creatorType, limit = 50, offset = 0 } = filters || {}

    const where: any = {
      verificationStatus: status,
    }

    if (creatorType) {
      where.creatorType = creatorType
    }

    const [creators, total] = await Promise.all([
      prisma.creator.findMany({
        where,
        include: {
          portfolioItems: true,
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.creator.count({ where }),
    ])

    return {
      creators,
      total,
      limit,
      offset,
    }
  }

  /**
   * Get creator verification details
   */
  async getCreatorVerificationDetails(creatorId: string) {
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      include: {
        portfolioItems: true,
        contents: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!creator) {
      throw new Error('Creator not found')
    }

    return creator
  }

  /**
   * Admin: Approve or reject creator verification
   */
  async updateVerificationStatus(input: VerificationDecisionInput) {
    const { creatorId, status, note, adminUserId } = input

    // Get creator with user info for email
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
    })

    if (!creator) {
      throw new Error('Creator not found')
    }

    if (creator.verificationStatus !== 'pending') {
      throw new Error('Creator verification is not pending')
    }

    // Update creator verification status
    const updatedCreator = await prisma.creator.update({
      where: { id: creatorId },
      data: {
        verificationStatus: status,
        verificationNote: note,
        verifiedAt: status === 'approved' ? new Date() : null,
        verifiedBy: adminUserId,
        updatedAt: new Date(),
      },
    })

    // Get user email for notification
    const user = await prisma.user.findUnique({
      where: { walletAddress: creator.walletAddress },
    })

    // Send notification email
    if (user?.email) {
      try {
        if (status === 'approved') {
          await emailService.sendCreatorApprovalEmail(
            user.email,
            creator.displayName,
            creator.walletAddress
          )
        } else {
          await emailService.sendCreatorRejectionEmail(
            user.email,
            creator.displayName,
            note || 'Your application did not meet our requirements.'
          )
        }
      } catch (error) {
        logger.error('Failed to send verification status email:', error)
        // Don't fail the operation if email fails
      }
    }

    logger.info(
      `Creator ${creatorId} verification ${status} by admin ${adminUserId}`
    )

    return updatedCreator
  }

  /**
   * Submit creator for verification (after portfolio upload)
   */
  async submitForVerification(creatorId: string) {
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      include: {
        portfolioItems: true,
      },
    })

    if (!creator) {
      throw new Error('Creator not found')
    }

    if (creator.verificationStatus === 'approved') {
      throw new Error('Creator is already verified')
    }

    if (creator.portfolioItems.length === 0) {
      throw new Error('Please upload at least one portfolio item before submitting')
    }

    // Update status to pending if it was rejected before
    if (creator.verificationStatus === 'rejected') {
      await prisma.creator.update({
        where: { id: creatorId },
        data: {
          verificationStatus: 'pending',
          verificationNote: null,
          updatedAt: new Date(),
        },
      })
    }

    logger.info(`Creator ${creatorId} submitted for verification`)

    return { success: true, message: 'Submitted for verification' }
  }

  /**
   * Get verification statistics (for admin dashboard)
   */
  async getVerificationStats() {
    const [pending, approved, rejected, total] = await Promise.all([
      prisma.creator.count({ where: { verificationStatus: 'pending' } }),
      prisma.creator.count({ where: { verificationStatus: 'approved' } }),
      prisma.creator.count({ where: { verificationStatus: 'rejected' } }),
      prisma.creator.count(),
    ])

    return {
      pending,
      approved,
      rejected,
      total,
    }
  }
}

export const creatorQualificationService = new CreatorQualificationService()
