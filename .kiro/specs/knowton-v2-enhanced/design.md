# KnowTon Platform V2 - Design Specification

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  React + TypeScript + Vite + TailwindCSS                   │
│  - Web DApp (Desktop/Mobile)                                │
│  - Progressive Web App (PWA)                                │
│  - Service Worker (Offline Support)                         │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS/WSS
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway Layer                         │
│  Traefik + Kong                                             │
│  - Rate Limiting                                            │
│  - Authentication                                           │
│  - Load Balancing                                           │
│  - API Versioning                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Microservices Layer                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ Creator  │ │   NFT    │ │ Payment  │ │ Royalty  │     │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │Analytics │ │  Market  │ │ Bonding  │ │  Auth    │     │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │PostgreSQL│ │ MongoDB  │ │  Redis   │ │  Kafka   │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │ClickHouse│ │Elastic   │ │ Weaviate │                  │
│  └──────────┘ └──────────┘ └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 Blockchain Layer                            │
│  Arbitrum L2 (Primary)                                      │
│  - Smart Contracts (Solidity)                               │
│  - Event Listeners                                          │
│  - Transaction Management                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Storage Layer                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │   IPFS   │ │    S3    │ │   CDN    │                  │
│  │(Pinata)  │ │(Primary) │ │(CloudFlare)                 │
│  └──────────┘ └──────────┘ └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Hybrid Architecture Principles

**On-Chain (Web3)**:
- Copyright hash registration
- Revenue sharing rules
- Token/NFT ownership
- Governance voting
- Bond issuance

**Off-Chain (Web2)**:
- User identity & KYC
- Content storage & CDN
- Fiat payments
- Sensitive data
- Search & analytics

**Bridge Layer**:
- Oracle Adapter (AI → Blockchain)
- Event Listeners (Blockchain → Services)
- Transaction Manager (Services → Blockchain)

---

## 2. Database Design

### 2.1 PostgreSQL Schema

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE,
  email VARCHAR(255) UNIQUE,
  username VARCHAR(50) UNIQUE,
  role VARCHAR(20) NOT NULL, -- creator, user, admin
  kyc_status VARCHAR(20), -- pending, verified, rejected
  kyc_level INT DEFAULT 0, -- 0: none, 1: basic, 2: advanced
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB
);

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### Creators Table
```sql
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  avatar_url VARCHAR(500),
  cover_url VARCHAR(500),
  creator_type VARCHAR(20), -- individual, institution, enterprise
  verification_status VARCHAR(20), -- pending, verified, rejected
  total_revenue DECIMAL(20, 2) DEFAULT 0,
  total_sales INT DEFAULT 0,
  follower_count INT DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_creators_user ON creators(user_id);
CREATE INDEX idx_creators_status ON creators(verification_status);
```

#### Contents Table
```sql
CREATE TABLE contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  content_type VARCHAR(50) NOT NULL, -- pdf, video, audio, course
  category VARCHAR(50),
  tags TEXT[],
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  file_size BIGINT,
  duration INT, -- seconds for video/audio
  preview_url VARCHAR(500),
  ipfs_hash VARCHAR(100),
  s3_key VARCHAR(500),
  fingerprint VARCHAR(100),
  copyright_tx_hash VARCHAR(66),
  status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
  view_count INT DEFAULT 0,
  purchase_count INT DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  metadata JSONB
);

CREATE INDEX idx_contents_creator ON contents(creator_id);
CREATE INDEX idx_contents_status ON contents(status);
CREATE INDEX idx_contents_category ON contents(category);
CREATE INDEX idx_contents_fingerprint ON contents(fingerprint);
```


#### Purchases Table
```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  content_id UUID REFERENCES contents(id),
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10),
  payment_method VARCHAR(50), -- stripe, crypto, alipay
  payment_tx_hash VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, refunded
  access_token VARCHAR(100),
  access_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  refunded_at TIMESTAMP,
  metadata JSONB
);

CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_content ON purchases(content_id);
CREATE INDEX idx_purchases_status ON purchases(status);
```

#### Royalty_Distributions Table
```sql
CREATE TABLE royalty_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id),
  purchase_id UUID REFERENCES purchases(id),
  recipient_address VARCHAR(42) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  currency VARCHAR(10),
  percentage DECIMAL(5, 2),
  tx_hash VARCHAR(66),
  status VARCHAR(20) DEFAULT 'pending',
  distributed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_royalty_content ON royalty_distributions(content_id);
CREATE INDEX idx_royalty_recipient ON royalty_distributions(recipient_address);
```

