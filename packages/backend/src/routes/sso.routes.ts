import { Router, Request, Response } from 'express'
import { ssoService } from '../services/sso.service'

const router = Router()

/**
 * GET /api/auth/sso/providers
 * Get list of configured SSO providers
 */
router.get('/providers', (_req: Request, res: Response): void => {
  try {
    const providers = ssoService.getConfiguredProviders()
    res.json({
      success: true,
      providers,
    })
  } catch (error: any) {
    console.error('Get SSO providers error:', error)
    res.status(500).json({ error: 'Failed to get SSO providers' })
  }
})

/**
 * GET /api/auth/oauth2/:provider/authorize
 * Initiate OAuth2 authentication flow
 */
router.get('/oauth2/:provider/authorize', (req: Request, res: Response): void => {
  try {
    const { provider } = req.params
    const { state } = req.query

    if (!ssoService.isProviderConfigured(provider, 'oauth2')) {
      res.status(400).json({ error: `OAuth2 provider ${provider} not configured` })
      return
    }

    const authUrl = ssoService.generateOAuth2AuthUrl(provider, state as string)
    res.redirect(authUrl)
  } catch (error: any) {
    console.error('OAuth2 authorization error:', error)
    res.status(500).json({ error: error.message || 'Failed to initiate OAuth2 flow' })
  }
})

/**
 * GET /api/auth/oauth2/:provider/callback
 * Handle OAuth2 callback
 */
router.get('/oauth2/:provider/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider } = req.params
    const { code, state, error, error_description } = req.query

    // Check for OAuth2 errors
    if (error) {
      console.error(`OAuth2 error from ${provider}:`, error, error_description)
      res.redirect(`${process.env.FRONTEND_URL}/login?error=${error}`)
      return
    }

    if (!code) {
      res.status(400).json({ error: 'Authorization code not provided' })
      return
    }

    // Authenticate user
    const result = await ssoService.authenticateOAuth2(provider, code as string)

    // Set token in httpOnly cookie
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    // Redirect to frontend with success
    const redirectUrl = result.isNewUser
      ? `${process.env.FRONTEND_URL}/onboarding?sso=true`
      : `${process.env.FRONTEND_URL}/dashboard?sso=true`

    res.redirect(redirectUrl)
  } catch (error: any) {
    console.error('OAuth2 callback error:', error)
    res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`)
  }
})

/**
 * POST /api/auth/oauth2/:provider/token
 * Exchange OAuth2 code for token (alternative to callback redirect)
 */
router.post('/oauth2/:provider/token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider } = req.params
    const { code } = req.body

    if (!code) {
      res.status(400).json({ error: 'Authorization code is required' })
      return
    }

    // Authenticate user
    const result = await ssoService.authenticateOAuth2(provider, code)

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
      isNewUser: result.isNewUser,
    })
  } catch (error: any) {
    console.error('OAuth2 token exchange error:', error)
    res.status(401).json({ error: error.message || 'Authentication failed' })
  }
})

/**
 * GET /api/auth/saml/:provider/login
 * Initiate SAML authentication flow
 */
router.get('/saml/:provider/login', (req: Request, res: Response): void => {
  try {
    const { provider } = req.params

    if (!ssoService.isProviderConfigured(provider, 'saml')) {
      res.status(400).json({ error: `SAML provider ${provider} not configured` })
      return
    }

    const authUrl = ssoService.generateSAMLAuthRequest(provider)
    res.redirect(authUrl)
  } catch (error: any) {
    console.error('SAML login error:', error)
    res.status(500).json({ error: error.message || 'Failed to initiate SAML flow' })
  }
})

/**
 * POST /api/auth/saml/:provider/callback
 * Handle SAML callback (ACS - Assertion Consumer Service)
 */
router.post('/saml/:provider/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider } = req.params
    const { SAMLResponse } = req.body

    if (!SAMLResponse) {
      res.status(400).json({ error: 'SAML response not provided' })
      return
    }

    // Authenticate user
    const result = await ssoService.authenticateSAML(SAMLResponse, provider)

    // Set token in httpOnly cookie
    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    // Redirect to frontend with success
    const redirectUrl = result.isNewUser
      ? `${process.env.FRONTEND_URL}/onboarding?sso=true`
      : `${process.env.FRONTEND_URL}/dashboard?sso=true`

    res.redirect(redirectUrl)
  } catch (error: any) {
    console.error('SAML callback error:', error)
    res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`)
  }
})

/**
 * GET /api/auth/saml/metadata
 * Get SAML service provider metadata
 */
router.get('/saml/metadata', (_req: Request, res: Response): void => {
  try {
    const issuer = process.env.SAML_ISSUER || 'knowton-platform'
    const callbackUrl = process.env.SAML_CALLBACK_URL || 'http://localhost:3000/api/auth/saml/default/callback'

    const metadata = `
      <?xml version="1.0"?>
      <md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                           entityID="${issuer}">
        <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true"
                            protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
          <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
          <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                       Location="${callbackUrl}"
                                       index="1" />
        </md:SPSSODescriptor>
      </md:EntityDescriptor>
    `.trim()

    res.set('Content-Type', 'application/xml')
    res.send(metadata)
  } catch (error: any) {
    console.error('SAML metadata error:', error)
    res.status(500).json({ error: 'Failed to generate SAML metadata' })
  }
})

/**
 * POST /api/auth/sso/provision
 * Provision a new user via SSO (admin only)
 */
router.post('/provision', async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: Add admin authentication middleware
    const { email, provider, externalId, type } = req.body

    if (!email || !provider || !externalId || !type) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    if (type !== 'oauth2' && type !== 'saml') {
      res.status(400).json({ error: 'Invalid SSO type. Must be oauth2 or saml' })
      return
    }

    const user = await ssoService.provisionUser(email, provider, externalId, type)

    res.json({
      success: true,
      user,
    })
  } catch (error: any) {
    console.error('User provisioning error:', error)
    res.status(500).json({ error: error.message || 'Failed to provision user' })
  }
})

/**
 * POST /api/auth/sso/deprovision
 * Deprovision a user (remove SSO access) (admin only)
 */
router.post('/deprovision', async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: Add admin authentication middleware
    const { userId, provider } = req.body

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' })
      return
    }

    await ssoService.deprovisionUser(userId, provider)

    res.json({
      success: true,
      message: provider
        ? `User deprovisioned from ${provider}`
        : 'User deprovisioned from all SSO providers',
    })
  } catch (error: any) {
    console.error('User deprovisioning error:', error)
    res.status(500).json({ error: error.message || 'Failed to deprovision user' })
  }
})

/**
 * GET /api/auth/sso/user/:userId/providers
 * Get user's SSO providers (admin only)
 */
router.get('/user/:userId/providers', async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: Add admin authentication middleware
    const { userId } = req.params

    const providers = await ssoService.getUserSSOProviders(userId)

    res.json({
      success: true,
      providers,
    })
  } catch (error: any) {
    console.error('Get user SSO providers error:', error)
    res.status(500).json({ error: 'Failed to get user SSO providers' })
  }
})

export default router
