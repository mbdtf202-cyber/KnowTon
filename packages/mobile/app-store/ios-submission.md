# iOS App Store Submission Guide

Complete guide for submitting KnowTon mobile app to Apple App Store.

## Prerequisites

### Apple Developer Account
- [ ] Apple Developer Program membership ($99/year)
- [ ] Account holder or admin access
- [ ] Two-factor authentication enabled

### Development Environment
- [ ] Xcode 15.0 or later
- [ ] macOS Ventura or later
- [ ] Valid signing certificates
- [ ] Provisioning profiles configured

## Step 1: Prepare App ID and Certificates

### 1.1 Create App ID
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to Certificates, Identifiers & Profiles
3. Click Identifiers → App IDs → "+"
4. Configure:
   - Description: KnowTon Mobile
   - Bundle ID: `com.knowtonmobile` (Explicit)
   - Capabilities:
     - [x] Push Notifications
     - [x] In-App Purchase
     - [x] Associated Domains
     - [x] Sign in with Apple

### 1.2 Create Distribution Certificate
```bash
# Generate certificate signing request
# Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority
# Save to disk: CertificateSigningRequest.certSigningRequest

# Upload to Apple Developer Portal
# Certificates → Production → "+" → App Store and Ad Hoc
# Upload CSR and download certificate
# Double-click to install in Keychain
```

### 1.3 Create Provisioning Profile
1. Profiles → Distribution → "+"
2. Select: App Store
3. App ID: com.knowtonmobile
4. Certificate: Select your distribution certificate
5. Profile Name: KnowTon App Store
6. Download and double-click to install

## Step 2: Configure Xcode Project

### 2.1 Update Project Settings
```bash
cd packages/mobile/ios
open KnowTonMobile.xcworkspace
```

In Xcode:
1. Select project → Target: KnowTonMobile
2. General tab:
   - Display Name: KnowTon
   - Bundle Identifier: com.knowtonmobile
   - Version: 1.0.0
   - Build: 1
   - Deployment Target: 14.0

3. Signing & Capabilities:
   - Automatically manage signing: OFF
   - Team: Select your team
   - Provisioning Profile: KnowTon App Store
   - Signing Certificate: Distribution

### 2.2 Update Info.plist
Add required privacy descriptions:

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan QR codes for wallet connection</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to save content and receipts</string>

<key>NSMicrophoneUsageDescription</key>
<string>We need microphone access for audio content recording</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>We use your location to provide localized content and comply with regional regulations</string>

<key>NSUserTrackingUsageDescription</key>
<string>We use tracking to provide personalized content recommendations and improve your experience</string>
```

### 2.3 Configure App Transport Security
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>knowton.io</key>
        <dict>
            <key>NSIncludesSubdomains</key>
            <true/>
            <key>NSTemporaryExceptionAllowsInsecureHTTPLoads</key>
            <false/>
        </dict>
    </dict>
</dict>
```

## Step 3: Prepare App Assets

### 3.1 App Icon
Required sizes (all @1x, @2x, @3x):
- 20x20 pt (iPhone Notification)
- 29x29 pt (iPhone Settings)
- 40x40 pt (iPhone Spotlight)
- 60x60 pt (iPhone App)
- 1024x1024 px (App Store)

Place in: `ios/KnowTonMobile/Images.xcassets/AppIcon.appiconset/`

### 3.2 Launch Screen
Update `LaunchScreen.storyboard` with:
- KnowTon logo
- Brand colors
- Loading indicator

### 3.3 Screenshots
Required for App Store Connect:

**iPhone 6.7" (iPhone 14 Pro Max, 15 Pro Max)**
- Resolution: 1290 x 2796 pixels
- Minimum: 3 screenshots
- Recommended: 5-10 screenshots

**iPhone 6.5" (iPhone 11 Pro Max, XS Max)**
- Resolution: 1242 x 2688 pixels
- Minimum: 3 screenshots

**iPhone 5.5" (iPhone 8 Plus)**
- Resolution: 1242 x 2208 pixels
- Minimum: 3 screenshots

**iPad Pro 12.9" (6th gen)**
- Resolution: 2048 x 2732 pixels
- Minimum: 3 screenshots

Screenshot content:
1. Home screen with featured content
2. Content discovery/explore
3. Content player (video/audio)
4. Purchase/checkout flow
5. User library
6. Investment/bonds page
7. Profile/settings

## Step 4: Build and Archive

### 4.1 Clean Build
```bash
cd packages/mobile/ios
rm -rf ~/Library/Developer/Xcode/DerivedData
xcodebuild clean -workspace KnowTonMobile.xcworkspace -scheme KnowTonMobile
```

### 4.2 Archive for Distribution
In Xcode:
1. Select: Any iOS Device (arm64)
2. Product → Archive
3. Wait for archive to complete
4. Organizer window opens automatically

### 4.3 Validate Archive
1. Select archive → Distribute App
2. App Store Connect → Next
3. Upload → Next
4. Select signing options:
   - Automatically manage signing: OFF
   - Select provisioning profile
5. Click Validate
6. Fix any issues reported

### 4.4 Upload to App Store Connect
1. After validation succeeds
2. Click Distribute App
3. App Store Connect → Upload
4. Wait for upload to complete (5-30 minutes)

