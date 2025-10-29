import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import { Readable } from 'stream';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface ReportOptions {
  format: 'pdf' | 'csv' | 'json';
  startDate?: Date;
  endDate?: Date;
  includeCharts?: boolean;
}

interface EarningsData {
  date: string;
  amount: number;
  source: string;
  tokenId?: string;
}

interface ContentPerformance {
  tokenId: string;
  title: string;
  views: number;
  sales: number;
  revenue: number;
  royalties: number;
}

export class ReportService {
  /**
   * Generate earnings report for a creator
   */
  async generateEarningsReport(
    creatorAddress: string,
    options: ReportOptions
  ): Promise<Buffer | string> {
    // Fetch earnings data
    const earnings = await this.fetchEarningsData(creatorAddress, options);
    
    // Generate report based on format
    switch (options.format) {
      case 'pdf':
        return this.generatePDFReport(earnings, creatorAddress);
      case 'csv':
        return this.generateCSVReport(earnings);
      case 'json':
        return JSON.stringify(earnings, null, 2);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  /**
   * Generate content performance report
   */
  async generateContentPerformanceReport(
    creatorAddress: string,
    options: ReportOptions
  ): Promise<Buffer | string> {
    const performance = await this.fetchContentPerformance(creatorAddress, options);
    
    switch (options.format) {
      case 'pdf':
        return this.generatePerformancePDFReport(performance, creatorAddress);
      case 'csv':
        return this.generatePerformanceCSVReport(performance);
      case 'json':
        return JSON.stringify(performance, null, 2);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  /**
   * Fetch earnings data from database
   */
  private async fetchEarningsData(
    creatorAddress: string,
    options: ReportOptions
  ): Promise<EarningsData[]> {
    const { startDate, endDate } = options;
    
    // Fetch from PostgreSQL
    const distributions = await prisma.royaltyDistribution.findMany({
      where: {
        beneficiaryAddress: creatorAddress,
        ...(startDate && endDate && {
          distributedAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
      },
      orderBy: {
        distributedAt: 'desc',
      },
    });

    return distributions.map(d => ({
      date: d.distributedAt.toISOString().split('T')[0],
      amount: parseFloat(d.amount),
      source: 'royalty',
      tokenId: d.tokenId,
    }));
  }

  /**
   * Fetch content performance data
   */
  private async fetchContentPerformance(
    creatorAddress: string,
    options: ReportOptions
  ): Promise<ContentPerformance[]> {
    // Fetch NFTs created by this creator
    const nfts = await prisma.nFT.findMany({
      where: {
        creatorAddress,
      },
      include: {
        transactions: {
          where: {
            ...(options.startDate && options.endDate && {
              timestamp: {
                gte: options.startDate,
                lte: options.endDate,
              },
            }),
          },
        },
      },
    });

    return nfts.map(nft => {
      const sales = nft.transactions.filter(t => t.type === 'sale').length;
      const revenue = nft.transactions
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const royalties = nft.transactions
        .filter(t => t.type === 'royalty')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      return {
        tokenId: nft.tokenId,
        title: nft.metadata?.title || `NFT #${nft.tokenId}`,
        views: nft.views || 0,
        sales,
        revenue,
        royalties,
      };
    });
  }

  /**
   * Generate PDF report for earnings
   */
  private async generatePDFReport(
    earnings: EarningsData[],
    creatorAddress: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(20)
        .text('KnowTon Platform - Earnings Report', { align: 'center' })
        .moveDown();

      doc
        .fontSize(12)
        .text(`Creator: ${creatorAddress}`)
        .text(`Generated: ${new Date().toLocaleDateString()}`)
        .moveDown();

      // Summary
      const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
      doc
        .fontSize(16)
        .text('Summary', { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .text(`Total Earnings: ${totalEarnings.toFixed(4)} ETH`)
        .text(`Number of Transactions: ${earnings.length}`)
        .moveDown();

      // Detailed breakdown
      doc
        .fontSize(16)
        .text('Detailed Breakdown', { underline: true })
        .moveDown(0.5);

      // Table header
      const tableTop = doc.y;
      doc
        .fontSize(10)
        .text('Date', 50, tableTop, { width: 100 })
        .text('Amount (ETH)', 150, tableTop, { width: 100 })
        .text('Source', 250, tableTop, { width: 100 })
        .text('Token ID', 350, tableTop, { width: 100 });

      doc.moveDown();

      // Table rows
      earnings.slice(0, 50).forEach((earning, i) => {
        const y = doc.y;
        doc
          .fontSize(9)
          .text(earning.date, 50, y, { width: 100 })
          .text(earning.amount.toFixed(4), 150, y, { width: 100 })
          .text(earning.source, 250, y, { width: 100 })
          .text(earning.tokenId || 'N/A', 350, y, { width: 100 });
        
        doc.moveDown(0.5);
      });

      if (earnings.length > 50) {
        doc.text(`... and ${earnings.length - 50} more transactions`);
      }

      // Footer
      doc
        .moveDown(2)
        .fontSize(8)
        .text('This report is generated automatically by KnowTon Platform', {
          align: 'center',
        });

      doc.end();
    });
  }

  /**
   * Generate CSV report for earnings
   */
  private generateCSVReport(earnings: EarningsData[]): string {
    const fields = ['date', 'amount', 'source', 'tokenId'];
    const parser = new Parser({ fields });
    return parser.parse(earnings);
  }

  /**
   * Generate PDF report for content performance
   */
  private async generatePerformancePDFReport(
    performance: ContentPerformance[],
    creatorAddress: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(20)
        .text('KnowTon Platform - Content Performance Report', { align: 'center' })
        .moveDown();

      doc
        .fontSize(12)
        .text(`Creator: ${creatorAddress}`)
        .text(`Generated: ${new Date().toLocaleDateString()}`)
        .moveDown();

      // Summary
      const totalRevenue = performance.reduce((sum, p) => sum + p.revenue, 0);
      const totalSales = performance.reduce((sum, p) => sum + p.sales, 0);
      const totalViews = performance.reduce((sum, p) => sum + p.views, 0);

      doc
        .fontSize(16)
        .text('Summary', { underline: true })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .text(`Total Content Items: ${performance.length}`)
        .text(`Total Revenue: ${totalRevenue.toFixed(4)} ETH`)
        .text(`Total Sales: ${totalSales}`)
        .text(`Total Views: ${totalViews}`)
        .moveDown();

      // Top performing content
      doc
        .fontSize(16)
        .text('Top Performing Content', { underline: true })
        .moveDown(0.5);

      const topContent = performance
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Table header
      const tableTop = doc.y;
      doc
        .fontSize(9)
        .text('Title', 50, tableTop, { width: 150 })
        .text('Views', 200, tableTop, { width: 60 })
        .text('Sales', 260, tableTop, { width: 60 })
        .text('Revenue', 320, tableTop, { width: 80 })
        .text('Royalties', 400, tableTop, { width: 80 });

      doc.moveDown();

      // Table rows
      topContent.forEach((item) => {
        const y = doc.y;
        doc
          .fontSize(8)
          .text(item.title.substring(0, 30), 50, y, { width: 150 })
          .text(item.views.toString(), 200, y, { width: 60 })
          .text(item.sales.toString(), 260, y, { width: 60 })
          .text(item.revenue.toFixed(4), 320, y, { width: 80 })
          .text(item.royalties.toFixed(4), 400, y, { width: 80 });
        
        doc.moveDown(0.5);
      });

      // Footer
      doc
        .moveDown(2)
        .fontSize(8)
        .text('This report is generated automatically by KnowTon Platform', {
          align: 'center',
        });

      doc.end();
    });
  }

  /**
   * Generate CSV report for content performance
   */
  private generatePerformanceCSVReport(performance: ContentPerformance[]): string {
    const fields = ['tokenId', 'title', 'views', 'sales', 'revenue', 'royalties'];
    const parser = new Parser({ fields });
    return parser.parse(performance);
  }

  /**
   * Cache report for quick access
   */
  async cacheReport(
    key: string,
    data: Buffer | string,
    ttl: number = 3600
  ): Promise<void> {
    await redis.setex(key, ttl, data.toString('base64'));
  }

  /**
   * Get cached report
   */
  async getCachedReport(key: string): Promise<Buffer | null> {
    const cached = await redis.get(key);
    if (!cached) return null;
    return Buffer.from(cached, 'base64');
  }
}