### 2.2 MongoDB Collections

#### content_metadata
```javascript
{
  _id: ObjectId,
  content_id: UUID,
  title: String,
  description: String,
  tags: [String],
  category: String,
  language: String,
  difficulty_level: String,
  prerequisites: [String],
  learning_outcomes: [String],
  chapters: [{
    title: String,
    duration: Number,
    preview: Boolean
  }],
  collaborators: [{
    user_id: UUID,
    role: String,
    share_percentage: Number
  }],
  versions: [{
    version: String,
    changes: String,
    created_at: Date
  }],
  created_at: Date,
  updated_at: Date
}
```

#### user_activity
```javascript
{
  _id: ObjectId,
  user_id: UUID,
  content_id: UUID,
  activity_type: String, // view, purchase, download, complete
  progress: Number, // 0-100
  time_spent: Number, // seconds
  device: String,
  ip_address: String,
  location: {
    country: String,
    city: String
  },
  timestamp: Date
}
```

### 2.3 ClickHouse Analytics Tables

```sql
CREATE TABLE analytics_events (
  event_id UUID,
  event_type String,
  user_id UUID,
  content_id UUID,
  creator_id UUID,
  timestamp DateTime,
  properties String, -- JSON
  session_id String,
  device_type String,
  browser String,
  country String,
  city String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, event_type, user_id);

CREATE TABLE revenue_analytics (
  transaction_id UUID,
  content_id UUID,
  creator_id UUID,
  amount Decimal(20, 2),
  currency String,
  payment_method String,
  timestamp DateTime,
  country String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, creator_id);
```

---

## 3. API Design

### 3.1 RESTful API Endpoints

#### Authentication
```
POST   /api/v1/auth/wallet-connect
POST   /api/v1/auth/email-login
POST   /api/v1/auth/refresh-token
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
```

#### Creator Management
```
POST   /api/v1/creators/register
GET    /api/v1/creators/:id
PUT    /api/v1/creators/:id
GET    /api/v1/creators/:id/contents
GET    /api/v1/creators/:id/analytics
POST   /api/v1/creators/:id/verify
```

#### Content Management
```
POST   /api/v1/contents/upload
GET    /api/v1/contents/:id
PUT    /api/v1/contents/:id
DELETE /api/v1/contents/:id
POST   /api/v1/contents/:id/publish
GET    /api/v1/contents/search
GET    /api/v1/contents/trending
POST   /api/v1/contents/:id/fingerprint
```

#### Payment & Purchase
```
POST   /api/v1/payments/create-intent
POST   /api/v1/payments/confirm
GET    /api/v1/purchases
GET    /api/v1/purchases/:id
POST   /api/v1/purchases/:id/refund
GET    /api/v1/purchases/:id/access-token
```

#### NFT & Blockchain
```
POST   /api/v1/nft/mint
GET    /api/v1/nft/:tokenId
POST   /api/v1/nft/:tokenId/transfer
POST   /api/v1/nft/:tokenId/fractionalize
GET    /api/v1/copyright/verify/:hash
POST   /api/v1/copyright/register
```

#### Bonds & Investment
```
POST   /api/v1/bonds/issue
GET    /api/v1/bonds/:id
POST   /api/v1/bonds/:id/invest
GET    /api/v1/bonds/:id/returns
POST   /api/v1/bonds/:id/redeem
```

#### Analytics
```
GET    /api/v1/analytics/dashboard
GET    /api/v1/analytics/revenue
GET    /api/v1/analytics/users
GET    /api/v1/analytics/content-performance
POST   /api/v1/analytics/export
```

### 3.2 WebSocket Events

```javascript
// Client → Server
{
  type: 'subscribe',
  channel: 'content:123',
  auth_token: 'jwt_token'
}

// Server → Client
{
  type: 'purchase_completed',
  data: {
    content_id: '123',
    buyer: '0x...',
    price: 100
  }
}

// Channels
- content:{id} - Content updates
- creator:{id} - Creator activity
- market - Market trades
- user:{id} - User notifications
```

---

## 4. Smart Contract Design

### 4.1 Enhanced CopyrightRegistry

