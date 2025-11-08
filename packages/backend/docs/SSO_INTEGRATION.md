# SSO Integration Guide

## Overview

The KnowTon platform supports Single Sign-On (SSO) authentication through both **OAuth2** and **SAML 2.0** protocols. This enables enterprise users to authenticate using their existing identity providers.

## Supported Providers

### OAuth2 Providers
- **Google** - Google Workspace accounts
- **Microsoft** - Azure AD / Microsoft 365 accounts
- **Okta** - Okta OAuth2

### SAML 2.0 Providers
- **Generic SAML** - Any SAML 2.0 compliant IdP
- **Okta SAML** - Okta SAML integration

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │────────▶│  KnowTon API │────────▶│  Identity   │
│  (Browser)  │◀────────│   (Backend)  │◀────────│  Provider   │
└─────────────┘         └──────────────┘         └─────────────┘
     │                         │                         │
     │  1. Initiate SSO        │                         │
     │────────────────────────▶│                         │
     │                         │  2. Redirect to IdP     │
     │                         │────────────────────────▶│
     │  3. User authenticates  │                         │
     │◀────────────────────────────────────────────────│
     │                         │  4. Callback with token │
     │                         │◀────────────────────────│
     │  5. Set JWT cookie      │                         │
     │◀────────────────────────│                         │
```

## Configuration

### Environment Variables

#### OAuth2 Configuration

**Google OAuth2:**
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/sso/oauth2/google/callback
```

**Microsoft OAuth2:**
```bash
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=common  # or your tenant ID
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/v1/auth/sso/oauth2/microsoft/callback
```

**Okta OAuth2:**
```bash
OKTA_CLIENT_ID=your-okta-client-id
OKTA_CLIENT_SECRET=your-okta-client-secret
OKTA_DOMAIN=https://your-domain.okta.com
OKTA_REDIRECT_URI=http://localhost:3000/api/v1/auth/sso/oauth2/okta/callback
```

#### SAML 2.0 Configuration

**Generic SAML:**
```bash
SAML_ENTRY_POINT=https://idp.example.com/saml/sso
SAML_ISSUER=knowton-platform
SAML_CALLBACK_URL=http://localhost:3000/api/v1/auth/sso/saml/default/callback
SAML_CERT=-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----
SAML_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----  # Optional
SAML_IDENTIFIER_FORMAT=urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress
SAML_SIGNATURE_ALGORITHM=sha256
```

**Okta SAML:**
```bash
OKTA_SAML_ENTRY_POINT=https://your-domain.okta.com/app/your-app-id/sso/saml
OKTA_SAML_ISSUER=knowton-platform
OKTA_SAML_CALLBACK_URL=http://localhost:3000/api/v1/auth/sso/saml/okta/callback
OKTA_SAML_CERT=-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----
```

**Frontend URL:**
```bash
FRONTEND_URL=http://localhost:5173
```

## API Endpoints

### Get Configured Providers

```http
GET /api/v1/auth/sso/providers
```

**Response:**
```json
{
  "success": true,
  "providers": {
    "oauth2": ["google", "microsoft", "okta"],
    "saml": ["default", "okta"]
  }
}
```

### OAuth2 Authentication Flow

#### 1. Initiate OAuth2 Flow

```http
GET /api/v1/auth/sso/oauth2/:provider/authorize
```

**Parameters:**
- `provider` - Provider name (google, microsoft, okta)
- `state` (optional) - State parameter for CSRF protection

**Response:**
- Redirects to provider's authorization page

#### 2. OAuth2 Callback

```http
GET /api/v1/auth/sso/oauth2/:provider/callback?code=xxx&state=xxx
```

**Response:**
- Sets `auth_token` cookie
- Redirects to frontend dashboard or onboarding

#### 3. Exchange Code for Token (Alternative)

