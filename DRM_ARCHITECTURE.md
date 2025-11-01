# DRM Architecture

## 🎯 Overview

KnowTon implements a hybrid cryptographic DRM (Digital Rights Management) system that balances security, performance, and user experience. The architecture combines:

1. **Encrypted Cloud Storage** for high-performance streaming
2. **IPFS/Arweave** for permanent fingerprint & metadata storage
3. **Key Management Service** for secure key distribution
4. **Watermarking** for forensic tracking

## 🏗️ Architecture Components

### 1. Content Upload & Encryption

```
Creator Upload Flow:
┌─────────────┐
│   Creator   │
└──────┬──────┘
       │ 1. Upload file
       ▼
┌─────────────────┐
│  Upload Service │
└────────┬────────┘
         │ 2. Generate symmetric key
         │ 3. Encrypt file (AES-256-GCM)
         │ 4. Store encrypted file in S3
         │ 5. Generate content fingerprint
         │ 6. Store fingerprint on IPFS
         │ 7. Encrypt key with KMS
         │ 8. Store metadata on blockchain
         ▼
┌─────────────────┐
│  Smart Contract │
└─────────────────┘
```

**Key Steps**:
- File encrypted with unique symmetric key (AES-256-GCM)
- Encrypted file stored in S3 with server-side encryption (SSE)
- Content fingerprint (SHA-256) stored on IPFS
- Encryption key encrypted with AWS KMS master key
- Metadata (hash, key reference, license terms) stored on-chain

### 2. Content Access & Decryption

```
Buyer Access Flow:
┌─────────────┐
│    Buyer    │
└──────┬──────┘
       │ 1. Request access
       ▼
┌─────────────────┐
│   API Gateway   │
└────────┬────────┘
         │ 2. Verify ownership (blockchain)
         │ 3. Check license validity
         ▼
┌─────────────────┐
│  Auth Service   │
└────────┬────────┘
         │ 4. Generate short-lived token
         │ 5. Decrypt file key via KMS
         ▼
┌─────────────────┐
│ Streaming CDN   │
└────────┬────────┘
         │ 6. Stream encrypted segments
         │ 7. Client-side decryption
         ▼
┌─────────────┐
│   Player    │
└─────────────┘
```

**Security Features**:
- Ownership verified via smart contract events
- Short-lived access tokens (15-60 minutes)
- Key decryption only after authorization
- Streaming prevents full file download
- Client-side decryption in secure context

### 3. Key Management

```
Key Hierarchy:
┌──────────────────────┐
│   KMS Master Key     │ ← AWS KMS (HSM-backed)
└──────────┬───────────┘
           │ Encrypts
           ▼
┌──────────────────────┐
│  Data Encryption Key │ ← Per-file symmetric key
└──────────┬───────────┘
           │ Encrypts
           ▼
┌──────────────────────┐
│   Content File       │ ← Actual media file
└──────────────────────┘
```

**Key Properties**:
- **Master Key**: Managed by AWS KMS, never leaves HSM
- **Data Keys**: Generated per-file, encrypted at rest
- **Key Rotation**: Automatic rotation every 90 days
- **Access Control**: IAM policies restrict key usage
- **Audit Trail**: All key operations logged to CloudTrail

## 🔒 Security Layers

### Layer 1: Storage Encryption
- **S3 Server-Side Encryption** (SSE-KMS)
- **Bucket Policies**: Restrict access to authorized services only
- **Versioning**: Enabled for audit trail
- **Access Logging**: All access logged to separate bucket

### Layer 2: Transport Encryption
- **TLS 1.3** for all API communications
- **Certificate Pinning** in mobile apps
- **HSTS** headers enforced
- **CDN**: CloudFront with custom SSL certificates

### Layer 3: Application Encryption
- **End-to-End Encryption** option for sensitive content
- **Client-Side Encryption** for high-value assets
- **Secure Enclaves**: iOS/Android secure storage for keys

### Layer 4: Access Control
- **Smart Contract Verification**: On-chain ownership check
- **Time-Based Access**: Expiring licenses enforced
- **Geographic Restrictions**: IP-based content filtering
- **Device Limits**: Maximum concurrent streams per license

## 🎨 Watermarking

