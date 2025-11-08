# Android Google Play Store Submission Guide

Complete guide for submitting KnowTon mobile app to Google Play Store.

## Prerequisites

### Google Play Console Account
- [ ] Google Play Developer account ($25 one-time fee)
- [ ] Account verified and active
- [ ] Payment profile configured

### Development Environment
- [ ] Android Studio Arctic Fox or later
- [ ] JDK 17
- [ ] Android SDK 33 or later
- [ ] Gradle 8.0 or later

## Step 1: Generate Signing Key

### 1.1 Create Upload Key
```bash
cd packages/mobile/android/app

# Generate keystore
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore knowton-upload-key.keystore \
  -alias knowton-upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Enter information when prompted:
# Password: [Create strong password - save securely]
# First and Last Name: KnowTon Platform
# Organizational Unit: Mobile Development
# Organization: KnowTon Inc.
# City: [Your City]
# State: [Your State]
# Country Code: US
```

**IMPORTANT**: Store keystore file and password securely!
- Never commit to version control
- Store in secure password manager
- Keep backup in secure location

### 1.2 Configure Gradle Signing
Create `android/gradle.properties` (add to .gitignore):

```properties
KNOWTON_UPLOAD_STORE_FILE=knowton-upload-key.keystore
KNOWTON_UPLOAD_KEY_ALIAS=knowton-upload
KNOWTON_UPLOAD_STORE_PASSWORD=your_store_password
KNOWTON_UPLOAD_KEY_PASSWORD=your_key_password
```

Update `android/app/build.gradle`:

```groovy
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('KNOWTON_UPLOAD_STORE_FILE')) {
                storeFile file(KNOWTON_UPLOAD_STORE_FILE)
                storePassword KNOWTON_UPLOAD_STORE_PASSWORD
                keyAlias KNOWTON_UPLOAD_KEY_ALIAS
                keyPassword KNOWTON_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Step 2: Configure App for Release

### 2.1 Update build.gradle
```groovy
android {
    namespace "com.knowtonmobile"
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "com.knowtonmobile"
        minSdkVersion 29  // Android 10
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
        
        // Enable multidex
        multiDexEnabled true
        
        // Vector drawables support
        vectorDrawables.useSupportLibrary = true
    }
    
    buildFeatures {
        buildConfig true
    }
    
    bundle {
        language {
            enableSplit = true
        }
        density {
            enableSplit = true
        }
        abi {
            enableSplit = true
        }
    }
}
```

### 2.2 Update AndroidManifest.xml
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" 
                     android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
                     android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <!-- Hardware features (optional) -->
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    
    <application
        android:name=".MainApplication"
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:allowBackup="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="false"
        android:networkSecurityConfig="@xml/network_security_config">
        
        <!-- Activities -->
        <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="keyboard|keyboardHidden|orientation|screenSize|uiMode"
            android:launchMode="singleTask"
            android:windowSoftInputMode="adjustResize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            
            <!-- Deep linking -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" 
                      android:host="knowton.io" />
            </intent-filter>
        </activity>
        
        <!-- Firebase Messaging -->
        <service
            android:name=".MessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
    </application>
</manifest>
```

### 2.3 ProGuard Rules
Update `android/app/proguard-rules.pro`:

```proguard
# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Ethers.js / Web3
-keep class org.web3j.** { *; }
-dontwarn org.web3j.**

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep custom exceptions
-keep public class * extends java.lang.Exception
```

## Step 3: Prepare App Assets

### 3.1 App Icon
Generate launcher icons for all densities:

**Required sizes:**
- mdpi: 48x48 px
- hdpi: 72x72 px
- xhdpi: 96x96 px
- xxhdpi: 144x144 px
- xxxhdpi: 192x192 px

**Adaptive icon (Android 8.0+):**
- Foreground: 108x108 dp (432x432 px @xxxhdpi)
- Background: 108x108 dp (432x432 px @xxxhdpi)

Place in: `android/app/src/main/res/mipmap-*/`

### 3.2 Feature Graphic
- Size: 1024 x 500 px
- Format: PNG or JPEG
- No transparency
- Showcases app branding

### 3.3 Screenshots
Required for Google Play Console:

**Phone Screenshots**
- Minimum: 2 screenshots
- Recommended: 4-8 screenshots
- Size: 16:9 or 9:16 aspect ratio
- Minimum dimension: 320 px
- Maximum dimension: 3840 px