```http
POST /api/v1/auth/sso/oauth2/:provider/token
Content-Type: application/json

{
  "code": "authorization-code"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "username": "user",
    "role": "user",
    "isEmailVerified": true
  },
  "token": "jwt-token",
  "isNewUser": false
}
```

### SAML 2.0 Authentication Flow

#### 1. Initiate SAML Flow

```http
GET /api/v1/auth/sso/saml/:provider/login
```

**Parameters:**
- `provider` - Provider name (default, okta)

**Response:**
- Redirects to IdP's SSO page with SAML request

#### 2. SAML Callback (ACS)

```http
POST /api/v1/auth/sso/saml/:provider/callback
Content-Type: application/x-www-form-urlencoded

SAMLResponse=base64-encoded-response
```

**Response:**
- Sets `auth_token` cookie
- Redirects to frontend dashboard or onboarding

#### 3. Get SAML Metadata

```http
GET /api/v1/auth/sso/saml/metadata
```

**Response:**
```xml
<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="knowton-platform">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true"
                      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                 Location="http://localhost:3000/api/v1/auth/sso/saml/default/callback"
                                 index="1" />
  </md:SPSSODescriptor>
</md:EntityDescriptor>
```

### User Provisioning (Admin Only)

#### Provision User

```http
POST /api/v1/auth/sso/provision
Content-Type: application/json

{
  "email": "user@example.com",
  "provider": "google",
  "externalId": "external-user-id",
  "type": "oauth2"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "username": "user",
    "role": "user"
  }
}
```

#### Deprovision User

```http
POST /api/v1/auth/sso/deprovision
Content-Type: application/json

{
  "userId": "user-id",
  "provider": "google"  // Optional - removes all providers if omitted
}
```

**Response:**
```json
{
  "success": true,
  "message": "User deprovisioned from google"
}
```

#### Get User's SSO Providers

```http
GET /api/v1/auth/sso/user/:userId/providers
```

**Response:**
```json
{
  "success": true,
  "providers": [
    {
      "provider": "google",
      "type": "oauth2",
      "lastUsedAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T08:00:00Z"
    }
  ]
}
```

## Setup Instructions

### Google OAuth2 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure consent screen
6. Add authorized redirect URI: `http://localhost:3000/api/v1/auth/sso/oauth2/google/callback`
7. Copy Client ID and Client Secret to `.env`

### Microsoft OAuth2 Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Add redirect URI: `http://localhost:3000/api/v1/auth/sso/oauth2/microsoft/callback`
5. Go to "Certificates & secrets" → Create new client secret
6. Go to "API permissions" → Add Microsoft Graph permissions (User.Read, email, profile)
7. Copy Application (client) ID and Client Secret to `.env`

### Okta OAuth2 Setup

