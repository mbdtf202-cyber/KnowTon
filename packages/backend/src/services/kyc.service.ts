import axios, { AxiosInstance } from 'axios'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

// Jumio API Configuration
const JUMIO_API_TOKEN = process.env.JUMIO_API_TOKEN || ''
const JUMIO_API_SECRET = process.env.JUMIO_API_SECRET || ''
const JUMIO_BASE_URL = process.env.JUMIO_BASE_URL || 'https://netverify.com/api/v4'
const JUMIO_CALLBACK_URL = process.env.JUMIO_CALLBACK_URL || 'https://api.knowton.io/api/v1/kyc/callback'

export type KYCStatus = 'none' | 'pending' | 'approved' | 'rejected'
export type KYCLevel = 0 | 1 | 2 // 0: none, 1: basic, 2: advanced

interface JumioInitiateRequest {
  customerInternalReference: string
  userReference: string
  callbackUrl: string
  successUrl?: string
  errorUrl?: string
  locale?: string
  workflowId?: number
}

interface JumioInitiateResponse {
  timestamp: string
  transactionReference: string
  redirectUrl: string
}

interface JumioVerificationData {
  transactionReference: string
  status: string
  verificationStatus: string
  idType: string
  idCountry: string
  firstName: string
  lastName: string
  dateOfBirth: string
  expiryDate?: string
  issuingDate?: string
  documentNumber?: string
  similarity: string
  validity: boolean
  rejectReason?: {
    rejectReasonCode: string
    rejectReasonDescription: string
  }
}

export class KYCService {
  private jumioClient: AxiosInstance

