// MongoDB initialization script for KnowTon platform
// Task 13.3: Configure MongoDB content metadata collections
// Requirements: 2.1, 2.2

db = db.getSiblingDB('knowton');

// ============================================================================
// Content Metadata Collection
// ============================================================================
// Primary collection for storing IP content metadata
// Aligned with IPNFTMetadata structure from design document
db.createCollection('content_metadata', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['contentHash', 'creatorAddress', 'category', 'uploadedAt'],
      properties: {
        // Core identifiers
        contentHash: {
          bsonType: 'string',
          description: 'IPFS CID or Arweave hash - unique identifier - required'
        },
        creatorAddress: {
          bsonType: 'string',
          pattern: '^0x[a-fA-F0-9]{40}$',
          description: 'Creator wallet address (Ethereum format) - required'
        },
        tokenId: {
          bsonType: 'string',
          description: 'NFT token ID if minted'
        },
        
        // Basic metadata
        title: {
          bsonType: 'string',
          maxLength: 200,
          description: 'Content title'
        },
        description: {
          bsonType: 'string',
          maxLength: 5000,
          description: 'Content description'
        },
        category: {
          bsonType: 'string',
          enum: ['music', 'video', 'ebook', 'course', 'software', 'artwork', 'research', 'other'],
          description: 'Content category - required'
        },
        tags: {
          bsonType: 'array',
          items: {
            bsonType: 'string',
            maxLength: 50
          },
          maxItems: 20,
          description: 'Content tags for search and categorization'
        },
        
        // Technical metadata
        contentType: {
          bsonType: 'string',
          description: 'MIME type (e.g., audio/mpeg, video/mp4)'
        },
        fileSize: {
          bsonType: 'long',
          minimum: 0,
          description: 'File size in bytes'
        },
        duration: {
          bsonType: 'int',
          minimum: 0,
          description: 'Duration in seconds for audio/video content'
        },
        dimensions: {
          bsonType: 'object',
          properties: {
            width: { bsonType: 'int', minimum: 0 },
            height: { bsonType: 'int', minimum: 0 }
          },
          description: 'Dimensions for image/video content'
        },
        language: {
          bsonType: 'string',
          description: 'Content language (ISO 639-1 code)'
        },
        license: {
          bsonType: 'string',
          description: 'License type (e.g., CC-BY, All Rights Reserved)'
        },
        
        // Storage references
        ipfsHash: {
          bsonType: 'string',
          description: 'IPFS content identifier (CID)'
        },
        arweaveHash: {
          bsonType: 'string',
          description: 'Arweave transaction ID for permanent storage'
        },
        thumbnailHash: {
          bsonType: 'string',
          description: 'IPFS hash for preview/thumbnail image'
        },
        
        // AI analysis
        aiAnalysis: {
          bsonType: 'object',
          properties: {
            fingerprint: {
              bsonType: 'string',
              description: 'AI-generated content fingerprint'
            },
            category: {
              bsonType: 'string',
              description: 'AI-detected category'
            },
            tags: {
              bsonType: 'array',
              items: { bsonType: 'string' },
              description: 'AI-generated tags'
            },
            quality: {
              bsonType: 'double',
              minimum: 0,
              maximum: 100,
              description: 'Quality score (0-100)'
            },
            sentiment: {
              bsonType: 'double',
              minimum: -1,
              maximum: 1,
              description: 'Sentiment score (-1 to 1)'
            },
            originalityScore: {
              bsonType: 'double',
              minimum: 0,
              maximum: 100,
              description: 'Originality score (0-100)'
            }
          },
          description: 'AI analysis results'
        },
        
        // RWA specific fields
        rwaMetadata: {
          bsonType: 'object',
          properties: {
            legalOwner: {
              bsonType: 'string',
              description: 'Legal owner name'
            },
            registrationNumber: {
              bsonType: 'string',
              description: 'Copyright registration number'
            },
            valuationUSD: {
              bsonType: 'double',
              minimum: 0,
              description: 'Estimated valuation in USD'
            },
            jurisdiction: {
              bsonType: 'string',
              description: 'Legal jurisdiction'
            }
          },
          description: 'Real-world asset metadata'
        },
        
        // Statistics
        statistics: {
          bsonType: 'object',
          properties: {
            views: {
              bsonType: 'long',
              minimum: 0,
              description: 'Total view count'
            },
            uniqueViewers: {
              bsonType: 'long',
              minimum: 0,
              description: 'Unique viewer count'
            },
            likes: {
              bsonType: 'long',
              minimum: 0,
              description: 'Like count'
            },
            shares: {
              bsonType: 'long',
              minimum: 0,
              description: 'Share count'
            },
            avgViewDuration: {
              bsonType: 'double',
              minimum: 0,
              description: 'Average view duration in seconds'
            },
            conversionRate: {
              bsonType: 'double',
              minimum: 0,
              maximum: 1,
              description: 'View to purchase conversion rate'
            }
          },
          description: 'Content statistics'
        },
        
        // Pricing information
        pricing: {
          bsonType: 'object',
          properties: {
            currentPrice: {
              bsonType: 'double',
              minimum: 0,
              description: 'Current price in ETH'
            },
            floorPrice: {
              bsonType: 'double',
              minimum: 0,
              description: 'Floor price in ETH'
            },
            ceilingPrice: {
              bsonType: 'double',
              minimum: 0,
              description: 'Ceiling price in ETH'
            }
          },
          description: 'Pricing information'
        },
        
        // Status and verification
        verified: {
          bsonType: 'bool',
          description: 'Copyright verification status'
        },
        verifiedAt: {
          bsonType: 'date',
          description: 'Verification timestamp'
        },
        status: {
          bsonType: 'string',
          enum: ['draft', 'uploaded', 'processing', 'verified', 'minted', 'flagged', 'removed'],
          description: 'Content status'
        },
        
        // Timestamps
        uploadedAt: {
          bsonType: 'date',
          description: 'Upload timestamp - required'
        },
        lastUpdated: {
          bsonType: 'date',
          description: 'Last update timestamp'
        },
        
        // Additional flexible metadata
        customMetadata: {
          bsonType: 'object',
          description: 'Additional custom metadata fields'
        }
      }
    }
  }
});