1. Go to [Okta Admin Console](https://your-domain.okta.com/admin)
2. Navigate to "Applications" → "Create App Integration"
3. Select "OIDC - OpenID Connect" and "Web Application"
4. Add sign-in redirect URI: `http://localhost:3000/api/v1/auth/sso/oauth2/okta/callback`
5. Copy Client ID and Client Secret to `.env`

### Okta SAML Setup

1. Go to [Okta Admin Console](https://your-domain.okta.com/admin)
2. Navigate to "Applications" → "Create App Integration"
3. Select "SAML 2.0"
4. Configure Single sign on URL: `http://localhost:3000/api/v1/auth/sso/saml/okta/callback`
5. Set Audience URI: `knowton-platform`
6. Add attribute statements:
   - email → user.email
   - firstName → user.firstName
   - lastName → user.lastName
7. Download SAML certificate and add to `.env`

## Database Schema

The SSO integration uses the `SSOProvider` model:

```prisma
model SSOProvider {
  id         String   @id @default(uuid())
  userId     String
  provider   String   // google, microsoft, okta, etc.
  type       String   // oauth2, saml
  externalId String   // User ID from the SSO provider
  metadata   Json?    // Additional provider-specific data
  createdAt  DateTime @default(now())
  lastUsedAt DateTime @default(now())

  @@unique([userId, provider])
  @@index([userId])
  @@index([provider])
  @@index([externalId])
  @@map("sso_providers")
}
```

## User Flow

### New User Registration via SSO

1. User clicks "Sign in with Google/Microsoft/Okta"
2. User is redirected to provider's login page
3. User authenticates with provider
4. Provider redirects back with authorization code
5. Backend exchanges code for access token
6. Backend retrieves user info from provider
7. Backend creates new user account
8. Backend generates JWT token
9. User is redirected to onboarding page

### Existing User Login via SSO

1. User clicks "Sign in with Google/Microsoft/Okta"
2. User is redirected to provider's login page
3. User authenticates with provider
4. Provider redirects back with authorization code
5. Backend exchanges code for access token
6. Backend retrieves user info from provider
7. Backend finds existing user by email
8. Backend updates last login timestamp
9. Backend generates JWT token
10. User is redirected to dashboard

## Security Considerations

### OAuth2 Security

- **State Parameter**: Used for CSRF protection
- **HTTPS Only**: All OAuth2 flows must use HTTPS in production
- **Token Storage**: Access tokens are not stored, only used for user info retrieval
- **JWT Tokens**: Signed with secret key, stored in httpOnly cookies

### SAML Security

- **Signature Verification**: SAML responses should be signed by IdP
- **Certificate Validation**: IdP certificate must be validated
- **Replay Protection**: SAML assertions should include timestamps
- **Audience Restriction**: Validate audience matches our issuer

### General Security

- **Email Verification**: SSO users are automatically marked as verified
- **Account Linking**: Prevent linking same email to multiple accounts
- **Session Management**: JWT tokens expire after 7 days
- **Audit Logging**: All SSO authentications are logged

## Testing

### Run Integration Tests

```bash
cd packages/backend
npm run test:sso
```

Or manually:

```bash
tsx src/scripts/test-sso-integration.ts
```

### Test Coverage

- ✅ Get configured providers
- ✅ OAuth2 authorization redirect
- ✅ OAuth2 callback handling
- ✅ SAML login redirect
- ✅ SAML metadata generation
- ✅ User provisioning
- ✅ User deprovisioning
- ✅ Invalid provider rejection

## Troubleshooting

### Common Issues

**Issue: "OAuth2 provider not configured"**
- Solution: Ensure environment variables are set correctly
- Check: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc.

**Issue: "Invalid redirect URI"**
- Solution: Add redirect URI to provider's allowed list
- Check: URI matches exactly (including protocol and port)

**Issue: "Email not provided by OAuth2 provider"**
- Solution: Ensure email scope is requested
- Check: Provider permissions include email access

**Issue: "SAML response validation failed"**
- Solution: Verify SAML certificate is correct
- Check: Certificate format and encoding

**Issue: "User already exists"**
- Solution: This is expected - user will be logged in
- Check: Email matching logic

### Debug Logging

Enable debug logging:

```bash
DEBUG=sso:* npm run dev
```

## Migration Guide

### Migrating Existing Users to SSO

1. Run database migration to add `SSOProvider` table:
```bash
npx prisma migrate dev --name add_sso_providers
```

2. For existing users who want to use SSO:
   - They can link their SSO account through settings
   - Or admin can provision them via API

3. User can have multiple SSO providers linked

## Best Practices

1. **Always use HTTPS** in production
2. **Validate state parameter** for OAuth2
3. **Verify SAML signatures** in production
4. **Log all SSO events** for audit trail
5. **Implement rate limiting** on SSO endpoints
6. **Use environment-specific redirect URIs**
7. **Rotate client secrets** regularly
8. **Monitor failed authentication attempts**
9. **Implement account lockout** after multiple failures
10. **Provide clear error messages** to users

## Support

For issues or questions:
- Check logs: `packages/backend/logs/`
- Review documentation: This file
- Contact: support@knowton.io
