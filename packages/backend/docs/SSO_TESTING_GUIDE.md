# SSO Testing Guide

## Prerequisites

Before testing SSO integration, ensure:

1. **Backend server is running:**
   ```bash
   cd packages/backend
   npm run dev
   ```

2. **Database is migrated:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

3. **Environment variables are configured** (optional for basic testing):
   - At minimum, set `FRONTEND_URL` in `.env`
   - For full testing, configure OAuth2/SAML providers

## Running Tests

### Option 1: With Backend Server Running

1. Start backend server in one terminal:
   ```bash
   cd packages/backend
   npm run dev
   ```

2. Run tests in another terminal:
   ```bash
   cd packages/backend
   npx tsx src/scripts/test-sso-integration.ts
   ```

### Option 2: Manual API Testing

With backend server running, test endpoints manually:

```bash
# Get configured providers
curl http://localhost:3000/api/v1/auth/sso/providers

# Get SAML metadata
curl http://localhost:3000/api/v1/auth/sso/saml/metadata

# Test OAuth2 redirect (in browser)
http://localhost:3000/api/v1/auth/sso/oauth2/google/authorize
```

## Expected Test Results

### Without Provider Configuration

Most tests will be **SKIPPED** because providers are not configured:

```
✅ Get SSO Providers - PASS
⏭️  OAuth2 Google Authorization - SKIP (Provider not configured)
⏭️  OAuth2 Microsoft Authorization - SKIP (Provider not configured)
⏭️  OAuth2 Okta Authorization - SKIP (Provider not configured)
⏭️  SAML Login - SKIP (Provider not configured)
✅ SAML Metadata - PASS
⏭️  Provision User - SKIP (Requires admin auth)
✅ Invalid Provider Rejection - PASS
```

### With Provider Configuration

If you configure providers in `.env`, those tests will **PASS**:

```
✅ Get SSO Providers - PASS
✅ OAuth2 Google Authorization - PASS (redirects to Google)
✅ OAuth2 Microsoft Authorization - PASS (redirects to Microsoft)
✅ OAuth2 Okta Authorization - PASS (redirects to Okta)
✅ SAML Login - PASS (redirects to IdP)
✅ SAML Metadata - PASS
⏭️  Provision User - SKIP (Requires admin auth)
✅ Invalid Provider Rejection - PASS
```

## Manual Testing Workflow

### Test OAuth2 Flow (Google Example)

1. **Configure Google OAuth2** in `.env`:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/sso/oauth2/google/callback
   ```

2. **Start backend server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   ```
   http://localhost:3000/api/v1/auth/sso/oauth2/google/authorize
   ```

4. **Expected behavior:**
   - Redirects to Google login page
   - After login, redirects back to callback URL
   - Creates/updates user in database
   - Sets JWT cookie
   - Redirects to frontend

### Test SAML Flow

1. **Configure SAML** in `.env`:
   ```bash
   SAML_ENTRY_POINT=https://idp.example.com/saml/sso
   SAML_ISSUER=knowton-platform
   SAML_CALLBACK_URL=http://localhost:3000/api/v1/auth/sso/saml/default/callback
   SAML_CERT=-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----
   ```

2. **Start backend server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   ```
   http://localhost:3000/api/v1/auth/sso/saml/default/login
   ```

4. **Expected behavior:**
   - Redirects to IdP with SAML request
   - After login, IdP posts SAML response back
   - Creates/updates user in database
   - Sets JWT cookie
   - Redirects to frontend

## Troubleshooting

### Tests Fail with "Error"

**Cause:** Backend server is not running

**Solution:**
```bash
# Start backend server
cd packages/backend
npm run dev
```

### Tests Fail with "ECONNREFUSED"

**Cause:** Backend server is not accessible

**Solution:**
- Check if server is running on port 3000
- Check if `API_BASE_URL` is correct
- Try: `curl http://localhost:3000/health`

### Provider Tests Skip

**Cause:** Provider not configured in `.env`

**Solution:**
- This is expected behavior
- Configure provider credentials to enable tests
- Or ignore skipped tests (they're optional)

### "Invalid redirect URI" Error

**Cause:** Redirect URI not added to provider's allowed list

**Solution:**
- Add redirect URI to provider console
- Ensure URI matches exactly (including protocol and port)

## Verification Checklist

After implementation, verify:

- [ ] Database migration completed successfully
- [ ] Prisma client generated
- [ ] No TypeScript errors in SSO files
- [ ] Backend server starts without errors
- [ ] `/api/v1/auth/sso/providers` endpoint accessible
- [ ] `/api/v1/auth/sso/saml/metadata` returns XML
- [ ] OAuth2 authorize endpoints redirect (if configured)
- [ ] SAML login endpoint redirects (if configured)
- [ ] Test script runs without crashes

## Production Testing

Before deploying to production:

1. **Configure all providers** with production credentials
2. **Use HTTPS** for all redirect URIs
3. **Test each provider** end-to-end
4. **Verify user creation** in database
5. **Check JWT token** is set correctly
6. **Test user login** with existing account
7. **Test provisioning/deprovisioning** APIs
8. **Monitor logs** for errors
9. **Test error handling** (invalid codes, expired tokens)
10. **Verify security** (state parameter, HTTPS, cookies)

## Success Criteria

Implementation is successful when:

- ✅ All configured providers work end-to-end
- ✅ Users can authenticate via SSO
- ✅ New users are created automatically
- ✅ Existing users can log in
- ✅ JWT tokens are generated correctly
- ✅ Cookies are set securely
- ✅ Redirects work properly
- ✅ Error handling works
- ✅ Documentation is complete
- ✅ Tests pass (or skip appropriately)

## Next Steps

After successful testing:

1. **Deploy to staging** environment
2. **Configure production** providers
3. **Test with real users**
4. **Monitor authentication** metrics
5. **Implement frontend** SSO buttons
6. **Add admin dashboard** for provisioning
7. **Set up monitoring** and alerts
8. **Document provider setup** for ops team