// ============================================================================
// Content Metadata Indexes
// ============================================================================
// Primary indexes for efficient querying

// Unique index on contentHash (primary identifier)
db.content_metadata.createIndex(
  { contentHash: 1 }, 
  { 
    unique: true,
    name: 'idx_content_hash_unique',
    background: true
  }
);

// Index on creatorAddress for creator queries (Requirement 2.1)
db.content_metadata.createIndex(
  { creatorAddress: 1 }, 
  { 
    name: 'idx_creator_address',
    background: true
  }
);

// Index on category for category filtering (Requirement 2.2)
db.content_metadata.createIndex(
  { category: 1 }, 
  { 
    name: 'idx_category',
    background: true
  }
);

// Compound index for creator + category queries
db.content_metadata.createIndex(
  { creatorAddress: 1, category: 1 }, 
  { 
    name: 'idx_creator_category',
    background: true
  }
);

// Index on AI fingerprint for similarity detection
db.content_metadata.createIndex(
  { 'aiAnalysis.fingerprint': 1 }, 
  { 
    name: 'idx_ai_fingerprint',
    sparse: true,
    background: true
  }
);

// Index on tokenId for NFT lookups
db.content_metadata.createIndex(
  { tokenId: 1 }, 
  { 
    name: 'idx_token_id',
    sparse: true,
    background: true
  }
);

// Index on tags for tag-based search
db.content_metadata.createIndex(
  { tags: 1 }, 
  { 
    name: 'idx_tags',
    background: true
  }
);

// Index on status for filtering by content status
db.content_metadata.createIndex(
  { status: 1 }, 
  { 
    name: 'idx_status',
    background: true
  }
);

// Index on uploadedAt for chronological queries
db.content_metadata.createIndex(
  { uploadedAt: -1 }, 
  { 
    name: 'idx_uploaded_at_desc',
    background: true
  }
);

// Compound index for verified content queries
db.content_metadata.createIndex(
  { verified: 1, category: 1, uploadedAt: -1 }, 
  { 
    name: 'idx_verified_category_time',
    background: true
  }
);

// Text index for full-text search on title, description, and tags
db.content_metadata.createIndex(
  { 
    title: 'text', 
    description: 'text', 
    tags: 'text' 
  }, 
  { 
    name: 'idx_fulltext_search',
    weights: {
      title: 10,
      tags: 5,
      description: 1
    },
    background: true
  }
);

