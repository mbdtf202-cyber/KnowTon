import axios from 'axios';

/**
 * CDN Purge Service
 * Handles cache invalidation for Cloudflare CDN
 */

interface CloudflareConfig {
  zoneId: string;
  apiToken: string;
  baseUrl?: string;
}

interface PurgeOptions {
  files?: string[];
  tags?: string[];
  hosts?: string[];
  prefixes?: string[];
}

export class CDNPurgeService {
  private config: CloudflareConfig;
  private baseUrl: string;

  constructor(config: CloudflareConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.cloudflare.com/client/v4';
  }

  /**
   * Purge all cache
   */
  async purgeAll(): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/zones/${this.config.zoneId}/purge_cache`,
        { purge_everything: true },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        console.log('✅ Purged all cache successfully');
        return true;
      } else {
        console.error('❌ Cache purge failed:', response.data.errors);
        return false;
      }
    } catch (error) {
      console.error('Cache purge error:', error);
      return false;
    }
  }

  /**
   * Purge specific files
   */
  async purgeFiles(files: string[]): Promise<boolean> {
    if (files.length === 0) {
      return true;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/zones/${this.config.zoneId}/purge_cache`,
        { files },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        console.log(`✅ Purged ${files.length} files successfully`);
        return true;
      } else {
        console.error('❌ File purge failed:', response.data.errors);
        return false;
      }
    } catch (error) {
      console.error('File purge error:', error);
      return false;
    }
  }

  /**
   * Purge by cache tags
   */
  async purgeTags(tags: string[]): Promise<boolean> {
    if (tags.length === 0) {
      return true;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/zones/${this.config.zoneId}/purge_cache`,
        { tags },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        console.log(`✅ Purged tags: ${tags.join(', ')}`);
        return true;
      } else {
        console.error('❌ Tag purge failed:', response.data.errors);
        return false;
      }
    } catch (error) {
      console.error('Tag purge error:', error);
      return false;
    }
  }

  /**
   * Purge by hostname
   */
  async purgeHosts(hosts: string[]): Promise<boolean> {
    if (hosts.length === 0) {
      return true;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/zones/${this.config.zoneId}/purge_cache`,
        { hosts },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        console.log(`✅ Purged hosts: ${hosts.join(', ')}`);
        return true;
      } else {
        console.error('❌ Host purge failed:', response.data.errors);
        return false;
      }
    } catch (error) {
      console.error('Host purge error:', error);
      return false;
    }
  }

  /**
   * Purge by URL prefix
   */
  async purgePrefixes(prefixes: string[]): Promise<boolean> {
    if (prefixes.length === 0) {
      return true;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/zones/${this.config.zoneId}/purge_cache`,
        { prefixes },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        console.log(`✅ Purged prefixes: ${prefixes.join(', ')}`);
        return true;
      } else {
        console.error('❌ Prefix purge failed:', response.data.errors);
        return false;
      }
    } catch (error) {
      console.error('Prefix purge error:', error);
      return false;
    }
  }

  /**
   * Smart purge with multiple options
   */
  async purge(options: PurgeOptions): Promise<boolean> {
    const { files, tags, hosts, prefixes } = options;

    const results = await Promise.all([
      files && files.length > 0 ? this.purgeFiles(files) : Promise.resolve(true),
      tags && tags.length > 0 ? this.purgeTags(tags) : Promise.resolve(true),
      hosts && hosts.length > 0 ? this.purgeHosts(hosts) : Promise.resolve(true),
      prefixes && prefixes.length > 0 ? this.purgePrefixes(prefixes) : Promise.resolve(true)
    ]);

    return results.every(result => result === true);
  }

  /**
   * Purge static assets
   */
  async purgeStaticAssets(domain: string): Promise<boolean> {
    const files = [
      `https://${domain}/assets/*.js`,
      `https://${domain}/assets/*.css`,
      `https://${domain}/*.js`,
      `https://${domain}/*.css`
    ];

    return this.purgeFiles(files);
  }

  /**
   * Purge API cache
   */
  async purgeAPI(domain: string): Promise<boolean> {
    return this.purgePrefixes([`https://${domain}/api/`]);
  }

  /**
   * Purge NFT metadata
   */
  async purgeNFTMetadata(tokenId: string, domain: string): Promise<boolean> {
    const files = [
      `https://${domain}/api/v1/nft/${tokenId}`,
      `https://${domain}/metadata/${tokenId}.json`
    ];

    return this.purgeFiles(files);
  }

  /**
   * Purge IPFS content
   */
  async purgeIPFS(cid: string, domain: string): Promise<boolean> {
    return this.purgePrefixes([`https://${domain}/ipfs/${cid}`]);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/zones/${this.config.zoneId}/analytics/dashboard`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            since: -10080, // Last 7 days
            until: 0
          }
        }
      );

      if (response.data.success) {
        return response.data.result;
      } else {
        console.error('Failed to get cache stats:', response.data.errors);
        return null;
      }
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  }
}

// Singleton instance
let cdnPurgeService: CDNPurgeService | null = null;

export function initCDNPurgeService(config: CloudflareConfig): CDNPurgeService {
  cdnPurgeService = new CDNPurgeService(config);
  return cdnPurgeService;
}

export function getCDNPurgeService(): CDNPurgeService {
  if (!cdnPurgeService) {
    throw new Error('CDN Purge Service not initialized. Call initCDNPurgeService first.');
  }
  return cdnPurgeService;
}

// Helper functions for common purge operations
export async function purgeOnNFTMint(tokenId: string, domain: string = 'knowton.io'): Promise<void> {
  const service = getCDNPurgeService();
  await service.purge({
    files: [
      `https://${domain}/api/v1/nft/${tokenId}`,
      `https://${domain}/api/v1/nft/list`,
      `https://${domain}/api/v1/nft/trending`
    ],
    tags: ['nft', 'marketplace']
  });
}

export async function purgeOnTrade(tokenId: string, domain: string = 'knowton.io'): Promise<void> {
  const service = getCDNPurgeService();
  await service.purge({
    files: [
      `https://${domain}/api/v1/nft/${tokenId}`,
      `https://${domain}/api/v1/marketplace/stats`,
      `https://${domain}/api/v1/trading/orderbook/${tokenId}`
    ],
    tags: ['trading', 'marketplace']
  });
}

export async function purgeOnDeploy(domain: string = 'knowton.io'): Promise<void> {
  const service = getCDNPurgeService();
  await service.purgeAll();
  
  // Warm up critical pages
  const criticalPages = [
    `https://${domain}/`,
    `https://${domain}/marketplace`,
    `https://${domain}/api/v1/nft/trending`
  ];
  
  for (const page of criticalPages) {
    try {
      await axios.get(page);
      console.log(`Warmed up: ${page}`);
    } catch (error) {
      console.error(`Failed to warm up ${page}:`, error);
    }
  }
}
