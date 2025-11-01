import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

/**
 * Middleware to check if user has admin role
 * Must be used after authMiddleware
 */
export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user

    if (!user) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    // Get user from database to check role
    let dbUser

    if (user.userId) {
      // Email-based auth
      dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { role: true },
      })
    } else if (user.address) {
      // Wallet-based auth
      dbUser = await prisma.user.findUnique({
        where: { walletAddress: user.address.toLowerCase() },
        select: { role: true },
      })
    }

    if (!dbUser) {
      res.status(403).json({ error: 'User not found' })
      return
    }

    if (dbUser.role !== 'admin' && dbUser.role !== 'moderator') {
      logger.warn(`Unauthorized admin access attempt by user: ${user.userId || user.address}`)
      res.status(403).json({ error: 'Admin access required' })
      return
    }

    // User is admin, proceed
    next()
  } catch (error) {
    logger.error('Admin middleware error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
