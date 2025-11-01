# Email Authentication API Reference

Quick reference for frontend integration.

## Base URL
```
http://localhost:3000/api/v1/auth
```

## Endpoints

### 1. Register with Email

```http
POST /email/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "username": "myusername" // optional
}
```

**Response (201)**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "myusername",
    "role": "user",
    "isEmailVerified": false
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Errors**:
- `400` - Invalid email format, weak password, duplicate email

---

### 2. Verify Email

```http
POST /email/verify
Content-Type: application/json

{
  "token": "verification_token_from_email"
}
```

**Response (200)**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "myusername",
    "role": "user",
    "isEmailVerified": true
  },
  "token": "jwt_token_here"
}
```

**Note**: JWT token is also set in HttpOnly cookie `auth_token`

---

### 3. Login with Email

```http
POST /email/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "myusername",
    "walletAddress": "0x..." // if linked
    "role": "user",
    "isEmailVerified": true
  },
  "token": "jwt_token_here"
}
```

---

### 4. Request Password Reset

```http
POST /password/reset-request
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200)**:
```json
{
  "message": "If the email exists, a reset link has been sent."
}
```

**Note**: Always returns success to prevent email enumeration

---

### 5. Reset Password

```http
POST /password/reset
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123"
}
```

**Response (200)**:
```json
{
  "message": "Password reset successful"
}
```

---

### 6. Resend Verification Email

```http
POST /email/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200)**:
```json
{
  "message": "Verification email sent"
}
```

---

### 7. Link Wallet to Email Account

```http
POST /wallet/link
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "walletAddress": "0x..."
}
```

**Response (200)**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "myusername",
    "walletAddress": "0x...",
    "role": "user"
  }
}
```

---

### 8. Get Current User

```http
GET /me
Authorization: Bearer {jwt_token}
```

**Response (200)**:
```json
{
  "user": {
    "address": "0x...",
    "walletType": "metamask",
    "role": "user"
  }
}
```

---

### 9. Logout

```http
POST /logout
```

**Response (200)**:
```json
{
  "success": true
}
```

**Note**: Clears the `auth_token` cookie

---

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)

## Email Verification Flow

1. User registers → receives verification email
2. User clicks link in email → redirected to `/verify-email?token=xxx`
3. Frontend extracts token and calls `/email/verify`
4. User is logged in with JWT token

## Password Reset Flow

1. User requests reset → receives reset email
2. User clicks link in email → redirected to `/reset-password?token=xxx`
3. Frontend shows password form
4. Frontend submits new password with token to `/password/reset`
5. User can now login with new password

## Authentication

After login/verification, use the JWT token in one of two ways:

1. **Cookie** (automatic): Token is set in HttpOnly cookie
2. **Header**: `Authorization: Bearer {token}`

## Error Responses

All errors return:
```json
{
  "error": "Error message here"
}
```

Common status codes:
- `400` - Bad request (validation error)
- `401` - Unauthorized (invalid credentials/token)
- `500` - Server error

## Frontend Integration Example

```typescript
// Register
async function register(email: string, password: string, username?: string) {
  const response = await fetch('/api/v1/auth/email/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username })
  });
  return response.json();
}

// Verify Email
async function verifyEmail(token: string) {
  const response = await fetch('/api/v1/auth/email/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Important for cookies
    body: JSON.stringify({ token })
  });
  return response.json();
}

// Login
async function login(email: string, password: string) {
  const response = await fetch('/api/v1/auth/email/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });
  return response.json();
}

// Request Password Reset
async function requestPasswordReset(email: string) {
  const response = await fetch('/api/v1/auth/password/reset-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
}

// Reset Password
async function resetPassword(token: string, password: string) {
  const response = await fetch('/api/v1/auth/password/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password })
  });
  return response.json();
}
```

## React Hook Example

```typescript
import { useState } from 'react';

export function useEmailAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (email: string, password: string, username?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/auth/email/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/auth/email/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { register, login, loading, error };
}
```

## Testing

Use these test credentials (after setting up test database):

```javascript
// Valid registration
{
  "email": "test@example.com",
  "password": "TestPass123",
  "username": "testuser"
}

// Invalid password (too short)
{
  "email": "test@example.com",
  "password": "short"
}

// Invalid email
{
  "email": "not-an-email",
  "password": "TestPass123"
}
```
