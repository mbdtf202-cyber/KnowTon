# App Store Submission - Quick Start Guide

Quick reference guide for submitting the KnowTon mobile app to Apple App Store and Google Play Store.

## 📋 Overview

This guide provides a streamlined overview of the app store submission process. For detailed instructions, refer to the comprehensive guides in the `app-store/` directory.

## 🚀 Quick Links

- [iOS Submission Guide](./app-store/ios-submission.md) - Complete iOS submission process
- [Android Submission Guide](./app-store/android-submission.md) - Complete Android submission process
- [Submission Checklist](./app-store/submission-checklist.md) - Master checklist for both platforms
- [Asset Preparation Guide](./app-store/assets/asset-preparation-guide.md) - Visual asset requirements
- [Privacy Policy](./app-store/privacy-policy.md) - App privacy policy
- [Terms of Service](./app-store/terms-of-service.md) - App terms of service

## ⚡ Quick Start Steps

### Phase 1: Preparation (Week 1)

#### 1. Setup Developer Accounts
```bash
# iOS
- Register for Apple Developer Program ($99/year)
- Enable two-factor authentication
- Complete account verification

# Android
- Register for Google Play Developer ($25 one-time)
- Complete account verification
- Setup payment profile
```

#### 2. Create App Assets
```bash
# Required Assets:
- App icons (iOS: 1024x1024, Android: 512x512 + all densities)
- Screenshots (iOS: 3 sizes, Android: phone + tablet)
- Feature graphic (Android: 1024x500)
- App descriptions (English + Chinese)
```

#### 3. Publish Legal Documents
```bash
# Host on website:
- Privacy Policy: https://knowton.io/privacy
- Terms of Service: https://knowton.io/terms
- Support Page: https://knowton.io/support
```

### Phase 2: iOS Submission (Week 2)

#### 1. Configure Xcode
```bash
cd packages/mobile/ios
open KnowTonMobile.xcworkspace

# Update in Xcode:
- Bundle ID: com.knowtonmobile
- Version: 1.0.0
- Build: 1
- Signing: Manual (Distribution profile)
```

#### 2. Build and Archive
```bash
# Clean build
xcodebuild clean -workspace KnowTonMobile.xcworkspace -scheme KnowTonMobile

# Archive
# In Xcode: Product → Archive
# Validate and upload to App Store Connect
```

#### 3. Configure App Store Connect
```bash
# Create app at appstoreconnect.apple.com
- Name: KnowTon
- Bundle ID: com.knowtonmobile
- Category: Finance, Education
- Upload screenshots and metadata
- Select build
- Submit for review
```

### Phase 3: Android Submission (Week 3)

#### 1. Generate Signing Key
```bash
cd packages/mobile/android/app

keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore knowton-upload-key.keystore \
  -alias knowton-upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Save password securely!
```

#### 2. Build Release
```bash
cd packages/mobile/android

# Configure gradle.properties with keystore info
# Build AAB
./gradlew bundleRelease

# Output: app/build/outputs/bundle/release/app-release.aab
```

#### 3. Configure Play Console
```bash
# Create app at play.google.com/console
- Name: KnowTon
- Package: com.knowtonmobile
- Category: Finance
- Upload AAB and screenshots
- Complete content rating
- Complete data safety
- Submit for review
```

## 📝 Essential Checklists

### Pre-Submission Checklist
- [ ] All features complete and tested
- [ ] No critical bugs or crashes
- [ ] Performance optimized
- [ ] Legal documents published
- [ ] Demo account created
- [ ] Assets prepared (icons, screenshots)
- [ ] Descriptions written
- [ ] Developer accounts ready

### iOS Submission Checklist
- [ ] App ID created
- [ ] Distribution certificate generated
- [ ] Provisioning profile configured
- [ ] Xcode project configured
- [ ] Build archived and uploaded
- [ ] App Store Connect metadata complete
- [ ] Screenshots uploaded (3 sizes)
- [ ] Privacy policy linked
- [ ] Demo account provided
- [ ] Submitted for review

### Android Submission Checklist
- [ ] Signing key generated and backed up
- [ ] Build.gradle configured
- [ ] Release AAB built
- [ ] Play Console app created
- [ ] Store listing complete
- [ ] Screenshots uploaded
- [ ] Content rating complete
- [ ] Data safety complete
- [ ] Privacy policy linked
- [ ] Submitted for review

## 🎨 Asset Requirements Summary

