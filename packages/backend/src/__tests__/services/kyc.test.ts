// Mock modules before importing
jest.mock('@prisma/client')
jest.mock('axios')
jest.mock('../../utils/logger')

import { kycService } from '../../services/kyc.service'
import { PrismaClient } from '@prisma/client'

// Create mock Prisma instance
const mockPrismaUser = {
  findUnique: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  groupBy: jest.fn(),
}

// Mock PrismaClient constructor
;(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => ({
  user: mockPrismaUser,
  $connect: jest.fn(),
  $disconnect: jest.fn(),
} as any))

describe('KYCService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserKYCStatus', () => {
    it('should return user KYC status', async () => {
      const mockUser = {
        kycStatus: 'approved',
        kycLevel: 1,
        kycVerifiedAt: new Date(),
        kycTransactionId: 'test-transaction-id',
      }

      mockPrismaUser.findUnique.mockResolvedValue(mockUser)

      const result = await kycService.getUserKYCStatus('user-id')

      expect(result).toEqual({
        status: 'approved',
        level: 1,
        verifiedAt: mockUser.kycVerifiedAt,
        transactionId: 'test-transaction-id',
      })
    })

    it('should throw error if user not found', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null)

      await expect(kycService.getUserKYCStatus('invalid-id')).rejects.toThrow('User not found')
    })
  })

  describe('checkKYCRequirement', () => {
    it('should return true if user meets requirement', async () => {
      const mockUser = {
        kycStatus: 'approved',
        kycLevel: 2,
        kycVerifiedAt: new Date(),
        kycTransactionId: 'test-transaction-id',
      }

      mockPrismaUser.findUnique.mockResolvedValue(mockUser)

      const result = await kycService.checkKYCRequirement('user-id', 1)

      expect(result).toBe(true)
    })

    it('should return false if user does not meet requirement', async () => {
      const mockUser = {
        kycStatus: 'approved',
        kycLevel: 1,
        kycVerifiedAt: new Date(),
        kycTransactionId: 'test-transaction-id',
      }

      mockPrismaUser.findUnique.mockResolvedValue(mockUser)

      const result = await kycService.checkKYCRequirement('user-id', 2)

      expect(result).toBe(false)
    })

    it('should return false if KYC not approved', async () => {
      const mockUser = {
        kycStatus: 'pending',
        kycLevel: 0,
        kycVerifiedAt: null,
        kycTransactionId: 'test-transaction-id',
      }

      mockPrismaUser.findUnique.mockResolvedValue(mockUser)

      const result = await kycService.checkKYCRequirement('user-id', 1)

      expect(result).toBe(false)
    })
  })

  describe('updateKYCLevel', () => {
    it('should update user KYC level', async () => {
      mockPrismaUser.update.mockResolvedValue({
        id: 'user-id',
        kycStatus: 'approved',
        kycLevel: 2,
      })

      await kycService.updateKYCLevel('user-id', 2, 'approved', 'admin-id')

      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: expect.objectContaining({
          kycStatus: 'approved',
          kycLevel: 2,
        }),
      })
    })
  })

  describe('getKYCStatistics', () => {
    it('should return KYC statistics', async () => {
      mockPrismaUser.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(70) // approved
        .mockResolvedValueOnce(20) // rejected

      mockPrismaUser.groupBy.mockResolvedValue([
        { kycLevel: 1, _count: 50 },
        { kycLevel: 2, _count: 20 },
      ])

      const result = await kycService.getKYCStatistics()

      expect(result).toEqual({
        total: 100,
        pending: 10,
        approved: 70,
        rejected: 20,
        byLevel: [
          { level: 1, count: 50 },
          { level: 2, count: 20 },
        ],
      })
    })
  })

  describe('verifyWebhookSignature', () => {
    it('should verify valid signature', () => {
      const payload = JSON.stringify({ test: 'data' })
      const crypto = require('crypto')
      const signature = crypto
        .createHmac('sha256', process.env.JUMIO_API_SECRET || '')
        .update(payload)
        .digest('hex')

      const result = kycService.verifyWebhookSignature(payload, signature)

      expect(result).toBe(true)
    })
  })
})
