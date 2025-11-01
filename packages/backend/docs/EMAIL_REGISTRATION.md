# Email Registration Flow

## Overview

The email registration flow allows users to register and authenticate using traditional email/password credentials, providing an alternative to wallet-based authentication for Web2 users.

## Features Implemented

### 1. Email/Password Registration API

**Endpoint**: `POST /api/v1/auth/email/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "username": "optional_username"
}
```

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "optional_username",
    "role": "user",
    "isEmailVerified": false
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**Email Validation**:
- Valid email format (RFC 5322)
- Unique email address (no duplicates)

### 2. Email Verification

**Endpoint**: `POST /api/v1/auth/email/verify`

**Request Body**:
```json
{
  "token": "verification_token_from_email"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "optional_username",
    "role": "user",
    "isEmailVerified": true
  },
  "token": "jwt_token"
}
```

**Verification Email**:
- Sent automatically upon registration
- Contains verification link: `{FRONTEND_URL}/verify-email?token={token}`
- Token expires in 24 hours
- Beautiful HTML template with branding

**Resend Verification**:

**Endpoint**: `POST /api/v1/auth/email/resend-verification`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

### 3. Email/Password Login

**Endpoint**: `POST /api/v1/auth/email/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "optional_username",
    "walletAddress": "0x...",
    "role": "user",
    "isEmailVerified": true
  },
  "token": "jwt_token"
}
```

**Features**:
- Secure password comparison using bcrypt
- JWT token generation (7-day expiry)
- HttpOnly cookie for token storage
- Last login timestamp tracking
- Account status validation

### 4. Password Reset Flow

#### Request Password Reset

**Endpoint**: `POST /api/v1/auth/password/reset-request`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "message": "If the email exists, a reset link has been sent."
}
```

**Features**:
- Generates secure reset token (32 bytes)
- Token expires in 1 hour
- Sends password reset email
- Does not reveal if email exists (security)

**Reset Email**:
- Contains reset link: `{FRONTEND_URL}/reset-password?token={token}`
- Beautiful HTML template
- Clear expiration notice

#### Reset Password

**Endpoint**: `POST /api/v1/auth/password/reset`

**Request Body**:
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePassword123"
}
```

**Response**:
```json
{
  "message": "Password reset successful"
}
```

**Features**:
- Validates reset token
- Checks token expiration
- Enforces password requirements
- Hashes new password with bcrypt
- Clears reset token after use

### 5. Link Wallet to Email Account

**Endpoint**: `POST /api/v1/auth/wallet/link`

**Headers**:
```
Authorization: Bearer {jwt_token}
```

**Request Body**:
```json
{
  "walletAddress": "0x..."
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "optional_username",
    "walletAddress": "0x...",
    "role": "user"
  }
}
```

**Features**:
- Links wallet address to existing email account
- Validates wallet is not already linked to another account
- Enables hybrid Web2/Web3 authentication

## Database Schema

The User model includes the following fields for email authentication:

```prisma
model User {
  id                String    @id @default(uuid())
  email             String?   @unique
  password          String?
  username          String?   @unique
  isEmailVerified   Boolean   @default(false)
  emailVerifyToken  String?   @unique
  emailVerifyExpiry DateTime?
  resetToken        String?   @unique
  resetTokenExpiry  DateTime?
  walletAddress     String?   @unique
  role              String    @default("user")
  isActive          Boolean   @default(true)
  lastLoginAt       DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

## Security Features

### Password Security
- Bcrypt hashing with 12 salt rounds
- Strong password requirements enforced
- No password stored in plain text

### Token Security
- Cryptographically secure random tokens (32 bytes)
- Time-limited tokens (24h for verification, 1h for reset)
- Tokens cleared after use
- JWT tokens with 7-day expiry

### Email Security
- Email format validation
- Duplicate email prevention
- Rate limiting on endpoints (recommended)
- Does not reveal user existence on password reset

### Session Security
- HttpOnly cookies for JWT storage
- Secure flag in production
- SameSite strict policy
- 7-day session expiry

## Email Templates

### Verification Email
- Professional HTML design
- Clear call-to-action button
- Fallback text link
- Expiration notice
- Branding consistent with platform

### Password Reset Email
- Security-focused messaging
- Clear reset button
- Expiration notice
- Warning about unsolicited requests

### Welcome Email
- Sent after successful verification
- Platform feature highlights
- Getting started guidance
- Support contact information

## Email Service Configuration

Required environment variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@knowton.io
FRONTEND_URL=http://localhost:5173
```