**7-inch Tablet Screenshots** (optional but recommended)
- Size: 1024 x 600 px or higher

**10-inch Tablet Screenshots** (optional but recommended)
- Size: 1920 x 1200 px or higher

Screenshot content:
1. Home screen with featured content
2. Content discovery/explore
3. Content player (video/audio)
4. Purchase/checkout flow
5. User library
6. Investment/bonds page
7. Profile/settings
8. Offline mode

### 3.4 Promotional Video (optional)
- YouTube video URL
- 30 seconds to 2 minutes
- Showcases key features

## Step 4: Build Release Bundle

### 4.1 Clean Build
```bash
cd packages/mobile/android

# Clean previous builds
./gradlew clean

# Clear gradle cache (if needed)
rm -rf ~/.gradle/caches/
```

### 4.2 Build AAB (Android App Bundle)
```bash
# Build release bundle
./gradlew bundleRelease

# Output location:
# android/app/build/outputs/bundle/release/app-release.aab
```

### 4.3 Verify Bundle
```bash
# Check bundle contents
bundletool build-apks \
  --bundle=app/build/outputs/bundle/release/app-release.aab \
  --output=knowton.apks \
  --mode=universal

# Extract and inspect
unzip knowton.apks -d knowton_apks
```

### 4.4 Test Release Build
```bash
# Install on device
bundletool install-apks --apks=knowton.apks

# Or build APK for testing
./gradlew assembleRelease
adb install app/build/outputs/apk/release/app-release.apk
```

## Step 5: Google Play Console Setup

