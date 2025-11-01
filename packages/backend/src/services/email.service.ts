import nodemailer from 'nodemailer'
import { logger } from '../utils/logger'

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@knowton.io'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    // Create reusable transporter
    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: SMTP_USER && SMTP_PASS ? {
        user: SMTP_USER,
        pass: SMTP_PASS,
      } : undefined,
    })
  }

  /**
   * Send email verification link
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`

    const mailOptions = {
      from: FROM_EMAIL,
      to: email,
      subject: 'Verify Your Email - KnowTon Platform',
      html: this.getVerificationEmailTemplate(verifyUrl),
    }

    try {
      await this.transporter.sendMail(mailOptions)
      logger.info(`Verification email sent to ${email}`)
    } catch (error) {
      logger.error('Failed to send verification email:', error)
      throw new Error('Failed to send verification email')
    }
  }

  /**
   * Send password reset link
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`

    const mailOptions = {
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset Your Password - KnowTon Platform',
      html: this.getPasswordResetEmailTemplate(resetUrl),
    }

    try {
      await this.transporter.sendMail(mailOptions)
      logger.info(`Password reset email sent to ${email}`)
    } catch (error) {
      logger.error('Failed to send password reset email:', error)
      throw new Error('Failed to send password reset email')
    }
  }

  /**
   * Send welcome email after successful registration
   */
  async sendWelcomeEmail(email: string, username?: string): Promise<void> {
    const mailOptions = {
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to KnowTon Platform!',
      html: this.getWelcomeEmailTemplate(username),
    }

    try {
      await this.transporter.sendMail(mailOptions)
      logger.info(`Welcome email sent to ${email}`)
    } catch (error) {
      logger.error('Failed to send welcome email:', error)
      // Don't throw error for welcome email
    }
  }

  /**
   * Email verification template
   */
  private getVerificationEmailTemplate(verifyUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Thank you for registering with KnowTon Platform!</p>
            <p>Please click the button below to verify your email address:</p>
            <div style="text-align: center;">
              <a href="${verifyUrl}" class="button">Verify Email</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${verifyUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 KnowTon Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Password reset email template
   */
  private getPasswordResetEmailTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>We received a request to reset your password for your KnowTon account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 KnowTon Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Welcome email template
   */
  private getWelcomeEmailTemplate(username?: string): string {
    const greeting = username ? `Hi ${username}` : 'Welcome'
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${greeting}!</h1>
          </div>
          <div class="content">
            <p>Welcome to KnowTon Platform - the future of intellectual property management!</p>
            <p>Your account has been successfully created and verified. You can now:</p>
            <ul>
              <li>Upload and protect your creative content</li>
              <li>Register copyrights on the blockchain</li>
              <li>Monetize your intellectual property</li>
              <li>Connect with other creators</li>
            </ul>
            <div style="text-align: center;">
              <a href="${FRONTEND_URL}" class="button">Get Started</a>
            </div>
            <p>If you have any questions, feel free to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 KnowTon Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Send creator approval notification
   */
  async sendCreatorApprovalEmail(email: string, displayName: string, walletAddress: string): Promise<void> {
    const mailOptions = {
      from: FROM_EMAIL,
      to: email,
      subject: 'Creator Application Approved - KnowTon Platform',
      html: this.getCreatorApprovalEmailTemplate(displayName, walletAddress),
    }

    try {
      await this.transporter.sendMail(mailOptions)
      logger.info(`Creator approval email sent to ${email}`)
    } catch (error) {
      logger.error('Failed to send creator approval email:', error)
      throw new Error('Failed to send creator approval email')
    }
  }

  /**
   * Send creator rejection notification
   */
  async sendCreatorRejectionEmail(email: string, displayName: string, reason: string): Promise<void> {
    const mailOptions = {
      from: FROM_EMAIL,
      to: email,
      subject: 'Creator Application Update - KnowTon Platform',
      html: this.getCreatorRejectionEmailTemplate(displayName, reason),
    }

    try {
      await this.transporter.sendMail(mailOptions)
      logger.info(`Creator rejection email sent to ${email}`)
    } catch (error) {
      logger.error('Failed to send creator rejection email:', error)
      throw new Error('Failed to send creator rejection email')
    }
  }

  /**
   * Creator approval email template
   */
  private getCreatorApprovalEmailTemplate(displayName: string, walletAddress: string): string {
    const dashboardUrl = `${FRONTEND_URL}/creator/dashboard`
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .success-badge { background: #d1fae5; color: #065f46; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 10px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Congratulations!</h1>
          </div>
          <div class="content">
            <div style="text-align: center;">
              <span class="success-badge">✓ APPROVED</span>
            </div>
            <p>Hi ${displayName},</p>
            <p>Great news! Your creator application has been <strong>approved</strong>.</p>
            <p>You can now:</p>
            <ul>
              <li>Upload and monetize your content</li>
              <li>Register copyrights on the blockchain</li>
              <li>Build your creator portfolio</li>
              <li>Engage with your audience</li>
              <li>Earn revenue from your intellectual property</li>
            </ul>
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">Go to Creator Dashboard</a>
            </div>
            <p style="margin-top: 20px; padding: 15px; background: #e0f2fe; border-left: 4px solid #0284c7; border-radius: 4px;">
              <strong>Your Creator Wallet:</strong><br>
              <code style="font-size: 12px; word-break: break-all;">${walletAddress}</code>
            </p>
            <p>If you have any questions, our support team is here to help!</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 KnowTon Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Creator rejection email template
   */
  private getCreatorRejectionEmailTemplate(displayName: string, reason: string): string {
    const reapplyUrl = `${FRONTEND_URL}/creator/apply`
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Creator Application Update</h1>
          </div>
          <div class="content">
            <p>Hi ${displayName},</p>
            <p>Thank you for your interest in becoming a creator on KnowTon Platform.</p>
            <p>After careful review, we're unable to approve your application at this time.</p>
            <div class="info-box">
              <strong>Reason:</strong><br>
              ${reason}
            </div>
            <p><strong>What's next?</strong></p>
            <ul>
              <li>Review our creator guidelines</li>
              <li>Update your portfolio with stronger examples</li>
              <li>Ensure all required documents are included</li>
              <li>Reapply when you're ready</li>
            </ul>
            <div style="text-align: center;">
              <a href="${reapplyUrl}" class="button">Reapply Now</a>
            </div>
            <p>We encourage you to address the feedback and reapply. Our team is here to support you!</p>
            <p>If you have questions about this decision, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 KnowTon Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
}

export const emailService = new EmailService()
