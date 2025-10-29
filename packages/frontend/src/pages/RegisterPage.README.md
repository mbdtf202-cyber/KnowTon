# Creator Registration Page

## Overview

The Creator Registration Page allows users to register as creators on the KnowTon platform. This page implements the requirements from task 12.3 of the implementation plan.

## Features

### 1. Registration Form Component
- **Username**: Required field with validation (3-30 characters, alphanumeric + underscore/hyphen)
- **Bio**: Required field with validation (10-500 characters)
- **Email**: Optional field with email format validation
- **Avatar**: Optional image upload with preview (max 10MB)
- **Social Links**: Optional Twitter/X, Discord, and Website links

### 2. Avatar Upload
- Supports JPG, PNG, GIF formats
- Maximum file size: 10MB
- Real-time preview before upload
- Uploads to IPFS via Content Service API

### 3. Creator Service API Integration
- **POST /api/v1/creators/register**: Register new creator
- **POST /api/v1/creators/did**: Create decentralized identity (DID)
- **POST /api/v1/content/upload**: Upload avatar to IPFS

### 4. DID Creation Flow
The registration process follows these steps:
1. **Wallet Signature**: User signs a message to authenticate
2. **Avatar Upload**: If provided, upload to IPFS (optional)
3. **DID Creation**: Create decentralized identity via Ceramic Network
4. **Creator Registration**: Submit all data to Creator Service
5. **State Update**: Update local app state with user profile
6. **Navigation**: Redirect to profile page

## Components

### RegisterPage
Main page component that orchestrates the registration flow.

**Location**: `packages/frontend/src/pages/RegisterPage.tsx`

**Features**:
- Wallet connection check
- Progress tracking with visual feedback
- Error handling and display
- Navigation after successful registration

### CreatorRegistrationForm
Reusable form component for creator registration.

**Location**: `packages/frontend/src/components/CreatorRegistrationForm.tsx`

**Props**:
- `formData`: Current form data
- `errors`: Validation errors
- `avatarPreview`: Preview URL for avatar
- `isSubmitting`: Loading state
- `onFormDataChange`: Form data update handler
- `onAvatarChange`: Avatar file change handler
- `onSubmit`: Form submission handler
- `onCancel`: Cancel button handler
- `walletAddress`: Connected wallet address

**Exports**:
- `CreatorRegistrationForm`: Form component
- `validateCreatorForm`: Validation function
- `CreatorFormData`: TypeScript interface
- `CreatorFormErrors`: TypeScript interface

## Hooks

### useCreatorRegistration
Custom hook that encapsulates all registration logic.

**Location**: `packages/frontend/src/hooks/useCreatorRegistration.ts`

**Returns**:
- `formData`: Current form state
- `setFormData`: Form state setter
- `errors`: Validation errors
- `avatarPreview`: Avatar preview URL
- `isSubmitting`: Loading state
- `registrationProgress`: Progress tracking object
- `handleSubmit`: Async submission handler
- `handleAvatarChange`: Avatar change handler
- `resetForm`: Form reset function
- `isConnected`: Wallet connection status
- `address`: Connected wallet address

**Progress Tracking**:
```typescript
interface RegistrationProgress {
  step: 'idle' | 'signing' | 'uploading' | 'creating_did' | 'registering' | 'complete'
  progress: number  // 0-100
  message: string   // User-friendly message
}
```

## API Services

### creatorAPI
Centralized API service for creator-related operations.

**Location**: `packages/frontend/src/services/api.ts`

**Methods**:
- `register(data)`: Register new creator
- `createDID(data)`: Create decentralized identity
- `getProfile(address)`: Get creator profile
- `updateProfile(address, data)`: Update creator profile

### contentAPI
API service for content operations.

**Methods**:
- `uploadToIPFS(file)`: Upload file to IPFS
- `getMetadata(contentHash)`: Get content metadata

## Validation Rules

### Username
- Required
- 3-30 characters
- Only alphanumeric, underscore, and hyphen allowed
- Pattern: `/^[a-zA-Z0-9_-]+$/`

### Bio
- Required
- 10-500 characters
- Plain text

### Email
- Optional
- Valid email format
- Pattern: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

### Avatar
- Optional
- Image formats only (image/*)
- Maximum size: 10MB

### Social Links
- Optional
- Twitter/X: Must contain "twitter.com" or "x.com"
- Discord: Must contain "discord"
- Website: Valid URL format

## Error Handling

The registration page handles various error scenarios:

1. **Wallet Not Connected**: Shows message to connect wallet
2. **Validation Errors**: Displays field-specific error messages
3. **Upload Failures**: Shows error for avatar upload issues
4. **DID Creation Failures**: Handles Ceramic Network errors
5. **Registration Failures**: Displays backend error messages
6. **Network Errors**: Generic error handling for network issues

## User Flow

```
1. User navigates to /register
   ↓
2. Check wallet connection
   ↓ (if not connected)
   Show "Connect Wallet" message
   ↓ (if connected)
3. Display registration form
   ↓
4. User fills form and submits
   ↓
5. Validate form data
   ↓ (if invalid)
   Show validation errors
   ↓ (if valid)
6. Sign authentication message (20%)
   ↓
7. Upload avatar to IPFS (40%)
   ↓
8. Create DID via Ceramic (60%)
   ↓
9. Register creator via API (80%)
   ↓
10. Update local state (100%)
    ↓
11. Navigate to /profile
```

## Integration Points

### Requirements Mapping
This implementation satisfies requirements:
- **1.1**: Web3 wallet connection and signature verification
- **1.2**: Decentralized identity (DID) creation via Ceramic Network

### Backend Dependencies
- **Creator Service**: Must be running at `API_BASE_URL/creators`
- **Content Service**: Must be running at `API_BASE_URL/content`
- **IPFS Gateway**: For avatar storage
- **Ceramic Network**: For DID creation

### State Management
- Uses Zustand store (`useAppStore`) for global user state
- Persists user data across sessions
- Updates on successful registration

## Testing Considerations

### Unit Tests
- Form validation logic
- Error handling
- State management

### Integration Tests
- API service calls
- Form submission flow
- Navigation after registration

### E2E Tests
- Complete registration flow
- Wallet connection
- Avatar upload
- DID creation
- Profile navigation

## Future Enhancements

1. **Email Verification**: Add email verification flow
2. **Profile Preview**: Show preview before submission
3. **Multi-step Form**: Break into multiple steps for better UX
4. **Social Verification**: Verify social media accounts
5. **Avatar Cropping**: Add image cropping tool
6. **Draft Saving**: Save form progress locally
7. **Username Availability**: Check username availability in real-time
8. **Rich Text Bio**: Support markdown in bio field
