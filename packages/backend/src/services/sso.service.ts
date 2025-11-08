import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import axios from 'axios'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRY = '7d'

// OAuth2 Provider Configurations
interface OAuth2Config {
  clientId: string
  clientSecret: string
  authorizationUrl: string
  tokenUrl: string
  userInfoUrl: string
  scope: string
  redirectUri: string
}

interface OAuth2TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
}

interface OAuth2UserInfo {
  id: string
  email: string
  name?: string
  picture?: string
  verified_email?: boolean
}

// SAML 2.0 Configuration
interface SAMLConfig {
  entryPoint: string
  issuer: string
  callbackUrl: string
  cert: string
  privateKey?: string
  identifierFormat?: string
  signatureAlgorithm?: string
}

interface SAMLAssertion {
  nameID: string
  email?: string
  firstName?: string
  lastName?: string
  attributes?: Record<string, any>
}

export class SSOService {
  private oauth2Configs: Map<string, OAuth2Config> = new Map()
  private samlConfigs: Map<string, SAMLConfig> = new Map()

  constructor() {
    this.initializeOAuth2Providers()
    this.initializeSAMLProviders()
  }

  /**
   * Initialize OAuth2 provider configurations
   */
  private initializeOAuth2Providers(): void {
    // Google OAuth2
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.oauth2Configs.set('google', {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scope: 'openid email profile',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth2/google/callback',
      })
    }

