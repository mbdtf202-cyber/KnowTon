import { authService } from '../../services/auth.service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Email Authentication', () => {
  const testEmail = 'test-email-auth@example.com'
  const testPassword = 'TestPassword123'
  const testUsername = 'testuser'

  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        email: testEmail,
      },
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('registerWithEmail', () => {
    it('should register a new user with email and password', async () => {
      const result = await authService.registerWithEmail({
        email: testEmail,
        password: testPassword,
        username: testUsername,
      })

      expect(result.user).toBeDefined()
      expect(result.user.email).toBe(testEmail)
      expect(result.user.username).toBe(testUsername)
      expect(result.user.isEmailVerified).toBe(false)
      expect(result.message).toContain('verification')
    })

    it('should reject registration with invalid email', async () => {
      await expect(
        authService.registerWithEmail({
          email: 'invalid-email',
          password: testPassword,
        })
      ).rejects.toThrow('Invalid email format')
    })

    it('should reject registration with weak password', async () => {
      await expect(
        authService.registerWithEmail({
          email: testEmail,
          password: 'weak',
        })
      ).rejects.toThrow('Password must be at least 8 characters')
    })

    it('should reject registration with duplicate email', async () => {
      // Register first user
      await authService.registerWithEmail({
        email: testEmail,
        password: testPassword,
      })

      // Try to register again with same email
      await expect(
        authService.registerWithEmail({
          email: testEmail,
          password: testPassword,
        })
      ).rejects.toThrow('Email already registered')
    })
  })

  describe('authenticateEmail', () => {
    beforeEach(async () => {
      // Register and verify a user for login tests
      await authService.registerWithEmail({
        email: testEmail,
        password: testPassword,
        username: testUsername,
      })

      // Manually verify the user for testing
      await prisma.user.update({
        where: { email: testEmail },
        data: { isEmailVerified: true },
      })
    })

    it('should authenticate user with correct credentials', async () => {
      const result = await authService.authenticateEmail({
        email: testEmail,
        password: testPassword,
      })

      expect(result.token).toBeDefined()
      expect(result.user).toBeDefined()
      expect(result.user.email).toBe(testEmail)
    })

    it('should reject authentication with wrong password', async () => {
      await expect(
        authService.authenticateEmail({
          email: testEmail,
          password: 'WrongPassword123',
        })
      ).rejects.toThrow('Invalid email or password')
    })

    it('should reject authentication with non-existent email', async () => {
      await expect(
        authService.authenticateEmail({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
      ).rejects.toThrow('Invalid email or password')
    })
  })

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      // Register user
      await authService.registerWithEmail({
        email: testEmail,
        password: testPassword,
      })

      // Get the verification token
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      })

      expect(user?.emailVerifyToken).toBeDefined()

      if (!user?.emailVerifyToken) {
        throw new Error('Verification token not found')
      }

      // Verify email
      const result = await authService.verifyEmail(user.emailVerifyToken)

      expect(result.user.isEmailVerified).toBe(true)
      expect(result.token).toBeDefined()
    })

    it('should reject verification with invalid token', async () => {
      await expect(
        authService.verifyEmail('invalid-token')
      ).rejects.toThrow('Invalid verification token')
    })
  })

  describe('requestPasswordReset', () => {
    beforeEach(async () => {
      await authService.registerWithEmail({
        email: testEmail,
        password: testPassword,
      })
    })

    it('should generate reset token for existing user', async () => {
      const result = await authService.requestPasswordReset(testEmail)

      expect(result.message).toContain('reset link')

      // Verify token was created
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      })

      expect(user?.resetToken).toBeDefined()
      expect(user?.resetTokenExpiry).toBeDefined()
    })

    it('should not reveal if email does not exist', async () => {
      const result = await authService.requestPasswordReset('nonexistent@example.com')

      expect(result.message).toContain('reset link')
    })
  })

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      // Register user and request reset
      await authService.registerWithEmail({
        email: testEmail,
        password: testPassword,
      })

      await authService.requestPasswordReset(testEmail)

      // Get reset token
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      })

      if (!user?.resetToken) {
        throw new Error('Reset token not found')
      }

      const newPassword = 'NewPassword456'

      // Reset password
      const result = await authService.resetPassword(
        user.resetToken,
        newPassword
      )

      expect(result.message).toContain('successful')

      // Verify can login with new password
      await prisma.user.update({
        where: { email: testEmail },
        data: { isEmailVerified: true },
      })

      const loginResult = await authService.authenticateEmail({
        email: testEmail,
        password: newPassword,
      })

      expect(loginResult.token).toBeDefined()
    })

    it('should reject reset with invalid token', async () => {
      await expect(
        authService.resetPassword('invalid-token', 'NewPassword456')
      ).rejects.toThrow('Invalid reset token')
    })
  })
})
