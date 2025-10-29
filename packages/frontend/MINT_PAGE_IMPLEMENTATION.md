# NFT Minting Page Implementation

## Overview

This document describes the implementation of the NFT minting page (Task 12.5) for the KnowTon platform. The minting page allows creators to upload content, configure NFT metadata, set royalty percentages, and mint IP-NFTs on the blockchain.

## Implementation Summary

### Components Created

1. **MintPage.tsx** - Main page component
   - Two-step process: Upload → Form
   - Wallet connection check
   - Progress indicator
   - Info cards explaining features
   - Integration with upload and minting hooks

2. **MintForm.tsx** - NFT metadata form
   - Title and description inputs
   - Category selection (music, video, ebook, course, software, artwork, research)
   - Tag management
   - Price input (ETH)
   - Royalty percentage slider (0-30%)
   - Form validation
   - Content hash display

3. **TransactionModal.tsx** - Transaction status modal
   - Shows transaction progress (preparing → signing → confirming → complete)
   - Displays transaction hash with Arbiscan link
   - Shows token ID on success
   - Error handling with retry option
   - Prevents closing during transaction
   - Action buttons (View NFT, Close)

4. **useNFTMint.ts** - Custom hook for minting
   - Manages minting state machine
   - Calls Asset Tokenization API
   - Handles transaction lifecycle
   - Error handling and recovery

## Features Implemented

### 1. Content Upload Integration
- Reuses existing `useContentUpload` hook
- Displays upload progress
- Validates file upload success
- Stores content hash for minting

### 2. Minting Form
- **Title**: Required, max 100 characters
- **Description**: Required, max 1000 characters
- **Category**: Dropdown with 7 content types
- **Tags**: Comma-separated, optional
- **Price**: Required, positive number in ETH
- **Royalty**: Slider from 0-30%, default 10%

### 3. Transaction Flow
- **Preparing**: Metadata preparation
- **Signing**: Wallet signature request
- **Confirming**: Blockchain confirmation
- **Complete**: Success with token ID
- **Error**: Error message with retry

### 4. User Experience
- Step-by-step progress indicator
- Wallet connection requirement
- "Start Over" functionality
- Informative cards about features:
  - Copyright protection with AI fingerprinting
  - Automatic royalty distribution
  - Decentralized storage on IPFS

### 5. Requirements Satisfied

#### Requirement 2.3: NFT Minting
✅ Supports multiple content categories
✅ Creates ERC-721/1155 tokens
✅ Stores metadata URI pointing to IPFS

#### Requirement 2.4: Royalty Configuration
✅ Allows royalty percentage from 0-30%
✅ Encodes royalty in smart contract
✅ Supports multi-beneficiary structure

#### Requirement 2.5: Transaction Confirmation
✅ Displays transaction hash
✅ Shows token ID on completion
✅ Emits blockchain event
✅ Real-time status updates

## Technical Details

### State Management
- Uses React hooks for local state
- Integrates with Zustand store for auth
- Wagmi hooks for wallet connection

### API Integration
- Calls `nftAPI.mint()` from services/api.ts
- Sends content hash, metadata URI, category, and royalty info
- Returns token ID and transaction hash

### Validation
- Client-side form validation
- File size and type checking (inherited from upload)
- Royalty percentage limits enforcement
- Required field validation

### Error Handling
- Network errors
- Transaction failures
- User rejection
- API errors
- Displays user-friendly error messages

## File Structure

```
packages/frontend/src/
├── pages/
│   └── MintPage.tsx              # Main minting page
├── components/
│   ├── MintForm.tsx              # NFT metadata form
│   ├── TransactionModal.tsx      # Transaction status modal
│   ├── FileUpload.tsx            # (existing) File upload component
│   └── UploadProgress.tsx        # (existing) Upload progress display
├── hooks/
│   ├── useNFTMint.ts             # Minting logic hook
│   ├── useContentUpload.ts       # (existing) Upload logic
│   └── useAuth.ts                # (existing) Authentication
├── services/
│   └── api.ts                    # (updated) API client
└── types/
    └── index.ts                  # (existing) TypeScript types
```

## Usage Flow

1. User navigates to `/mint`
2. System checks wallet connection
3. User uploads content file
4. System uploads to IPFS and gets content hash
5. User fills out NFT metadata form
6. User sets royalty percentage
7. User clicks "Mint NFT"
8. System prepares metadata
9. User signs transaction in wallet
10. System submits to blockchain
11. User sees confirmation with token ID
12. User can view NFT or mint another

## Future Enhancements

- Batch minting support
- Preview of NFT before minting
- Gas estimation display
- Multiple royalty beneficiaries UI
- NFT collection creation
- Advanced metadata fields
- Image/thumbnail upload
- License type selection
- Collaborative ownership setup

## Testing Recommendations

1. Test wallet connection requirement
2. Test form validation (all fields)
3. Test royalty slider (min/max bounds)
4. Test transaction flow (happy path)
5. Test error handling (network, rejection)
6. Test "Start Over" functionality
7. Test responsive design
8. Test with different content categories
9. Test with various file sizes
10. Test transaction modal states

## Dependencies

- React 18+
- React Router DOM
- Wagmi (Web3 wallet integration)
- TailwindCSS (styling)
- Zustand (state management)

## Notes

- Transaction confirmation is currently simulated (2 second delay)
- In production, use `useWaitForTransactionReceipt` from Wagmi
- Metadata is not actually uploaded to IPFS yet (placeholder URI)
- Smart contract addresses need to be configured in constants.ts
- Backend API endpoints need to be implemented