    // Microsoft OAuth2
    if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
      const tenantId = process.env.MICROSOFT_TENANT_ID || 'common'
      this.oauth2Configs.set('microsoft', {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        authorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scope: 'openid email profile User.Read',
        redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth2/microsoft/callback',
      })
    }

    // Okta OAuth2
    if (process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET && process.env.OKTA_DOMAIN) {
      this.oauth2Configs.set('okta', {
        clientId: process.env.OKTA_CLIENT_ID,
        clientSecret: process.env.OKTA_CLIENT_SECRET,
        authorizationUrl: `${process.env.OKTA_DOMAIN}/oauth2/v1/authorize`,
        tokenUrl: `${process.env.OKTA_DOMAIN}/oauth2/v1/token`,
        userInfoUrl: `${process.env.OKTA_DOMAIN}/oauth2/v1/userinfo`,
        scope: 'openid email profile',
        redirectUri: process.env.OKTA_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth2/okta/callback',
      })
    }
  }

  /**
   * Initialize SAML provider configurations
   */
  private initializeSAMLProviders(): void {
    // Generic SAML configuration
    if (process.env.SAML_ENTRY_POINT && process.env.SAML_ISSUER && process.env.SAML_CERT) {
      this.samlConfigs.set('default', {
        entryPoint: process.env.SAML_ENTRY_POINT,
        issuer: process.env.SAML_ISSUER,
        callbackUrl: process.env.SAML_CALLBACK_URL || 'http://localhost:3000/api/auth/saml/callback',
        cert: process.env.SAML_CERT,
        privateKey: process.env.SAML_PRIVATE_KEY,
        identifierFormat: process.env.SAML_IDENTIFIER_FORMAT || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        signatureAlgorithm: process.env.SAML_SIGNATURE_ALGORITHM || 'sha256',
      })
    }

    // Okta SAML configuration
    if (process.env.OKTA_SAML_ENTRY_POINT && process.env.OKTA_SAML_ISSUER && process.env.OKTA_SAML_CERT) {
      this.samlConfigs.set('okta', {
        entryPoint: process.env.OKTA_SAML_ENTRY_POINT,
        issuer: process.env.OKTA_SAML_ISSUER,
        callbackUrl: process.env.OKTA_SAML_CALLBACK_URL || 'http://localhost:3000/api/auth/saml/okta/callback',
        cert: process.env.OKTA_SAML_CERT,
        privateKey: process.env.OKTA_SAML_PRIVATE_KEY,
        identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        signatureAlgorithm: 'sha256',
      })
    }
  }

  /**
   * Generate OAuth2 authorization URL
   */
  generateOAuth2AuthUrl(provider: string, state?: string): string {
    const config = this.oauth2Configs.get(provider)
    if (!config) {
      throw new Error(`OAuth2 provider ${provider} not configured`)
    }

    const stateParam = state || crypto.randomBytes(16).toString('hex')
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope,
      state: stateParam,
    })

    // Microsoft-specific parameters
    if (provider === 'microsoft') {
      params.append('response_mode', 'query')
    }

    return `${config.authorizationUrl}?${params.toString()}`
  }

  /**
   * Exchange OAuth2 authorization code for access token
   */
  async exchangeOAuth2Code(provider: string, code: string): Promise<OAuth2TokenResponse> {
    const config = this.oauth2Configs.get(provider)
    if (!config) {
      throw new Error(`OAuth2 provider ${provider} not configured`)
    }

    try {
      const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      })

      const response = await axios.post<OAuth2TokenResponse>(
        config.tokenUrl,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      return response.data
    } catch (error: any) {
      console.error(`OAuth2 token exchange error for ${provider}:`, error.response?.data || error.message)
      throw new Error(`Failed to exchange OAuth2 code for ${provider}`)
    }
  }

  /**
   * Get user info from OAuth2 provider
   */
  async getOAuth2UserInfo(provider: string, accessToken: string): Promise<OAuth2UserInfo> {
    const config = this.oauth2Configs.get(provider)
    if (!config) {
      throw new Error(`OAuth2 provider ${provider} not configured`)
    }

    try {
      const response = await axios.get(config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      // Normalize user info across providers
      const data = response.data
      let userInfo: OAuth2UserInfo

      if (provider === 'google') {
        userInfo = {
          id: data.id,
          email: data.email,
          name: data.name,
          picture: data.picture,
          verified_email: data.verified_email,
        }
      } else if (provider === 'microsoft') {
        userInfo = {
          id: data.id,
          email: data.mail || data.userPrincipalName,
          name: data.displayName,
          picture: null,
          verified_email: true,
        }
      } else if (provider === 'okta') {
        userInfo = {
          id: data.sub,
          email: data.email,
          name: data.name,
          picture: data.picture,
          verified_email: data.email_verified,
        }
      } else {
        userInfo = {
          id: data.id || data.sub,
          email: data.email,
          name: data.name,
          picture: data.picture,
          verified_email: data.verified_email || data.email_verified,
        }
      }

      return userInfo
    } catch (error: any) {
      console.error(`OAuth2 user info error for ${provider}:`, error.response?.data || error.message)
      throw new Error(`Failed to get user info from ${provider}`)
    }
  }

  /**
   * Authenticate user with OAuth2
   */
  async authenticateOAuth2(provider: string, code: string): Promise<{ token: string; user: any; isNewUser: boolean }> {
    // Exchange code for access token
    const tokenResponse = await this.exchangeOAuth2Code(provider, code)

    // Get user info
    const userInfo = await this.getOAuth2UserInfo(provider, tokenResponse.access_token)

    if (!userInfo.email) {
      throw new Error('Email not provided by OAuth2 provider')
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    })

    let isNewUser = false

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: userInfo.email,
          username: userInfo.name?.replace(/\s+/g, '_').toLowerCase(),
          isEmailVerified: userInfo.verified_email || true,
          role: 'user',
          isActive: true,
        },
      })
      isNewUser = true
    } else {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
    }

    // Store SSO provider info
    await this.storeSSOProvider(user.id, provider, 'oauth2', userInfo.id)

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        ssoProvider: provider,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    )

    return {
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      isNewUser,
    }
  }

  /**
   * Generate SAML authentication request
   */
  generateSAMLAuthRequest(provider: string = 'default'): string {
    const config = this.samlConfigs.get(provider)
    if (!config) {
      throw new Error(`SAML provider ${provider} not configured`)
    }

    const id = '_' + crypto.randomBytes(16).toString('hex')
    const instant = new Date().toISOString()

    const request = `
      <samlp:AuthnRequest
        xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        ID="${id}"
        Version="2.0"
        IssueInstant="${instant}"
        Destination="${config.entryPoint}"
        AssertionConsumerServiceURL="${config.callbackUrl}"
        ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
        <saml:Issuer>${config.issuer}</saml:Issuer>
        <samlp:NameIDPolicy
          Format="${config.identifierFormat}"
          AllowCreate="true"/>
      </samlp:AuthnRequest>
    `.trim().replace(/\s+/g, ' ')

    // Base64 encode the request
    const encodedRequest = Buffer.from(request).toString('base64')

    // Build redirect URL
    const params = new URLSearchParams({
      SAMLRequest: encodedRequest,
    })

    return `${config.entryPoint}?${params.toString()}`
  }

  /**
   * Validate SAML response
   */
  async validateSAMLResponse(samlResponse: string, provider: string = 'default'): Promise<SAMLAssertion> {
    const config = this.samlConfigs.get(provider)
    if (!config) {
      throw new Error(`SAML provider ${provider} not configured`)
    }

    try {
      // Decode base64 SAML response
      const decodedResponse = Buffer.from(samlResponse, 'base64').toString('utf-8')

      // Parse XML (simplified - in production use a proper XML parser like xml2js)
      const nameIDMatch = decodedResponse.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/)
      const emailMatch = decodedResponse.match(/<saml:Attribute Name="email"[^>]*>[\s\S]*?<saml:AttributeValue>([^<]+)<\/saml:AttributeValue>/)
      const firstNameMatch = decodedResponse.match(/<saml:Attribute Name="firstName"[^>]*>[\s\S]*?<saml:AttributeValue>([^<]+)<\/saml:AttributeValue>/)
      const lastNameMatch = decodedResponse.match(/<saml:Attribute Name="lastName"[^>]*>[\s\S]*?<saml:AttributeValue>([^<]+)<\/saml:AttributeValue>/)

      if (!nameIDMatch) {
        throw new Error('Invalid SAML response: NameID not found')
      }

      const assertion: SAMLAssertion = {
        nameID: nameIDMatch[1],
        email: emailMatch ? emailMatch[1] : nameIDMatch[1],
        firstName: firstNameMatch ? firstNameMatch[1] : undefined,
        lastName: lastNameMatch ? lastNameMatch[1] : undefined,
      }

      return assertion
    } catch (error: any) {
      console.error('SAML validation error:', error.message)
      throw new Error('Failed to validate SAML response')
    }
  }

  /**
   * Authenticate user with SAML
   */
  async authenticateSAML(samlResponse: string, provider: string = 'default'): Promise<{ token: string; user: any; isNewUser: boolean }> {
    // Validate SAML response
    const assertion = await this.validateSAMLResponse(samlResponse, provider)

    if (!assertion.email) {
      throw new Error('Email not provided in SAML assertion')
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: assertion.email },
    })

    let isNewUser = false

    if (!user) {
      // Create new user
      const username = assertion.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')
      user = await prisma.user.create({
        data: {
          email: assertion.email,
          username,
          isEmailVerified: true,
          role: 'user',
          isActive: true,
        },
      })
      isNewUser = true
    } else {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
    }

    // Store SSO provider info
    await this.storeSSOProvider(user.id, provider, 'saml', assertion.nameID)

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        ssoProvider: provider,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    )

    return {
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      isNewUser,
    }
  }

  /**
   * Store SSO provider information
   */
  private async storeSSOProvider(userId: string, provider: string, type: 'oauth2' | 'saml', externalId: string): Promise<void> {
    try {
      await prisma.sSOProvider.upsert({
        where: {
          userId_provider: {
            userId,
            provider,
          },
        },
        update: {
          externalId,
          lastUsedAt: new Date(),
        },
        create: {
          userId,
          provider,
          type,
          externalId,
          lastUsedAt: new Date(),
        },
      })
    } catch (error) {
      console.error('Failed to store SSO provider:', error)
      // Don't fail authentication if storing provider info fails
    }
  }

  /**
   * Deprovision user (remove SSO access)
   */
  async deprovisionUser(userId: string, provider?: string): Promise<void> {
    if (provider) {
      // Remove specific SSO provider
      await prisma.sSOProvider.deleteMany({
        where: {
          userId,
          provider,
        },
      })
    } else {
      // Remove all SSO providers for user
      await prisma.sSOProvider.deleteMany({
        where: { userId },
      })
    }

    // Optionally deactivate user account
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    })
  }

  /**
   * Provision user (enable SSO access)
   */
  async provisionUser(email: string, provider: string, externalId: string, type: 'oauth2' | 'saml'): Promise<any> {
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      const username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')
      user = await prisma.user.create({
        data: {
          email,
          username,
          isEmailVerified: true,
          role: 'user',
          isActive: true,
        },
      })
    } else {
      // Reactivate if deactivated
      if (!user.isActive) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isActive: true },
        })
      }
    }

    // Store SSO provider
    await this.storeSSOProvider(user.id, provider, type, externalId)

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    }
  }

  /**
   * Get user's SSO providers
   */
  async getUserSSOProviders(userId: string): Promise<any[]> {
    return await prisma.sSOProvider.findMany({
      where: { userId },
      select: {
        provider: true,
        type: true,
        lastUsedAt: true,
        createdAt: true,
      },
    })
  }

  /**
   * Check if provider is configured
   */
  isProviderConfigured(provider: string, type: 'oauth2' | 'saml'): boolean {
    if (type === 'oauth2') {
      return this.oauth2Configs.has(provider)
    } else {
      return this.samlConfigs.has(provider)
    }
  }

  /**
   * Get list of configured providers
   */
  getConfiguredProviders(): { oauth2: string[]; saml: string[] } {
    return {
      oauth2: Array.from(this.oauth2Configs.keys()),
      saml: Array.from(this.samlConfigs.keys()),
    }
  }
}

export const ssoService = new SSOService()
