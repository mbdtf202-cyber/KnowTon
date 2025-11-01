import { Router, Request, Response } from 'express'
import { authService } from '../services/auth.service'

const router = Router()

/**
 * POST /api/auth/wallet/nonce
 * Generate nonce for wallet authentication
 */
router.post('/wallet/nonce', async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.body

    if (!address) {
      res.status(400).json({ error: 'Address is required' })
      return
    }

    const nonce = authService.generateNonce(address)

    res.json({ nonce })
  } catch (error) {
    console.error('Nonce generation error:', error)
    res.status(500).json({ error: 'Failed to generate nonce' })
  }
})

/**
 * POST /api/auth/wallet/verify
 * Verify wallet signature and issue JWT token
 */
router.post('/wallet/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { address, message, signature, walletType } = req.body

    if (!address || !message || !signature) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    const { token, user } = await authService.authenticateWallet({
      address,
      message,
      signature,
      walletType,
    })

    // Set token in httpOnly cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    res.json({ 
      success: true,
      user,
      token, // Also return in response for client-side storage if needed
    })
  } catch (error) {
    console.error('Wallet verification error:', error)
    res.status(401).json({ error: 'Authentication failed' })
  }
})

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      res.status(401).json({ error: 'No token provided' })
      return
    }

    const newToken = authService.refreshToken(token)

    res.cookie('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.json({ success: true, token: newToken })
  } catch (error) {
    console.error('Token refresh error:', error)
    res.status(401).json({ error: 'Token refresh failed' })
  }
})

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('auth_token')
  res.json({ success: true })
})

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    const decoded = authService.verifyToken(token)

    // TODO: Fetch full user data from database
    res.json({ 
      user: {
        address: decoded.address,
        walletType: decoded.walletType,
        role: decoded.role,
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(401).json({ error: 'Invalid token' })
  }
})

/**
 * POST /api/auth/email/register
 * Register with email and password
 */
router.post('/email/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, username } = req.body

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

    const result = await authService.registerWithEmail({
      email,
      password,
      username,
    })

    res.status(201).json(result)
  } catch (error: any) {
    console.error('Email registration error:', error)
    res.status(400).json({ error: error.message || 'Registration failed' })
  }
})

/**
 * POST /api/auth/email/verify
 * Verify email with token
 */
router.post('/email/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body

    if (!token) {
      res.status(400).json({ error: 'Verification token is required' })
      return
    }

    const result = await authService.verifyEmail(token)

    // Set token in httpOnly cookie
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    res.json({
      success: true,
      user: result.user,
      token: result.token,
    })
  } catch (error: any) {
    console.error('Email verification error:', error)
    res.status(400).json({ error: error.message || 'Verification failed' })
  }
})

/**
 * POST /api/auth/email/login
 * Login with email and password
 */
router.post('/email/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' })
      return
    }

    const { token, user } = await authService.authenticateEmail({
      email,
      password,
    })

    // Set token in httpOnly cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    res.json({
      success: true,
      user,
      token,
    })
  } catch (error: any) {
    console.error('Email login error:', error)
    res.status(401).json({ error: error.message || 'Authentication failed' })
  }
})

/**
 * POST /api/auth/password/reset-request
 * Request password reset
 */
router.post('/password/reset-request', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body

    if (!email) {
      res.status(400).json({ error: 'Email is required' })
      return
    }

    const result = await authService.requestPasswordReset(email)

    res.json(result)
  } catch (error: any) {
    console.error('Password reset request error:', error)
    res.status(500).json({ error: error.message || 'Failed to process request' })
  }
})

/**
 * POST /api/auth/password/reset
 * Reset password with token
 */
router.post('/password/reset', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      res.status(400).json({ error: 'Token and new password are required' })
      return
    }

    const result = await authService.resetPassword(token, password)

    res.json(result)
  } catch (error: any) {
    console.error('Password reset error:', error)
    res.status(400).json({ error: error.message || 'Password reset failed' })
  }
})

/**
 * POST /api/auth/wallet/link
 * Link wallet address to email account
 */
router.post('/wallet/link', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }

    const decoded = authService.verifyToken(token)
    const { walletAddress } = req.body

    if (!walletAddress) {
      res.status(400).json({ error: 'Wallet address is required' })
      return
    }

    const result = await authService.linkWalletToEmail(decoded.userId, walletAddress)

    res.json({
      success: true,
      user: result.user,
    })
  } catch (error: any) {
    console.error('Wallet linking error:', error)
    res.status(400).json({ error: error.message || 'Failed to link wallet' })
  }
})

/**
 * POST /api/auth/email/resend-verification
 * Resend verification email
 */
router.post('/email/resend-verification', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body

    if (!email) {
      res.status(400).json({ error: 'Email is required' })
      return
    }

    const result = await authService.resendVerificationEmail(email)

    res.json(result)
  } catch (error: any) {
    console.error('Resend verification error:', error)
    res.status(400).json({ error: error.message || 'Failed to resend verification email' })
  }
})

export default router
