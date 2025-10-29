// MongoDB initialization script for KnowTon platform

db = db.getSiblingDB('knowton');

// Content metadata collection
db.createCollection('content_metadata', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['contentHash', 'creatorAddress', 'category', 'uploadedAt'],
      properties: {
        contentHash: {
          bsonType: 'string',
          description: 'Unique content hash - required'
        },
        creatorAddress: {
          bsonType: 'string',
          description: 'Creator wallet address - required'
        },
        title: {
          bsonType: 'string'
        },
        description: {
          bsonType: 'string'
        },
        category: {
          bsonType: 'string',
          enum: ['music', 'art', 'video', 'document', 'other'],
          description: 'Content category - required'
        },
        tags: {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          }
        },
        ipfsHash: {
          bsonType: 'string'
        },
        aiFingerprint: {
          bsonType: 'string',
          description: 'AI-generated content fingerprint'
        },
        fileType: {
          bsonType: 'string'
        },
        fileSize: {
          bsonType: 'long'
        },
        duration: {
          bsonType: 'int',
          description: 'Duration in seconds for audio/video'
        },
        dimensions: {
          bsonType: 'object',
          properties: {
            width: { bsonType: 'int' },
            height: { bsonType: 'int' }
          }
        },
        uploadedAt: {
          bsonType: 'date',
          description: 'Upload timestamp - required'
        },
        metadata: {
          bsonType: 'object',
          description: 'Additional flexible metadata'
        }
      }
    }
  }
});

// Create indexes for content_metadata
db.content_metadata.createIndex({ contentHash: 1 }, { unique: true });
db.content_metadata.createIndex({ creatorAddress: 1 });
db.content_metadata.createIndex({ category: 1 });
db.content_metadata.createIndex({ aiFingerprint: 1 });
db.content_metadata.createIndex({ tags: 1 });
db.content_metadata.createIndex({ uploadedAt: -1 });
db.content_metadata.createIndex({ 'metadata.tokenId': 1 });

// TTL index - remove content metadata after 5 years
db.content_metadata.createIndex(
  { uploadedAt: 1 },
  { expireAfterSeconds: 157680000 }
);

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