### 5.1 Create App
1. Go to [Google Play Console](https://play.google.com/console)
2. All apps → Create app
3. Configure:
   - App name: KnowTon
   - Default language: English (United States)
   - App or game: App
   - Free or paid: Free
   - Declarations:
     - [x] Developer Program Policies
     - [x] US export laws

### 5.2 Store Listing
Navigate to: Store presence → Main store listing

**App details:**
- App name: KnowTon
- Short description: [Use short description from app-description-en.md]
- Full description: [Use full description from app-description-en.md]

**Graphics:**
- App icon: 512 x 512 px PNG
- Feature graphic: 1024 x 500 px
- Phone screenshots: Upload 4-8 screenshots
- 7-inch tablet screenshots: Upload 2-4 screenshots (optional)
- 10-inch tablet screenshots: Upload 2-4 screenshots (optional)
- Promotional video: YouTube URL (optional)

**Categorization:**
- App category: Finance
- Tags: Education, Productivity
- Content rating: To be determined (see Step 5.3)

**Contact details:**
- Email: support@knowton.io
- Phone: [Your phone number]
- Website: https://knowton.io

**Privacy Policy:**
- URL: https://knowton.io/privacy

### 5.3 Content Rating
Navigate to: Policy → App content → Content rating

Complete questionnaire:
1. Select category: Finance
2. Answer questions about:
   - Violence
   - Sexual content
   - Language
   - Controlled substances
   - User interaction
   - Sharing of user information

Expected rating: PEGI 12, ESRB Teen

### 5.4 Target Audience
Navigate to: Policy → App content → Target audience

- Target age groups: 13+ (Teens and Adults)
- Appeal to children: No

### 5.5 Data Safety
Navigate to: Policy → App content → Data safety

**Data collection:**
- Personal info: Name, Email address
- Financial info: Payment info, Purchase history
- Photos and videos: Photos, Videos
- Files and docs: Files and docs
- App activity: App interactions, In-app search history
- Device or other IDs: Device or other IDs

**Data usage:**
- App functionality
- Analytics
- Personalization
- Account management

**Data sharing:**
- Data shared with third parties: Yes
  - Payment processors (Stripe, PayPal)
  - Analytics providers (Firebase)
  - Cloud storage (AWS S3)

**Security practices:**
- Data encrypted in transit: Yes
- Users can request data deletion: Yes
- Committed to Google Play Families Policy: No
- Independent security review: Pending

### 5.6 App Access
Navigate to: Policy → App content → App access

- All functionality available without restrictions: No
- Provide demo account:
  - Username: demo@knowton.io
  - Password: [Provide test password]
  - Instructions: Login to access all features

### 5.7 Ads
Navigate to: Policy → App content → Ads

- Contains ads: No

### 5.8 Government Apps
Navigate to: Policy → App content → Government apps

- Government app: No

## Step 6: Release Setup

### 6.1 Create Release
Navigate to: Release → Production → Create new release

1. Upload app bundle:
   - Click "Upload" and select `app-release.aab`
   - Wait for upload and processing

2. Release name: 1.0.0 (1)

3. Release notes:
```
Initial release of KnowTon - IP Marketplace

Features:
• Browse and purchase premium digital content
• Invest in IP bonds with 8-15% APY
• Trade fractionalized NFTs
• Offline mode for downloaded content
• Multi-language support (EN, ZH, JA, KO)
• Multiple payment methods (Card, Crypto, Alipay, WeChat Pay)
• Push notifications for updates
• Secure DRM protection

We're excited to bring you the future of IP marketplace!
```

### 6.2 Countries/Regions
- Select: All countries (or specific regions)
- Exclude: Countries with regulatory restrictions (if any)

### 6.3 App Signing
- Use Google Play App Signing: Yes (recommended)
- Upload certificate: Upload your upload key certificate

```bash
# Export upload certificate
keytool -export -rfc \
  -keystore knowton-upload-key.keystore \
  -alias knowton-upload \
  -file upload_certificate.pem
```

## Step 7: Review and Publish

### 7.1 Pre-Launch Report
- Wait for automated testing to complete (1-2 hours)
- Review crash reports and compatibility issues
- Fix critical issues if found

### 7.2 Final Checklist
- [ ] Store listing completed
- [ ] Screenshots uploaded (all sizes)
- [ ] Content rating completed
- [ ] Data safety completed
- [ ] App access configured
- [ ] Release created with AAB
- [ ] Release notes added
- [ ] Countries selected
- [ ] App signing configured

### 7.3 Submit for Review
1. Review all sections for completeness
2. Click "Send for review"
3. Confirm submission

## Step 8: Review Process

### 8.1 Timeline
- **Review**: 1-7 days typically
- **Processing**: Additional 1-2 hours after approval
- **Published**: Visible in Play Store within hours

### 8.2 Possible Outcomes
- **Approved**: App goes live
- **Rejected**: Review rejection reasons and resubmit
- **Suspended**: Serious policy violations

### 8.3 Common Rejection Reasons
1. **Policy Violations**: Violates Google Play policies
2. **Incomplete Information**: Missing required information
3. **Crashes**: App crashes during testing
4. **Misleading Content**: Description doesn't match functionality
5. **Privacy Issues**: Missing privacy policy or data safety info

## Step 9: Post-Publication

### 9.1 Monitor Release
- Check Play Store for live status
- Test download and installation
- Monitor crash reports in Play Console
- Check user reviews and ratings

### 9.2 Internal Testing Track
Set up for future updates:
1. Release → Testing → Internal testing
2. Create email list of testers
3. Upload test builds before production

### 9.3 Staged Rollout
For future updates:
1. Release → Production → Create release
2. Select "Staged rollout"
3. Start with 5-10% of users
4. Monitor for issues
5. Increase percentage gradually

## Troubleshooting

### Build Fails
```bash
# Clear gradle cache
./gradlew clean
rm -rf ~/.gradle/caches/

# Check Java version
java -version  # Should be JDK 17

# Verify signing config
./gradlew signingReport

# Check for dependency conflicts
./gradlew dependencies
```

### Upload Rejected
- Verify version code is higher than previous
- Check package name matches
- Ensure signing key is correct
- Verify all required permissions declared

### Pre-Launch Report Failures
- Test on physical devices
- Check for memory leaks
- Verify network error handling
- Test on different Android versions

## Version Updates

### Increment Version
Update `android/app/build.gradle`:

```groovy
defaultConfig {
    versionCode 2  // Increment by 1
    versionName "1.0.1"  // Update version string
}
```

### Build and Upload
```bash
./gradlew bundleRelease
# Upload new AAB to Play Console
```

## Resources

- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Launch Checklist](https://developer.android.com/distribute/best-practices/launch/launch-checklist)
- [App Bundle Documentation](https://developer.android.com/guide/app-bundle)
- [Play Console API](https://developers.google.com/android-publisher)

## Support

For submission issues:
- Email: dev-support@knowton.io
- Slack: #mobile-releases
- Documentation: https://docs.knowton.io/mobile/android-submission