  constructor() {
    // Create Jumio API client with basic auth
    this.jumioClient = axios.create({
      baseURL: JUMIO_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'KnowTon/1.0',
      },
      auth: {
        username: JUMIO_API_TOKEN,
        password: JUMIO_API_SECRET,
      },
    })
  }

  /**
   * Initiate KYC verification process
   * Creates a Jumio transaction and returns redirect URL
   */
  async initiateKYC(
    userId: string,
    level: KYCLevel = 1,
    locale: string = 'en'
  ): Promise<{ transactionId: string; redirectUrl: string }> {
    try {
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Check if user already has pending or approved KYC
      if (user.kycStatus === 'pending') {
        throw new Error('KYC verification already in progress')
      }

      if (user.kycStatus === 'approved' && user.kycLevel >= level) {
        throw new Error('User already verified at this level or higher')
      }

      // Determine workflow based on KYC level
      const workflowId = level === 1 ? 100 : 200 // Basic vs Advanced

      // Prepare Jumio request
      const jumioRequest: JumioInitiateRequest = {
        customerInternalReference: userId,
        userReference: user.email || user.walletAddress || userId,
        callbackUrl: JUMIO_CALLBACK_URL,
        successUrl: `${process.env.FRONTEND_URL}/kyc/success`,
        errorUrl: `${process.env.FRONTEND_URL}/kyc/error`,
        locale,
        workflowId,
      }

      // Call Jumio API to initiate verification
      const response = await this.jumioClient.post<JumioInitiateResponse>(
        '/initiateNetverify',
        jumioRequest
      )

      const { transactionReference, redirectUrl } = response.data

      // Update user with pending KYC status
      await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: 'pending',
          kycProvider: 'jumio',
          kycTransactionId: transactionReference,
          kycData: {
            level,
            initiatedAt: new Date().toISOString(),
            workflowId,
          },
        },
      })

      logger.info('KYC verification initiated', {
        userId,
        transactionId: transactionReference,
        level,
      })

      return {
        transactionId: transactionReference,
        redirectUrl,
      }
    } catch (error: any) {
      logger.error('Failed to initiate KYC', {
        userId,
        error: error.message,
        response: error.response?.data,
      })
      throw new Error(`Failed to initiate KYC: ${error.message}`)
    }
  }

  /**
   * Handle Jumio callback webhook
   * Called by Jumio when verification is complete
   */
  async handleCallback(callbackData: any): Promise<void> {
    try {
      const transactionReference = callbackData.transactionReference
      const verificationStatus = callbackData.verificationStatus

      logger.info('Received KYC callback', {
        transactionReference,
        verificationStatus,
      })

      // Find user by transaction ID
      const user = await prisma.user.findUnique({
        where: { kycTransactionId: transactionReference },
      })

      if (!user) {
        logger.error('User not found for KYC callback', { transactionReference })
        return
      }

      // Determine KYC status based on verification result
      let kycStatus: KYCStatus = 'rejected'
      let kycLevel: KYCLevel = 0

      if (verificationStatus === 'APPROVED_VERIFIED') {
        kycStatus = 'approved'
        // Get level from stored KYC data
        const storedData = user.kycData as any
        kycLevel = storedData?.level || 1
      } else if (verificationStatus === 'DENIED_FRAUD') {
        kycStatus = 'rejected'
      } else if (verificationStatus === 'ERROR_NOT_READABLE_ID') {
        kycStatus = 'rejected'
      }

      // Update user with verification result
      await prisma.user.update({
        where: { id: user.id },
        data: {
          kycStatus,
          kycLevel: kycStatus === 'approved' ? kycLevel : 0,
          kycVerifiedAt: kycStatus === 'approved' ? new Date() : null,
          kycData: {
            ...(user.kycData as any),
            verificationStatus,
            verifiedAt: new Date().toISOString(),
            callbackData,
          },
        },
      })

      logger.info('KYC status updated', {
        userId: user.id,
        kycStatus,
        kycLevel,
        transactionReference,
      })

      // TODO: Send notification email to user
    } catch (error: any) {
      logger.error('Failed to handle KYC callback', {
        error: error.message,
        callbackData,
      })
      throw error
    }
  }

  /**
   * Get KYC verification details from Jumio
   */
  async getVerificationDetails(transactionId: string): Promise<JumioVerificationData | null> {
    try {
      const response = await this.jumioClient.get<JumioVerificationData>(
        `/retrieveScan/${transactionId}`
      )

      return response.data
    } catch (error: any) {
      logger.error('Failed to get verification details', {
        transactionId,
        error: error.message,
      })
      return null
    }
  }

  /**
   * Get user KYC status
   */
  async getUserKYCStatus(userId: string): Promise<{
    status: KYCStatus
    level: KYCLevel
    verifiedAt: Date | null
    transactionId: string | null
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        kycStatus: true,
        kycLevel: true,
        kycVerifiedAt: true,
        kycTransactionId: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    return {
      status: user.kycStatus as KYCStatus,
      level: user.kycLevel as KYCLevel,
      verifiedAt: user.kycVerifiedAt,
      transactionId: user.kycTransactionId,
    }
  }

  /**
   * Check if user meets KYC requirement
   */
  async checkKYCRequirement(userId: string, requiredLevel: KYCLevel): Promise<boolean> {
    const status = await this.getUserKYCStatus(userId)
    return status.status === 'approved' && status.level >= requiredLevel
  }

  /**
   * Update KYC level (admin only)
   */
  async updateKYCLevel(
    userId: string,
    level: KYCLevel,
    status: KYCStatus,
    adminId: string
  ): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: status,
          kycLevel: level,
          kycVerifiedAt: status === 'approved' ? new Date() : null,
          kycData: {
            manualUpdate: true,
            updatedBy: adminId,
            updatedAt: new Date().toISOString(),
          },
        },
      })

      logger.info('KYC level updated manually', {
        userId,
        level,
        status,
        adminId,
      })
    } catch (error: any) {
      logger.error('Failed to update KYC level', {
        userId,
        error: error.message,
      })
      throw error
    }
  }

  /**
   * Verify webhook signature (for security)
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', JUMIO_API_SECRET)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  /**
   * Get KYC statistics (admin)
   */
  async getKYCStatistics(): Promise<{
    total: number
    pending: number
    approved: number
    rejected: number
    byLevel: { level: number; count: number }[]
  }> {
    const [total, pending, approved, rejected] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { kycStatus: 'pending' } }),
      prisma.user.count({ where: { kycStatus: 'approved' } }),
      prisma.user.count({ where: { kycStatus: 'rejected' } }),
    ])

    const byLevel = await prisma.user.groupBy({
      by: ['kycLevel'],
      where: { kycStatus: 'approved' },
      _count: true,
    })

    return {
      total,
      pending,
      approved,
      rejected,
      byLevel: byLevel.map((item) => ({
        level: item.kycLevel,
        count: item._count,
      })),
    }
  }
}

export const kycService = new KYCService()
