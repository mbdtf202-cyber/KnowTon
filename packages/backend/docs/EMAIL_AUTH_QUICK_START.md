# Email Authentication - Quick Start Guide

Get the email authentication system up and running in 5 minutes.

## Prerequisites

- PostgreSQL database running
- Node.js and npm installed
- SMTP credentials (Gmail, SendGrid, etc.)

## Step 1: Configure Environment Variables

Create or update `packages/backend/.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/knowton

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this

# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@knowton.io

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173

# Node Environment
NODE_ENV=development
```

### Getting Gmail App Password

1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security → App Passwords
4. Generate new app password for "Mail"
5. Use this password in `SMTP_PASS`

## Step 2: Run Database Migrations

```bash
cd packages/backend
npx prisma migrate dev
npx prisma generate
```

## Step 3: Start the Backend Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

## Step 4: Test the API

### Test Registration

```bash
curl -X POST http://localhost:3000/api/v1/auth/email/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "username": "testuser"
  }'
```

**Expected Response**:
```json
{
  "user": {
    "id": "...",
    "email": "test@example.com",
    "username": "testuser",
    "role": "user",
    "isEmailVerified": false
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

### Check Your Email

You should receive a verification email with a link like:
```
http://localhost:5173/verify-email?token=abc123...
```

### Test Email Verification

Extract the token from the email and verify:

```bash
curl -X POST http://localhost:3000/api/v1/auth/email/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-token-from-email"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "test@example.com",
    "username": "testuser",
    "role": "user",
    "isEmailVerified": true
  },
  "token": "jwt-token-here"
}
```

### Test Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "test@example.com",
    "username": "testuser",
    "role": "user",
    "isEmailVerified": true
  },
  "token": "jwt-token-here"
}
```

## Step 5: Test Password Reset

### Request Reset

```bash
curl -X POST http://localhost:3000/api/v1/auth/password/reset-request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

### Check Email and Reset

Extract token from reset email and reset password:

```bash
curl -X POST http://localhost:3000/api/v1/auth/password/reset \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset-token-from-email",
    "password": "NewTestPass456"
  }'
```

### Login with New Password

```bash
curl -X POST http://localhost:3000/api/v1/auth/email/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "NewTestPass456"
  }'
```

## Common Issues

### Issue: "Failed to send email"

**Solution**: Check SMTP credentials in `.env` file. For Gmail, ensure:
- 2FA is enabled
- Using App Password (not regular password)
- "Less secure app access" is NOT needed with App Password

### Issue: "User `test` was denied access on the database"

**Solution**: Update database URL in `.env` with correct credentials:
```env
DATABASE_URL=postgresql://your-username@localhost:5432/knowton
```

### Issue: "Invalid token"

**Solution**: Tokens expire. Verification tokens expire in 24 hours, reset tokens in 1 hour. Request a new one.

### Issue: "Email already registered"

**Solution**: Email is already in use. Either:
- Use a different email
- Delete the user from database: `DELETE FROM users WHERE email = 'test@example.com';`

## Running Tests

```bash
# Set up test database
createdb knowton_test

# Update test database URL
export TEST_DATABASE_URL=postgresql://user@localhost:5432/knowton_test

# Run migrations on test database
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate dev

# Run tests
npm test -- email-auth.test.ts
```

## Frontend Integration

See `EMAIL_AUTH_API_REFERENCE.md` for complete API documentation and React examples.

### Basic React Component Example

```tsx
import { useState } from 'react';

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/v1/auth/email/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message);
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      setMessage('Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Register</button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

## Next Steps

1. **Frontend Pages**: Create UI for:
   - Registration form
   - Login form
   - Email verification page
   - Password reset request form
   - Password reset form

2. **Security Enhancements**:
   - Add rate limiting
   - Implement CAPTCHA
   - Add 2FA support

3. **User Experience**:
   - Add loading states
   - Improve error messages
   - Add success animations

4. **Monitoring**:
   - Set up logging
   - Track authentication metrics
   - Monitor email delivery

## Documentation

- **Full Documentation**: `EMAIL_REGISTRATION.md`
- **API Reference**: `EMAIL_AUTH_API_REFERENCE.md`
- **Implementation Summary**: `EMAIL_REGISTRATION_IMPLEMENTATION_SUMMARY.md`

## Support

For issues or questions:
1. Check the documentation files
2. Review test files for examples
3. Check server logs for errors
4. Verify environment variables

## Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a secure random string
- [ ] Use production SMTP service (SendGrid, AWS SES, etc.)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS (secure cookies)
- [ ] Set up proper database backups
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerts
- [ ] Review and test all email templates
- [ ] Test password reset flow end-to-end
- [ ] Verify email deliverability
- [ ] Set up proper error logging

## Success! 🎉

You now have a fully functional email authentication system with:
- ✅ User registration
- ✅ Email verification
- ✅ Password reset
- ✅ Secure authentication
- ✅ JWT tokens
- ✅ Email notifications

Start building your frontend integration!