## Step 5: App Store Connect Configuration

### 5.1 Create App
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. My Apps → "+" → New App
3. Configure:
   - Platform: iOS
   - Name: KnowTon
   - Primary Language: English (U.S.)
   - Bundle ID: com.knowtonmobile
   - SKU: KNOWTON-IOS-001
   - User Access: Full Access

### 5.2 App Information
- **Name**: KnowTon
- **Subtitle**: Buy, Sell & Invest in IP
- **Category**: 
  - Primary: Finance
  - Secondary: Education
- **Content Rights**: Does not contain third-party content
- **Age Rating**: 12+
  - Infrequent/Mild Realistic Violence
  - Infrequent/Mild Profanity or Crude Humor

### 5.3 Pricing and Availability
- **Price**: Free
- **Availability**: All territories
- **In-App Purchases**: Yes (to be configured separately)

### 5.4 App Privacy
Configure privacy details:
1. Data Collection:
   - Contact Info (Email, Name)
   - Financial Info (Payment Info)
   - User Content (Photos, Videos, Audio)
   - Usage Data (Product Interaction)
   - Identifiers (User ID, Device ID)

2. Data Use:
   - App Functionality
   - Analytics
   - Product Personalization
   - Developer Advertising

3. Data Linking: Yes (linked to user identity)
4. Data Tracking: Yes (for personalization)

### 5.5 Version Information
- **Version**: 1.0.0
- **Copyright**: © 2025 KnowTon Platform
- **Description**: [Use full description from app-description-en.md]
- **Keywords**: IP, NFT, blockchain, content, marketplace, investment, creator, digital, crypto, education
- **Support URL**: https://knowton.io/support
- **Marketing URL**: https://knowton.io
- **Privacy Policy URL**: https://knowton.io/privacy

### 5.6 Build Selection
1. Select uploaded build (wait for processing to complete)
2. Export Compliance: No encryption or exempt

### 5.7 Screenshots and Previews
Upload screenshots for all required device sizes:
- iPhone 6.7"
- iPhone 6.5"
- iPhone 5.5"
- iPad Pro 12.9"

Optional: Upload app preview videos (15-30 seconds)

### 5.8 App Review Information
- **Contact Information**:
  - First Name: [Your Name]
  - Last Name: [Your Name]
  - Phone: [Your Phone]
  - Email: support@knowton.io

- **Demo Account** (if required):
  - Username: demo@knowton.io
  - Password: [Provide test account]
  - Notes: Test account with sample content

- **Notes**:
```
KnowTon is a blockchain-powered IP marketplace. 

Test Flow:
1. Login with demo account
2. Browse content in Explore tab
3. View content details
4. Test purchase flow (use test payment)
5. Access purchased content in Library
6. Test offline download
7. View investment opportunities in Bonds section

Note: Crypto wallet features are optional and not required for core functionality.
```

## Step 6: Submit for Review

### 6.1 Final Checklist
- [ ] All metadata completed
- [ ] Screenshots uploaded (all sizes)
- [ ] Build selected and processed
- [ ] Privacy policy accessible
- [ ] Terms of service accessible
- [ ] Demo account provided
- [ ] App review notes added
- [ ] Export compliance configured

### 6.2 Submit
1. Click "Add for Review"
2. Review all information
3. Click "Submit for Review"
4. Wait for confirmation email

## Step 7: Review Process

### 7.1 Timeline
- **In Review**: 24-48 hours typically
- **Processing**: Additional 24 hours after approval
- **Ready for Sale**: Automatic after processing

### 7.2 Possible Outcomes
- **Approved**: App goes live automatically
- **Rejected**: Review rejection reasons and resubmit
- **Metadata Rejected**: Fix metadata issues only
- **Developer Rejected**: You can reject and resubmit

### 7.3 Common Rejection Reasons
1. **Incomplete Information**: Missing privacy policy or demo account
2. **Crashes**: App crashes during review
3. **Broken Features**: Features don't work as described
4. **Privacy Issues**: Missing privacy descriptions
5. **Guideline Violations**: Violates App Store guidelines

## Step 8: Post-Approval

### 8.1 Monitor Release
- Check App Store for live status
- Test download and installation
- Monitor crash reports
- Check user reviews

### 8.2 Prepare for Updates
- Set up TestFlight for beta testing
- Plan update schedule
- Monitor analytics
- Respond to user feedback

## Troubleshooting

### Build Upload Fails
```bash
# Clear derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Clean build folder
xcodebuild clean -workspace KnowTonMobile.xcworkspace -scheme KnowTonMobile

# Verify signing
codesign -dv --verbose=4 path/to/app

# Check provisioning profile
security find-identity -v -p codesigning
```

### Archive Not Showing
- Ensure "Generic iOS Device" is selected
- Check deployment target matches
- Verify signing configuration
- Clean and rebuild

### Validation Errors
- Check bundle identifier matches
- Verify provisioning profile is valid
- Ensure all capabilities are enabled
- Check for missing frameworks

## Resources

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)

## Support

For submission issues:
- Email: dev-support@knowton.io
- Slack: #mobile-releases
- Documentation: https://docs.knowton.io/mobile/ios-submission
