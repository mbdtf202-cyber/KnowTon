import jwt from 'jsonwebtoken'
import { verifyMessage } from 'ethers'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { emailService } from './email.service'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRY = '7d'
const SALT_ROUNDS = 12

interface WalletAuthPayload {
  address: string
  message: string
  signature: string
  walletType?: 'metamask' | 'walletconnect' | 'coinbase' | 'other'
}

interface EmailAuthPayload {
  email: string
  password: string
}

interface EmailRegistrationPayload {
  email: string
  password: string
  username?: string
}

export class AuthService {
  /**
   * Verify wallet signature and generate JWT token
   */
  async authenticateWallet(payload: WalletAuthPayload): Promise<{ token: string; user: any }> {
    const { address, message, signature, walletType = 'other' } = payload

    try {
      // Verify the signature
      const recoveredAddress = verifyMessage(message, signature)
      
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Invalid signature')
      }

      // Check if message is recent (within 5 minutes)
      const messageMatch = message.match(/Timestamp: (.+)/)
      if (messageMatch) {
        const timestamp = new Date(messageMatch[1])
        const now = new Date()
        const diffMinutes = (now.getTime() - timestamp.getTime()) / 1000 / 60
        
        if (diffMinutes > 5) {
          throw new Error('Message expired')
        }
      }

      // TODO: Check if user exists in database, create if not
      const user = {
        address: address.toLowerCase(),
        walletType,
        role: 'user',
        createdAt: new Date(),
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          address: user.address,
          walletType: user.walletType,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      )

      return { token, user }
    } catch (error) {
      console.error('Wallet authentication error:', error)
      throw new Error('Authentication failed')
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET)
    } catch (error) {
      throw new Error('Invalid token')
    }
  }

  /**
   * Generate nonce for wallet authentication
   */
  generateNonce(address: string): string {
    return `Sign in to KnowTon\n\nAddress: ${address}\nTimestamp: ${new Date().toISOString()}\nNonce: ${Math.random().toString(36).substring(7)}`
  }

  /**
   * Refresh JWT token
   */
  refreshToken(oldToken: string): string {
    const decoded = this.verifyToken(oldToken)
    
    const newToken = jwt.sign(
      {
        address: decoded.address,
        walletType: decoded.walletType,
        role: decoded.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    )

    return newToken
  }

  /**
   * Email/password registration
   */
  async registerWithEmail(payload: EmailRegistrationPayload): Promise<{ user: any; message: string }> {
    const { email, password, username } = payload

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }

    // Validate password strength (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter')
    }
    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter')
    }
    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number')
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new Error('Email already registered')
    }

    // Check if username already exists (if provided)
    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username },
      })

      if (existingUsername) {
        throw new Error('Username already taken')
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

    // Generate email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex')
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        emailVerifyToken: verifyToken,
        emailVerifyExpiry: verifyExpiry,
        isEmailVerified: false,
        role: 'user',
      },
    })

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, verifyToken)
    } catch (error) {
      console.error('Failed to send verification email:', error)
      // Don't fail registration if email fails
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      message: 'Registration successful. Please check your email to verify your account.',
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ user: any; token: string }> {
    const user = await prisma.user.findUnique({
      where: { emailVerifyToken: token },
    })

    if (!user) {
      throw new Error('Invalid verification token')
    }

    if (user.isEmailVerified) {
      throw new Error('Email already verified')
    }

    if (!user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
      throw new Error('Verification token expired')
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    })

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(updatedUser.email!, updatedUser.username || undefined)
    } catch (error) {
      console.error('Failed to send welcome email:', error)
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    )

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified,
      },
      token: jwtToken,
    }
  }

  /**
   * Email/password authentication (for Web2 users)
   */
  async authenticateEmail(payload: EmailAuthPayload): Promise<{ token: string; user: any }> {
    const { email, password } = payload

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !user.password) {
      throw new Error('Invalid email or password')
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated')
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      throw new Error('Invalid email or password')
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    )

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        walletAddress: user.walletAddress,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link has been sent.' }
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(email, resetToken)
    } catch (error) {
      console.error('Failed to send password reset email:', error)
      throw new Error('Failed to send password reset email')
    }

    return { message: 'If the email exists, a reset link has been sent.' }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { resetToken: token },
    })

    if (!user) {
      throw new Error('Invalid reset token')
    }

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new Error('Reset token expired')
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }
    if (!/[A-Z]/.test(newPassword)) {
      throw new Error('Password must contain at least one uppercase letter')
    }
    if (!/[a-z]/.test(newPassword)) {
      throw new Error('Password must contain at least one lowercase letter')
    }
    if (!/[0-9]/.test(newPassword)) {
      throw new Error('Password must contain at least one number')
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    return { message: 'Password reset successful' }
  }

  /**
   * Link wallet address to existing email account
   */
  async linkWalletToEmail(userId: string, walletAddress: string): Promise<{ user: any }> {
    // Check if wallet is already linked to another account
    const existingWallet = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    })

    if (existingWallet && existingWallet.id !== userId) {
      throw new Error('Wallet already linked to another account')
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        walletAddress: walletAddress.toLowerCase(),
      },
    })

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        walletAddress: user.walletAddress,
        role: user.role,
      },
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new Error('User not found')
    }

    if (user.isEmailVerified) {
      throw new Error('Email already verified')
    }

    // Generate new verification token
    const verifyToken = crypto.randomBytes(32).toString('hex')
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: verifyToken,
        emailVerifyExpiry: verifyExpiry,
      },
    })

    // Send verification email
    await emailService.sendVerificationEmail(email, verifyToken)

    return { message: 'Verification email sent' }
  }
}

export const authService = new AuthService()