// ============================================================================
// TTL Index Configuration
// ============================================================================
// TTL index to automatically remove old draft/unverified content after 90 days
// This helps maintain database hygiene by removing abandoned uploads
db.content_metadata.createIndex(
  { uploadedAt: 1 },
  { 
    expireAfterSeconds: 7776000, // 90 days
    partialFilterExpression: { 
      status: { $in: ['draft', 'uploaded'] },
      verified: false
    },
    name: 'idx_ttl_unverified_content',
    background: true
  }
);

// Note: Verified and minted content is preserved indefinitely
// Only draft/unverified content is subject to TTL expiration

// AI fingerprints collection for similarity search
db.createCollection('ai_fingerprints', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['contentHash', 'fingerprint', 'createdAt'],
      properties: {
        contentHash: {
          bsonType: 'string',
          description: 'Content hash reference'
        },
        fingerprint: {
          bsonType: 'string',
          description: 'AI-generated fingerprint hash'
        },
        features: {
          bsonType: 'array',
          items: {
            bsonType: 'double'
          },
          description: 'Feature vector for similarity comparison'
        },
        model: {
          bsonType: 'string',
          description: 'AI model used for fingerprinting'
        },
        confidence: {
          bsonType: 'double',
          minimum: 0,
          maximum: 1
        },
        createdAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

db.ai_fingerprints.createIndex({ contentHash: 1 });
db.ai_fingerprints.createIndex({ fingerprint: 1 }, { unique: true });
db.ai_fingerprints.createIndex({ createdAt: -1 });

// NFT metadata collection
db.createCollection('nft_metadata', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['tokenId', 'contentHash', 'createdAt'],
      properties: {
        tokenId: {
          bsonType: 'string',
          description: 'NFT token ID'
        },
        contentHash: {
          bsonType: 'string'
        },
        name: {
          bsonType: 'string'
        },
        description: {
          bsonType: 'string'
        },
        image: {
          bsonType: 'string',
          description: 'IPFS URL for preview image'
        },
        animation_url: {
          bsonType: 'string',
          description: 'IPFS URL for animation/video'
        },
        attributes: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              trait_type: { bsonType: 'string' },
              value: {}
            }
          }
        },
        external_url: {
          bsonType: 'string'
        },
        createdAt: {
          bsonType: 'date'
        },
        updatedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

db.nft_metadata.createIndex({ tokenId: 1 }, { unique: true });
db.nft_metadata.createIndex({ contentHash: 1 });
db.nft_metadata.createIndex({ createdAt: -1 });

// User preferences and settings
db.createCollection('user_preferences', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userAddress'],
      properties: {
        userAddress: {
          bsonType: 'string'
        },
        displaySettings: {
          bsonType: 'object'
        },
        notifications: {
          bsonType: 'object'
        },
        privacy: {
          bsonType: 'object'
        },
        favorites: {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          }
        },
        watchlist: {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          }
        },
        updatedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

db.user_preferences.createIndex({ userAddress: 1 }, { unique: true });

// Search history for recommendations
db.createCollection('search_history');
db.search_history.createIndex({ userAddress: 1 });
db.search_history.createIndex({ timestamp: -1 });
db.search_history.createIndex({ query: 'text' });

// TTL index - remove search history after 90 days
db.search_history.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 7776000 }
);

// Content reports (copyright infringement, etc.)
db.createCollection('content_reports', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['reportedContentHash', 'reporterAddress', 'reason', 'createdAt'],
      properties: {
        reportedContentHash: {
          bsonType: 'string'
        },
        reporterAddress: {
          bsonType: 'string'
        },
        reason: {
          bsonType: 'string',
          enum: ['copyright', 'inappropriate', 'spam', 'other']
        },
        description: {
          bsonType: 'string'
        },
        evidence: {
          bsonType: 'array'
        },
        status: {
          bsonType: 'string',
          enum: ['pending', 'reviewing', 'resolved', 'rejected']
        },
        createdAt: {
          bsonType: 'date'
        },
        resolvedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

db.content_reports.createIndex({ reportedContentHash: 1 });
db.content_reports.createIndex({ reporterAddress: 1 });
db.content_reports.createIndex({ status: 1 });
db.content_reports.createIndex({ createdAt: -1 });

// Event logs for audit trail
db.createCollection('event_logs');
db.event_logs.createIndex({ eventType: 1 });
db.event_logs.createIndex({ userAddress: 1 });
db.event_logs.createIndex({ timestamp: -1 });
db.event_logs.createIndex({ 'metadata.tokenId': 1 });

// TTL index - remove event logs after 1 year
db.event_logs.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 31536000 }
);

print('MongoDB collections and indexes created successfully');