### Visible Watermarking
- **Purpose**: Deter casual piracy
- **Implementation**: Overlay with user ID + transaction hash
- **Customization**: Creator-configurable position and opacity

### Forensic Watermarking
- **Purpose**: Track unauthorized distribution
- **Implementation**: Imperceptible patterns embedded in content
- **Tracking**: Unique identifier per user/transaction
- **Detection**: Automated scanning of public platforms

```
Watermark Data:
- User wallet address
- Transaction hash
- Purchase timestamp
- License type
- Content ID
```

## 📊 Content Delivery

### Streaming Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. Request manifest
       ▼
┌─────────────────┐
│  CDN (CloudFront)│
└────────┬────────┘
         │ 2. Validate token
         │ 3. Serve HLS/DASH manifest
         ▼
┌─────────────────┐
│  Origin (S3)    │
└────────┬────────┘
         │ 4. Encrypted segments
         ▼
┌─────────────┐
│   Client    │ ← 5. Decrypt & play
└─────────────┘
```

**Protocols**:
- **HLS** (HTTP Live Streaming) for iOS/Safari
- **DASH** (Dynamic Adaptive Streaming) for others
- **Segment Encryption**: AES-128 or SAMPLE-AES
- **Key Rotation**: Per-segment or per-period

### Performance Optimization
- **Multi-CDN**: CloudFront + Cloudflare for redundancy
- **Edge Caching**: Encrypted segments cached at edge
- **Adaptive Bitrate**: Multiple quality levels
- **Preloading**: Predictive segment fetching

## 🔍 Piracy Detection

### Automated Monitoring
- **Web Crawling**: Scan file-sharing sites
- **Fingerprint Matching**: Compare against known content
- **Watermark Detection**: Extract forensic watermarks
- **DMCA Automation**: Auto-generate takedown notices

### Response Workflow
```
Detection → Verification → User Identification → 
Legal Notice → Takedown Request → Account Action
```

## 🌐 IPFS Integration

### What Goes On-Chain/IPFS
- **Content Hash**: SHA-256 fingerprint
- **Metadata**: Title, description, license terms
- **Thumbnail**: Low-res preview image
- **Proof of Existence**: Timestamp + creator signature

### What Stays Off-Chain
- **Full Content**: Encrypted in S3
- **Encryption Keys**: In KMS
- **Access Logs**: In database
- **Analytics**: In data warehouse

### Pinning Strategy
- **Primary**: Pinata (paid tier)
- **Secondary**: Infura (backup)
- **Tertiary**: Self-hosted IPFS node
- **Permanent**: Arweave for critical metadata

## 🔄 Key Rotation & Recovery

### Automatic Rotation
- **Schedule**: Every 90 days
- **Process**: 
  1. Generate new master key
  2. Re-encrypt all data keys
  3. Update key references
  4. Deprecate old key (retain for 30 days)

### Emergency Rotation
- **Trigger**: Security incident or key compromise
- **Timeline**: Within 4 hours
- **Impact**: Temporary service disruption (5-15 minutes)

### Key Recovery
- **Backup**: Encrypted key backups in separate AWS region
- **Escrow**: Optional key escrow for enterprise customers
- **Multi-Party Computation**: Planned for high-value assets

## 📈 Scalability

### Current Capacity
- **Concurrent Streams**: 10,000+
- **Storage**: Unlimited (S3)
- **Bandwidth**: 10 Gbps+ (CDN)
- **Key Operations**: 10,000 ops/sec (KMS)

### Scaling Strategy
- **Horizontal**: Add more API servers
- **Vertical**: Upgrade KMS tier
- **Geographic**: Multi-region deployment
- **Caching**: Redis for hot keys

## 🧪 Testing & Validation

### Security Testing
- **Penetration Testing**: Quarterly
- **Key Extraction Attempts**: Continuous
- **Watermark Removal**: Adversarial testing
- **DRM Bypass**: Red team exercises

### Performance Testing
- **Load Testing**: 100k concurrent users
- **Latency**: <100ms for key operations
- **Availability**: 99.9% SLA
- **Recovery Time**: <15 minutes

## 📞 Contact

- **DRM inquiries**: drm@knowton.io
- **Security**: security@knowton.io
- **Technical support**: support@knowton.io

---

**Last updated**: November 2, 2025