```solidity
contract CopyrightRegistryV2 {
    struct Copyright {
        bytes32 contentHash;
        address creator;
        uint256 timestamp;
        string ipfsUri;
        bool isActive;
        mapping(address => uint8) collaborators; // address => percentage
    }
    
    mapping(bytes32 => Copyright) public copyrights;
    mapping(address => bytes32[]) public creatorWorks;
    
    event CopyrightRegistered(
        bytes32 indexed contentHash,
        address indexed creator,
        uint256 timestamp
    );
    
    event CollaboratorAdded(
        bytes32 indexed contentHash,
        address indexed collaborator,
        uint8 percentage
    );
    
    function registerCopyright(
        bytes32 _contentHash,
        string memory _ipfsUri,
        address[] memory _collaborators,
        uint8[] memory _percentages
    ) external returns (bool);
    
    function verifyCopyright(bytes32 _contentHash) 
        external view returns (bool, address, uint256);
    
    function addCollaborator(
        bytes32 _contentHash,
        address _collaborator,
        uint8 _percentage
    ) external onlyCreator(_contentHash);
}
```

### 4.2 Enhanced RoyaltyDistributor

```solidity
contract RoyaltyDistributorV2 {
    struct RoyaltyConfig {
        address[] recipients;
        uint8[] percentages;
        uint256 totalDistributed;
        bool isActive;
    }
    
    mapping(uint256 => RoyaltyConfig) public royaltyConfigs; // tokenId => config
    mapping(address => uint256) public pendingWithdrawals;
    
    event RoyaltyDistributed(
        uint256 indexed tokenId,
        address indexed recipient,
        uint256 amount
    );
    
    event WithdrawalProcessed(
        address indexed recipient,
        uint256 amount
    );
    
    function distributeRoyalty(uint256 _tokenId) 
        external payable returns (bool);
    
    function withdraw() external returns (bool);
    
    function updateRoyaltyConfig(
        uint256 _tokenId,
        address[] memory _recipients,
        uint8[] memory _percentages
    ) external onlyOwner(_tokenId);
}
```

### 4.3 Enterprise Licensing Contract

```solidity
contract EnterpriseLicensing {
    struct License {
        uint256 contentId;
        address enterprise;
        uint256 seats;
        uint256 expiresAt;
        bool isActive;
    }
    
    mapping(bytes32 => License) public licenses; // licenseId => License
    mapping(address => bytes32[]) public enterpriseLicenses;
    
    event LicenseIssued(
        bytes32 indexed licenseId,
        address indexed enterprise,
        uint256 seats,
        uint256 expiresAt
    );
    
    function issueLicense(
        uint256 _contentId,
        address _enterprise,
        uint256 _seats,
        uint256 _duration
    ) external payable returns (bytes32);
    
    function verifyLicense(bytes32 _licenseId) 
        external view returns (bool);
    
    function renewLicense(bytes32 _licenseId, uint256 _duration) 
        external payable;
}
```

---

## 5. Frontend Design

### 5.1 Component Architecture

```
src/
├── components/
│   ├── common/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── Card/
│   ├── layout/
│   │   ├── Header/
│   │   ├── Footer/
│   │   ├── Sidebar/
│   │   └── Container/
│   ├── creator/
│   │   ├── CreatorProfile/
│   │   ├── ContentUpload/
│   │   ├── RevenueChart/
│   │   └── CollaboratorManager/
│   ├── content/
│   │   ├── ContentCard/
│   │   ├── ContentPlayer/
│   │   ├── ContentPreview/
│   │   └── ContentRating/
│   ├── payment/
│   │   ├── PaymentForm/
│   │   ├── PriceDisplay/
│   │   └── CheckoutModal/
│   └── blockchain/
│       ├── WalletConnect/
│       ├── TransactionStatus/
│       └── NFTDisplay/
├── pages/
│   ├── HomePage/
│   ├── ExplorePage/
│   ├── CreatorDashboard/
│   ├── ContentDetails/
│   ├── CheckoutPage/
│   ├── MyLibrary/
│   └── AnalyticsPage/
├── hooks/
│   ├── useAuth.ts
│   ├── useContent.ts
│   ├── usePayment.ts
│   ├── useNFT.ts
│   └── useAnalytics.ts
├── services/
│   ├── api.ts
│   ├── blockchain.ts
│   ├── storage.ts
│   └── analytics.ts
└── store/
    ├── authStore.ts
    ├── contentStore.ts
    └── cartStore.ts
```