### iOS Assets
| Asset | Size | Required |
|-------|------|----------|
| App Icon | 1024x1024 | Yes |
| iPhone 6.7" Screenshots | 1290x2796 | Yes (3-10) |
| iPhone 6.5" Screenshots | 1242x2688 | Yes (3-10) |
| iPhone 5.5" Screenshots | 1242x2208 | Yes (3-10) |
| iPad Screenshots | 2048x2732 | Optional |

### Android Assets
| Asset | Size | Required |
|-------|------|----------|
| Play Store Icon | 512x512 | Yes |
| Feature Graphic | 1024x500 | Yes |
| Phone Screenshots | 1080x1920 | Yes (2-8) |
| Tablet Screenshots | 1920x1200 | Optional |

## 📱 Screenshot Content Guide

Capture these screens in order:
1. **Home Screen** - Featured content and navigation
2. **Explore** - Content discovery with categories
3. **Content Details** - Detailed view with preview
4. **Content Player** - Video/audio player in action
5. **Purchase Flow** - Checkout with payment options
6. **Library** - User's purchased content
7. **Bonds/Investment** - IP bonds interface
8. **Profile** - User profile and settings

## 🔐 Demo Account Setup

Create test account for reviewers:
```
Email: demo@knowton.io
Password: [Create secure password]

Account should have:
- Sample purchased content
- Active subscriptions
- Investment portfolio
- Complete profile
```

## ⏱️ Timeline Expectations

### iOS Review Process
- **Submission to Review**: Immediate
- **In Review**: 24-48 hours typically
- **Processing**: 24 hours after approval
- **Total**: 2-4 days average

### Android Review Process
- **Submission to Review**: Immediate
- **Pre-launch Testing**: 1-2 hours
- **In Review**: 1-7 days typically
- **Total**: 1-7 days average

## 🚨 Common Rejection Reasons

### iOS
1. **Incomplete Information** - Missing demo account or privacy policy
2. **Crashes** - App crashes during review
3. **Broken Features** - Features don't work as described
4. **Privacy Issues** - Missing privacy descriptions in Info.plist
5. **Guideline Violations** - Violates App Store Review Guidelines

### Android
1. **Policy Violations** - Violates Google Play policies
2. **Incomplete Information** - Missing required metadata
3. **Crashes** - App crashes during automated testing
4. **Misleading Content** - Description doesn't match app
5. **Privacy Issues** - Incomplete data safety section

## 🛠️ Troubleshooting

### iOS Build Issues
```bash
# Clear derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Clean build
xcodebuild clean -workspace KnowTonMobile.xcworkspace -scheme KnowTonMobile

# Verify signing
codesign -dv --verbose=4 path/to/app
```

### Android Build Issues
```bash
# Clean gradle cache
./gradlew clean
rm -rf ~/.gradle/caches/

# Verify signing
./gradlew signingReport

# Check dependencies
./gradlew dependencies
```

## 📊 Success Metrics

### Week 1 Targets
- 100+ downloads
- <1% crash rate
- >4.0 star rating
- 10+ reviews

### Month 1 Targets
- 1,000+ downloads
- <0.5% crash rate
- >4.5 star rating
- 50+ reviews
- 30% retention rate

## 📞 Support

### Internal Support
- **Email**: dev-support@knowton.io
- **Slack**: #mobile-releases
- **Documentation**: https://docs.knowton.io/mobile

### External Resources
- **Apple**: https://developer.apple.com/support/
- **Google**: https://support.google.com/googleplay/android-developer/

## 📚 Additional Resources

### Documentation
- [Complete iOS Guide](./app-store/ios-submission.md)
- [Complete Android Guide](./app-store/android-submission.md)
- [Asset Preparation](./app-store/assets/asset-preparation-guide.md)
- [Privacy Policy](./app-store/privacy-policy.md)
- [Terms of Service](./app-store/terms-of-service.md)

### External Links
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy Center](https://play.google.com/about/developer-content-policy/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design](https://material.io/design)

## ✅ Final Checklist

Before submission, verify:
- [ ] All features tested on physical devices
- [ ] No crashes or critical bugs
- [ ] Performance acceptable (load times, memory)
- [ ] All assets prepared and uploaded
- [ ] Legal documents published and linked
- [ ] Demo account created and tested
- [ ] Descriptions written and reviewed
- [ ] Privacy policy and terms accessible
- [ ] Developer accounts ready
- [ ] Team approvals received

---

**Ready to submit?** Follow the detailed guides in the `app-store/` directory for step-by-step instructions.

**Questions?** Contact dev-support@knowton.io or check #mobile-releases on Slack.

**Good luck with your submission! 🚀**
