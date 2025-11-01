import { PrismaClient } from '@prisma/client'
import { creatorQualificationService } from '../../services/creator-qualification.service'

const prisma = new PrismaClient()

describe('CreatorQualificationService', () => {
  let testCreatorId: string
  let testPortfolioItemId: string

  beforeAll(async () => {
    // Create a test creator
    const creator = await prisma.creator.create({
      data: {
        walletAddress: '0xtest123',
        did: 'did:test:123',
        displayName: 'Test Creator',
        verificationStatus: 'pending',
      },
    })
    testCreatorId = creator.id
  })

  afterAll(async () => {
    // Clean up test data
    if (testPortfolioItemId) {
      await prisma.creatorPortfolio.deleteMany({
        where: { id: testPortfolioItemId },
      })
    }
    await prisma.creator.deleteMany({
      where: { id: testCreatorId },
    })
    await prisma.$disconnect()
  })

  describe('uploadPortfolioItem', () => {
    it('should upload a portfolio item successfully', async () => {
      const portfolioItem = await creatorQualificationService.uploadPortfolioItem({
        creatorId: testCreatorId,
        title: 'Test Portfolio Item',
        description: 'Test description',
        fileUrl: 'https://example.com/file.pdf',
        fileType: 'pdf',
        fileSize: 1024000,
      })

      expect(portfolioItem).toBeDefined()
      expect(portfolioItem.title).toBe('Test Portfolio Item')
      expect(portfolioItem.creatorId).toBe(testCreatorId)
      testPortfolioItemId = portfolioItem.id
    })

    it('should throw error for non-existent creator', async () => {
      await expect(
        creatorQualificationService.uploadPortfolioItem({
          creatorId: 'non-existent-id',
          title: 'Test',
          fileUrl: 'https://example.com/file.pdf',
          fileType: 'pdf',
          fileSize: 1024000,
        })
      ).rejects.toThrow('Creator not found')
    })
  })

  describe('getCreatorPortfolio', () => {
    it('should get creator portfolio items', async () => {
      const portfolioItems = await creatorQualificationService.getCreatorPortfolio(testCreatorId)

      expect(Array.isArray(portfolioItems)).toBe(true)
      expect(portfolioItems.length).toBeGreaterThan(0)
    })
  })

  describe('getVerificationQueue', () => {
    it('should get pending creators', async () => {
      const result = await creatorQualificationService.getVerificationQueue({
        status: 'pending',
        limit: 10,
        offset: 0,
      })

      expect(result).toBeDefined()
      expect(result.creators).toBeDefined()
      expect(Array.isArray(result.creators)).toBe(true)
      expect(result.total).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getVerificationStats', () => {
    it('should get verification statistics', async () => {
      const stats = await creatorQualificationService.getVerificationStats()

      expect(stats).toBeDefined()
      expect(stats.pending).toBeGreaterThanOrEqual(0)
      expect(stats.approved).toBeGreaterThanOrEqual(0)
      expect(stats.rejected).toBeGreaterThanOrEqual(0)
      expect(stats.total).toBeGreaterThanOrEqual(0)
    })
  })
})