### 5.2 State Management (Zustand)

```typescript
// authStore.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  connectWallet: (address: string) => Promise<void>;
}

// contentStore.ts
interface ContentState {
  contents: Content[];
  selectedContent: Content | null;
  filters: ContentFilters;
  fetchContents: (filters: ContentFilters) => Promise<void>;
  selectContent: (id: string) => void;
}

// cartStore.ts
interface CartState {
  items: CartItem[];
  total: number;
  addItem: (content: Content) => void;
  removeItem: (id: string) => void;
  checkout: () => Promise<void>;
}
```

---

## 6. Security Design

### 6.1 Authentication Flow

```
1. User connects wallet (MetaMask)
2. Backend generates nonce
3. User signs message with nonce
4. Backend verifies signature
5. Backend issues JWT token
6. Frontend stores token in httpOnly cookie
7. Subsequent requests include token
8. Backend validates token on each request
```

### 6.2 Authorization Matrix

| Role | Create Content | Edit Own | Edit Others | Delete | Admin Panel |
|------|---------------|----------|-------------|--------|-------------|
| User | ❌ | ❌ | ❌ | ❌ | ❌ |
| Creator | ✅ | ✅ | ❌ | ✅ | ❌ |
| Moderator | ❌ | ❌ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

### 6.3 Data Encryption

```
- At Rest: AES-256 encryption for sensitive data
- In Transit: TLS 1.3 for all communications
- Content Files: AES-256 with per-file keys
- Private Keys: HSM storage (AWS KMS)
- User Passwords: bcrypt with salt rounds=12
```

---

## 7. Performance Optimization

### 7.1 Caching Strategy

```
L1: Browser Cache (Service Worker)
  - Static assets: 7 days
  - API responses: 5 minutes
  
L2: CDN Cache (CloudFlare)
  - Images: 30 days
  - Videos: 7 days
  - API: 1 minute
  
L3: Redis Cache
  - User sessions: 24 hours
  - Content metadata: 1 hour
  - Search results: 15 minutes
  
L4: Database Query Cache
  - PostgreSQL: pg_stat_statements
  - MongoDB: Query result cache
```

### 7.2 CDN Configuration

```javascript
// CloudFlare Worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const cache = caches.default
  let response = await cache.match(request)
  
  if (!response) {
    response = await fetch(request)
    const headers = new Headers(response.headers)
    headers.set('Cache-Control', 'public, max-age=3600')
    response = new Response(response.body, {
      status: response.status,
      headers: headers
    })
    event.waitUntil(cache.put(request, response.clone()))
  }
  
  return response
}
```

---

## 8. Monitoring & Observability

### 8.1 Metrics Collection

```yaml
# Prometheus metrics
- http_requests_total
- http_request_duration_seconds
- database_query_duration_seconds
- blockchain_transaction_count
- content_upload_size_bytes
- payment_success_rate
- user_active_sessions
- cache_hit_rate
```

### 8.2 Logging Strategy

```javascript
// Structured logging
logger.info('Content uploaded', {
  content_id: '123',
  creator_id: '456',
  file_size: 1024000,
  duration_ms: 5000,
  ip_address: '1.2.3.4',
  user_agent: 'Mozilla/5.0...'
})

// Log levels
- ERROR: System errors, exceptions
- WARN: Degraded performance, retries
- INFO: Business events, transactions
- DEBUG: Detailed debugging info
```

---

## 9. Deployment Architecture

### 9.1 Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: creator-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: creator-service
  template:
    metadata:
      labels:
        app: creator-service
    spec:
      containers:
      - name: creator-service
        image: knowton/creator-service:v2.0
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 9.2 Auto-Scaling Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: creator-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: creator-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## 10. Disaster Recovery

### 10.1 Backup Strategy

```
Daily Backups:
- PostgreSQL: Full backup at 2 AM UTC
- MongoDB: Incremental backup every 6 hours
- Redis: RDB snapshot every hour
- S3: Cross-region replication enabled

Retention Policy:
- Daily backups: 7 days
- Weekly backups: 4 weeks
- Monthly backups: 12 months
```

### 10.2 Recovery Procedures

```
RTO (Recovery Time Objective): 1 hour
RPO (Recovery Point Objective): 15 minutes

Failover Process:
1. Detect failure (automated monitoring)
2. Switch to standby database
3. Update DNS records
4. Verify service health
5. Notify team
```
