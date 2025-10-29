#!/bin/bash

# Elasticsearch index initialization script for KnowTon platform

ES_HOST="http://localhost:9200"

echo "Creating Elasticsearch indices..."

# Content search index
curl -X PUT "$ES_HOST/content" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "english_analyzer": {
          "type": "standard",
          "stopwords": "_english_"
        },
        "chinese_analyzer": {
          "type": "custom",
          "tokenizer": "ik_max_word",
          "filter": ["lowercase"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "contentHash": {
        "type": "keyword"
      },
      "tokenId": {
        "type": "keyword"
      },
      "title": {
        "type": "text",
        "analyzer": "english_analyzer",
        "fields": {
          "chinese": {
            "type": "text",
            "analyzer": "chinese_analyzer"
          },
          "keyword": {
            "type": "keyword"
          }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "english_analyzer",
        "fields": {
          "chinese": {
            "type": "text",
            "analyzer": "chinese_analyzer"
          }
        }
      },
      "category": {
        "type": "keyword"
      },
      "tags": {
        "type": "keyword"
      },
      "creatorAddress": {
        "type": "keyword"
      },
      "creatorName": {
        "type": "text",
        "fields": {
          "keyword": {
            "type": "keyword"
          }
        }
      },
      "price": {
        "type": "double"
      },
      "views": {
        "type": "long"
      },
      "likes": {
        "type": "long"
      },
      "uploadedAt": {
        "type": "date"
      },
      "mintedAt": {
        "type": "date"
      },
      "metadata": {
        "type": "object",
        "enabled": true
      }
    }
  }
}'

# Creator search index
curl -X PUT "$ES_HOST/creators" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 2,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "name_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "walletAddress": {
        "type": "keyword"
      },
      "displayName": {
        "type": "text",
        "analyzer": "name_analyzer",
        "fields": {
          "keyword": {
            "type": "keyword"
          }
        }
      },
      "bio": {
        "type": "text"
      },
      "avatar": {
        "type": "keyword"
      },
      "totalContents": {
        "type": "integer"
      },
      "totalNFTs": {
        "type": "integer"
      },
      "totalVolume": {
        "type": "double"
      },
      "followers": {
        "type": "integer"
      },
      "verified": {
        "type": "boolean"
      },
      "createdAt": {
        "type": "date"
      }
    }
  }
}'

# NFT search index
curl -X PUT "$ES_HOST/nfts" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "tokenId": {
        "type": "keyword"
      },
      "name": {
        "type": "text",
        "fields": {
          "keyword": {
            "type": "keyword"
          }
        }
      },
      "description": {
        "type": "text"
      },
      "contentHash": {
        "type": "keyword"
      },
      "creatorAddress": {
        "type": "keyword"
      },
      "ownerAddress": {
        "type": "keyword"
      },
      "price": {
        "type": "double"
      },
      "lastSalePrice": {
        "type": "double"
      },
      "category": {
        "type": "keyword"
      },
      "attributes": {
        "type": "nested",
        "properties": {
          "trait_type": {
            "type": "keyword"
          },
          "value": {
            "type": "keyword"
          }
        }
      },
      "royaltyPercent": {
        "type": "integer"
      },
      "status": {
        "type": "keyword"
      },
      "mintedAt": {
        "type": "date"
      },
      "updatedAt": {
        "type": "date"
      }
    }
  }
}'

# Transaction search index
curl -X PUT "$ES_HOST/transactions" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "txHash": {
        "type": "keyword"
      },
      "blockNumber": {
        "type": "long"
      },
      "type": {
        "type": "keyword"
      },
      "fromAddress": {
        "type": "keyword"
      },
      "toAddress": {
        "type": "keyword"
      },
      "tokenId": {
        "type": "keyword"
      },
      "amount": {
        "type": "double"
      },
      "gasUsed": {
        "type": "long"
      },
      "gasPrice": {
        "type": "long"
      },
      "status": {
        "type": "keyword"
      },
      "timestamp": {
        "type": "date"
      }
    }
  }
}'

# Activity feed index
curl -X PUT "$ES_HOST/activities" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 2,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "activityId": {
        "type": "keyword"
      },
      "type": {
        "type": "keyword"
      },
      "userAddress": {
        "type": "keyword"
      },
      "targetAddress": {
        "type": "keyword"
      },
      "tokenId": {
        "type": "keyword"
      },
      "description": {
        "type": "text"
      },
      "metadata": {
        "type": "object",
        "enabled": true
      },
      "timestamp": {
        "type": "date"
      }
    }
  }
}'

echo "Elasticsearch indices created successfully"
echo "Listing all indices:"
curl -X GET "$ES_HOST/_cat/indices?v"
