# SSO Integration - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies

No additional dependencies needed - SSO uses existing packages.

### 2. Run Database Migration

```bash
cd packages/backend
npx prisma migrate dev --name add_sso_providers
npx prisma generate
```

### 3. Configure Environment Variables

Add to `packages/backend/.env`:

```bash
# Frontend URL
FRONTEND_URL=http://localhost:5173

# Google OAuth2 (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/sso/oauth2/google/callback

# Microsoft OAuth2 (Optional)
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/v1/auth/sso/oauth2/microsoft/callback

# Okta OAuth2 (Optional)
OKTA_CLIENT_ID=your-okta-client-id
OKTA_CLIENT_SECRET=your-okta-client-secret
OKTA_DOMAIN=https://your-domain.okta.com
OKTA_REDIRECT_URI=http://localhost:3000/api/v1/auth/sso/oauth2/okta/callback

# SAML 2.0 (Optional)
SAML_ENTRY_POINT=https://idp.example.com/saml/sso
SAML_ISSUER=knowton-platform
SAML_CALLBACK_URL=http://localhost:3000/api/v1/auth/sso/saml/default/callback
SAML_CERT=-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----
```

### 4. Start Backend Server

```bash
npm run dev
```

### 5. Test SSO Integration

```bash
npm run test:sso
# or
tsx src/scripts/test-sso-integration.ts
```

## 📋 Testing Checklist

- [ ] Database migration completed
- [ ] Environment variables configured
- [ ] Backend server running
- [ ] Can access `/api/v1/auth/sso/providers`
- [ ] OAuth2 redirect works (if configured)
- [ ] SAML metadata accessible
- [ ] Test script passes

## 🔧 Quick Test Commands

### Check Configured Providers
```bash
curl http://localhost:3000/api/v1/auth/sso/providers
```

### Test Google OAuth2 (Browser)
```
http://localhost:3000/api/v1/auth/sso/oauth2/google/authorize
```

### Get SAML Metadata
```bash
curl http://localhost:3000/api/v1/auth/sso/saml/metadata
```

## 📖 API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/sso/providers` | GET | List configured providers |
| `/api/v1/auth/sso/oauth2/:provider/authorize` | GET | Start OAuth2 flow |
| `/api/v1/auth/sso/oauth2/:provider/callback` | GET | OAuth2 callback |
| `/api/v1/auth/sso/oauth2/:provider/token` | POST | Exchange code for token |
| `/api/v1/auth/sso/saml/:provider/login` | GET | Start SAML flow |
| `/api/v1/auth/sso/saml/:provider/callback` | POST | SAML callback (ACS) |
| `/api/v1/auth/sso/saml/metadata` | GET | SAML SP metadata |
| `/api/v1/auth/sso/provision` | POST | Provision user (admin) |
| `/api/v1/auth/sso/deprovision` | POST | Deprovision user (admin) |

## 🎯 Common Use Cases

### Use Case 1: Google Sign-In

**Frontend:**
```typescript
// Redirect to Google OAuth2
window.location.href = 'http://localhost:3000/api/v1/auth/sso/oauth2/google/authorize'
```

**Backend handles:**
1. Redirects to Google
2. User authenticates
3. Google redirects back with code
4. Backend exchanges code for token
5. Backend creates/updates user
6. Backend sets JWT cookie
7. Redirects to frontend dashboard

### Use Case 2: Microsoft Sign-In

**Frontend:**
```typescript
// Redirect to Microsoft OAuth2
window.location.href = 'http://localhost:3000/api/v1/auth/sso/oauth2/microsoft/authorize'
```

**Flow:** Same as Google

### Use Case 3: SAML Enterprise Login

**Frontend:**
```typescript
// Redirect to SAML IdP
window.location.href = 'http://localhost:3000/api/v1/auth/sso/saml/default/login'
```

**Backend handles:**
1. Generates SAML request
2. Redirects to IdP
3. User authenticates at IdP
4. IdP posts SAML response back
5. Backend validates response
6. Backend creates/updates user
7. Backend sets JWT cookie
8. Redirects to frontend dashboard

## 🔐 Security Notes

- **Production:** Always use HTTPS
- **Cookies:** JWT stored in httpOnly cookie
- **State:** OAuth2 uses state parameter for CSRF protection
- **Validation:** SAML responses should be signed
- **Expiry:** JWT tokens expire after 7 days

## 📚 Next Steps

1. **Read full documentation:** `SSO_INTEGRATION.md`
2. **Configure providers:** Set up Google/Microsoft/Okta
3. **Test authentication:** Use test script
4. **Implement frontend:** Add SSO buttons to login page
5. **Monitor logs:** Check for authentication events

## 🐛 Troubleshooting

**Problem:** "Provider not configured"
- **Solution:** Check environment variables are set

**Problem:** "Invalid redirect URI"
- **Solution:** Add redirect URI to provider's allowed list

**Problem:** "Email not provided"
- **Solution:** Ensure email scope is requested from provider

**Problem:** Database error
- **Solution:** Run `npx prisma migrate dev`

## 📞 Support

- Documentation: `packages/backend/docs/SSO_INTEGRATION.md`
- Test Script: `packages/backend/src/scripts/test-sso-integration.ts`
- Service: `packages/backend/src/services/sso.service.ts`
- Routes: `packages/backend/src/routes/sso.routes.ts`
