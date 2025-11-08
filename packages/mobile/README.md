# KnowTon Mobile App

React Native mobile application for the KnowTon platform.

## Features

- **Cross-Platform**: iOS and Android support
- **Navigation**: React Navigation with stack and tab navigators
- **State Management**: Zustand for global state
- **Data Fetching**: React Query for server state management
- **Type Safety**: Full TypeScript support
- **Wallet Integration**: WalletConnect support (to be implemented)

## Prerequisites

- Node.js >= 18
- React Native development environment setup
  - For iOS: Xcode 14+ and CocoaPods
  - For Android: Android Studio and JDK 17

## Installation

```bash
# Install dependencies
npm install

# iOS only - Install CocoaPods
cd ios && pod install && cd ..
```

## Development

### Start Metro Bundler

```bash
npm start
```

### Run on iOS

```bash
npm run ios
```

### Run on Android

```bash
npm run android
```

## Project Structure

```
src/
├── components/       # Reusable UI components
├── screens/         # Screen components
├── navigation/      # Navigation configuration
├── hooks/           # Custom React hooks
├── services/        # API and external services
├── store/           # Zustand state stores
├── utils/           # Utility functions
└── types/           # TypeScript type definitions
```

## State Management

The app uses Zustand for state management with the following stores:

- **authStore**: User authentication and session
- **contentStore**: Content data and selection
- **cartStore**: Shopping cart with persistence

## Navigation Structure

```
RootNavigator
├── Login (if not authenticated)
└── MainTabs (if authenticated)
    ├── Home
    ├── Explore
    ├── Library
    └── Profile
```

## API Configuration

The API base URL is configured in `src/services/api.ts`:
- Development: `http://localhost:3001/api/v1`
- Production: `https://api.knowton.io/api/v1`

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Linting

```bash
# Run ESLint
npm run lint

# Type check
npm run type-check
```

## Building for Production

### iOS

```bash
# Build for iOS
cd ios
xcodebuild -workspace KnowTonMobile.xcworkspace -scheme KnowTonMobile -configuration Release
```

### Android

```bash
# Build APK
cd android
./gradlew assembleRelease

# Build AAB (for Play Store)
./gradlew bundleRelease
```

## Environment Variables

Create a `.env` file in the root directory:

```env
API_BASE_URL=https://api.knowton.io
WALLET_CONNECT_PROJECT_ID=your_project_id
```

## Implementation Status

### Completed Features ✅
1. ✅ React Native setup and configuration (TASK-2.4.1)
2. ✅ Core screens (Home, Explore, Library, Profile) (TASK-2.4.2)
3. ✅ Content player for video/audio (TASK-2.4.2)
4. ✅ Purchase flow with multiple payment methods (TASK-2.4.2)
5. ✅ Wallet connection (WalletConnect) (TASK-2.4.2)
6. ✅ Offline support and download management (TASK-2.4.3)
7. ✅ Push notifications (Firebase Cloud Messaging) (TASK-2.4.4)
8. ✅ App store submission preparation (TASK-2.4.5)

### App Store Submission

Complete documentation for submitting to Apple App Store and Google Play Store is available in the `app-store/` directory:

- **Quick Start**: [APP_STORE_SUBMISSION_QUICK_START.md](./APP_STORE_SUBMISSION_QUICK_START.md)
- **iOS Guide**: [app-store/ios-submission.md](./app-store/ios-submission.md)
- **Android Guide**: [app-store/android-submission.md](./app-store/android-submission.md)
- **Submission Checklist**: [app-store/submission-checklist.md](./app-store/submission-checklist.md)
- **Asset Guide**: [app-store/assets/asset-preparation-guide.md](./app-store/assets/asset-preparation-guide.md)

#### Next Steps for Submission
1. Create app store assets (icons, screenshots)
2. Setup developer accounts (Apple, Google)
3. Publish legal documents (privacy policy, terms)
4. Create demo accounts for reviewers
5. Follow platform-specific submission guides

## Requirements

This implementation satisfies REQ-2.2 from the requirements document:
- Mobile app support for iOS and Android
- React Native with TypeScript
- Navigation and state management configured
- Ready for feature implementation

## License

Proprietary - KnowTon Platform