**Supported SMTP Providers**:
- Gmail (with App Password)
- SendGrid
- AWS SES
- Mailgun
- Any SMTP-compatible service

## Testing

Comprehensive test suite included:

```bash
npm test -- email-auth.test.ts
```

**Test Coverage**:
- ✅ User registration with email/password
- ✅ Email format validation
- ✅ Password strength validation
- ✅ Duplicate email prevention
- ✅ Email verification with token
- ✅ Invalid token handling
- ✅ Email/password authentication
- ✅ Wrong password rejection
- ✅ Password reset request
- ✅ Password reset with token
- ✅ Token expiration handling

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK` - Successful operation
- `201 Created` - User registered successfully
- `400 Bad Request` - Invalid input or validation error
- `401 Unauthorized` - Authentication failed
- `500 Internal Server Error` - Server error

Error responses include descriptive messages:

```json
{
  "error": "Email already registered"
}
```

## Integration with Existing System

The email registration flow integrates seamlessly with:

1. **Wallet Authentication**: Users can link wallet addresses to email accounts
2. **KYC System**: Email-verified users can proceed with KYC verification
3. **Creator Registration**: Email users can become creators
4. **Content Access**: Email authentication provides same access as wallet auth
5. **Analytics**: User activity tracked regardless of auth method

## Future Enhancements

Potential improvements:

- [ ] Two-factor authentication (2FA)
- [ ] Social login (Google, GitHub, etc.)
- [ ] Email change flow
- [ ] Account deletion flow
- [ ] Session management dashboard
- [ ] Login history tracking
- [ ] Suspicious activity detection
- [ ] Email notification preferences

## API Usage Examples

### Complete Registration Flow

```javascript
// 1. Register
const registerResponse = await fetch('/api/v1/auth/email/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123',
    username: 'myusername'
  })
});

// 2. User receives email and clicks verification link
// Frontend extracts token from URL and verifies

const verifyResponse = await fetch('/api/v1/auth/email/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: tokenFromUrl
  })
});

const { token, user } = await verifyResponse.json();

// 3. User is now logged in with JWT token
// Store token for subsequent requests
```

### Login Flow

```javascript
const loginResponse = await fetch('/api/v1/auth/email/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Include cookies
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123'
  })
});

const { token, user } = await loginResponse.json();
```

### Password Reset Flow

```javascript
// 1. Request reset
await fetch('/api/v1/auth/password/reset-request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com'
  })
});

// 2. User receives email and clicks reset link
// Frontend extracts token from URL

// 3. Submit new password
await fetch('/api/v1/auth/password/reset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: tokenFromUrl,
    password: 'NewSecurePassword123'
  })
});
```

## Monitoring and Logging

All authentication events are logged:

- Registration attempts
- Email verification
- Login attempts (success/failure)
- Password reset requests
- Token expiration
- Account linking

Logs include:
- Timestamp
- User identifier (email/ID)
- IP address
- User agent
- Action result

## Compliance

The implementation follows security best practices:

- ✅ OWASP Authentication Guidelines
- ✅ GDPR compliance (user data protection)
- ✅ Password hashing standards (bcrypt)
- ✅ Secure token generation
- ✅ Rate limiting ready
- ✅ Audit logging

## Support

For issues or questions:
- Check test suite for usage examples
- Review error messages for debugging
- Consult API documentation
- Contact development team
