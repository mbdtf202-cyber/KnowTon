# Multi-Wallet Support Implementation

## Overview
This document describes the implementation of multi-wallet support for the KnowTon platform, allowing users to connect using MetaMask, WalletConnect, Coinbase Wallet, and other Web3 wallets.

## Implementation Details

### Backend Components

#### 1. Authentication Service (`packages/backend/src/services/auth.service.ts`)
- Handles wallet signature verification using ethers.js
- Generates JWT tokens for authenticated users
- Supports multiple wallet types (MetaMask, WalletConnect, Coinbase)
- Implements nonce-based authentication for security
- Token refresh mechanism

Key Methods:
- `authenticateWallet()`: Verifies wallet signature and issues JWT
- `generateNonce()`: Creates unique message for signing
- `verifyToken()`: Validates JWT tokens
- `refreshToken()`: Refreshes expired tokens

#### 2. Authentication Routes (`packages/backend/src/routes/auth.routes.ts`)
RESTful API endpoints for authentication:
- `POST /api/v1/auth/wallet/nonce`: Generate nonce for signing
- `POST /api/v1/auth/wallet/verify`: Verify signature and get token
- `POST /api/v1/auth/refresh`: Refresh JWT token
- `POST /api/v1/auth/logout`: Logout user
- `GET /api/v1/auth/me`: Get current user info

### Frontend Components

#### 1. Enhanced Wagmi Configuration (`packages/frontend/src/config/wagmi.ts`)
- Uses RainbowKit's `getDefaultConfig` for multi-wallet support
- Configured for Arbitrum, Arbitrum Goerli, Mainnet, and Sepolia
- Automatic wallet detection and connection

#### 2. Enhanced useAuth Hook (`packages/frontend/src/hooks/useAuth.ts`)
Enhanced authentication hook with:
- Automatic wallet type detection
- Backend integration for signature verification
- JWT token management
- Auto-authentication on wallet connection
- Token refresh functionality

Key Features:
- `signIn()`: Complete authentication flow with backend
- `signOut()`: Logout and disconnect wallet
- `refreshToken()`: Refresh authentication token
- `getWalletType()`: Detect connected wallet type

#### 3. Wallet Switcher Component (`packages/frontend/src/components/WalletSwitcher.tsx`)
UI component for switching between wallets:
- Shows currently connected wallet
- Lists available wallets
- One-click wallet switching
- Disconnect functionality
- Visual indicators for wallet status

### Security Features

1. **Nonce-based Authentication**
   - Each sign-in request uses a unique nonce
   - Messages expire after 5 minutes
   - Prevents replay attacks

2. **JWT Token Security**
   - HttpOnly cookies for token storage
   - 7-day expiration
   - Secure flag in production
   - SameSite strict policy

3. **Signature Verification**
   - Server-side signature verification using ethers.js
   - Address validation
   - Timestamp validation

### Supported Wallets

1. **MetaMask**
   - Browser extension
   - Mobile app
   - Most popular wallet

2. **WalletConnect**
   - Mobile wallet connection
   - QR code scanning
   - Wide wallet support

3. **Coinbase Wallet**
   - Coinbase integration
   - Easy onboarding
   - Mobile and browser

4. **Other Wallets**
   - Any wallet compatible with RainbowKit
   - Automatic detection

### User Flow

1. User clicks "Connect Wallet"
2. RainbowKit modal shows available wallets
3. User selects wallet and approves connection
4. Frontend requests nonce from backend
5. User signs message with nonce
6. Frontend sends signature to backend
7. Backend verifies signature and issues JWT
8. User is authenticated and can access protected features

### Wallet Switching Flow

1. User clicks on current wallet indicator
2. Dropdown shows available wallets
3. User selects different wallet
4. Current wallet disconnects
5. New wallet connects
6. Auto-authentication with new wallet

### Configuration

#### Environment Variables

Backend (`.env`):
```env
JWT_SECRET=your-secret-key-here
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Frontend (`.env`):
```env
VITE_API_URL=http://localhost:3001
VITE_WALLETCONNECT_PROJECT_ID=your-project-id
```

### Testing

To test multi-wallet support:

1. Start backend: `cd packages/backend && npm run dev`
2. Start frontend: `cd packages/frontend && npm run dev`
3. Open browser and navigate to `http://localhost:5173`
4. Click "Connect Wallet"
5. Try connecting with different wallets
6. Use Wallet Switcher to switch between wallets
7. Verify authentication persists across page reloads

### Future Enhancements

- [ ] Social login integration (Google, Twitter)
- [ ] Email/password authentication
- [ ] Multi-factor authentication
- [ ] Hardware wallet support
- [ ] Biometric authentication for mobile

## Dependencies

### Backend
- `jsonwebtoken`: JWT token generation and verification
- `ethers`: Ethereum signature verification
- `cookie-parser`: Cookie handling
- `express`: Web framework

### Frontend
- `wagmi`: Ethereum React hooks
- `@rainbow-me/rainbowkit`: Wallet connection UI
- `viem`: Ethereum utilities
- `axios`: HTTP client

## API Documentation

### POST /api/v1/auth/wallet/nonce
Generate a nonce for wallet authentication.

**Request:**
```json
{
  "address": "0x1234..."
}
```

**Response:**
```json
{
  "nonce": "Sign in to KnowTon\n\nAddress: 0x1234...\nTimestamp: 2025-11-02T..."
}
```

### POST /api/v1/auth/wallet/verify
Verify wallet signature and get JWT token.

**Request:**
```json
{
  "address": "0x1234...",
  "message": "Sign in to KnowTon...",
  "signature": "0xabcd...",
  "walletType": "metamask"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "address": "0x1234...",
    "walletType": "metamask",
    "role": "user"
  }
}
```

## Troubleshooting

### Issue: Wallet not connecting
- Check if wallet extension is installed
- Verify network is supported
- Check browser console for errors

### Issue: Signature verification fails
- Ensure message hasn't expired (5 min limit)
- Verify correct address is being used
- Check backend logs for detailed error

### Issue: Token not persisting
- Check cookie settings in browser
- Verify CORS configuration
- Ensure credentials: true in axios requests

## Completion Status

✅ Multi-wallet support (MetaMask, WalletConnect, Coinbase)
✅ Backend authentication service
✅ JWT token management
✅ Wallet switcher UI component
✅ Security features (nonce, signature verification)
✅ Auto-authentication on wallet connection
✅ Internationalization support

## Related Tasks

- TASK-1.1.1: Implement multi-wallet support ✅
- TASK-1.1.2: Add email registration flow (Next)
- TASK-1.1.3: Implement KYC integration (Pending)
- TASK-1.1.4: Creator qualification system (Pending)
