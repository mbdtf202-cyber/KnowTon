import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

export interface BulkPurchaseItem {
  contentId: string;
  quantity: number;
  seats?: number;
  price: number;
}

export interface CreateBulkPurchaseParams {
  enterpriseId: string;
  items: BulkPurchaseItem[];
  currency?: string;
  paymentMethod?: string;
  metadata?: Record<string, any>;
}

export interface CreateEnterpriseLicenseParams {
  enterpriseId: string;
  contentId: string;
  totalSeats: number;
  pricePerSeat: number;
  currency?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export class BulkPurchaseService {
  /**
   * Calculate bulk discount based on quantity
   * >10: 20% off, >50: 30% off
   */
  calculateBulkDiscount(totalItems: number): number {
    if (totalItems > 50) {
      return 30; // 30% discount
    } else if (totalItems > 10) {
      return 20; // 20% discount
    }
    return 0; // No discount
  }

  /**
   * Create bulk purchase with automatic discount calculation
   */
  async createBulkPurchase(params: CreateBulkPurchaseParams) {
    try {
      const { enterpriseId, items, currency = 'USD', paymentMethod = 'stripe', metadata } = params;

      // Validate enterprise account
      const enterprise = await prisma.enterpriseAccount.findUnique({
        where: { id: enterpriseId },
      });

      if (!enterprise) {
        throw new Error('Enterprise account not found');
      }

      if (enterprise.status !== 'active') {
        throw new Error('Enterprise account is not active');
      }

      // Calculate totals
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Apply bulk discount
      const discountPercent = this.calculateBulkDiscount(totalItems);
      const discountAmount = (totalAmount * discountPercent) / 100;
      const finalAmount = totalAmount - discountAmount;

      // Generate purchase order ID
      const purchaseOrderId = `PO-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

      // Create bulk purchase record
      const bulkPurchase = await prisma.bulkPurchase.create({
        data: {
          enterpriseId,
          purchaseOrderId,
          totalItems,
          totalAmount,
          discountPercent,
          discountAmount,
          finalAmount,
          currency,
          paymentMethod,
          paymentStatus: 'pending',
          items: items as any,
          metadata: metadata as any,
        },
      });

      logger.info('Bulk purchase created', {
        purchaseId: bulkPurchase.id,
        purchaseOrderId,
        totalItems,
        finalAmount,
        discountPercent,
      });

      return bulkPurchase;
    } catch (error) {
      logger.error('Error creating bulk purchase', { error });
      throw error;
    }
  }

  /**
   * Process enterprise checkout with Stripe
   */
  async processEnterpriseCheckout(purchaseId: string) {
    try {
      const purchase = await prisma.bulkPurchase.findUnique({
        where: { id: purchaseId },
        include: { enterprise: true },
      });

      if (!purchase) {
        throw new Error('Bulk purchase not found');
      }

      if (purchase.paymentStatus !== 'pending') {
        throw new Error('Purchase already processed');
      }

      // Create Stripe payment intent for enterprise
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(Number(purchase.finalAmount) * 100), // Convert to cents
        currency: purchase.currency.toLowerCase(),
        metadata: {
          purchaseId: purchase.id,
          purchaseOrderId: purchase.purchaseOrderId,
          enterpriseId: purchase.enterpriseId,
          type: 'bulk_purchase',
        },
        description: `Bulk Purchase ${purchase.purchaseOrderId} - ${purchase.totalItems} items`,
      });

      // Update purchase with payment ID
      await prisma.bulkPurchase.update({
        where: { id: purchaseId },
        data: {
          paymentId: paymentIntent.id,
          paymentStatus: 'processing',
        },
      });

      logger.info('Enterprise checkout initiated', {
        purchaseId,
        paymentIntentId: paymentIntent.id,
      });

      return {
        purchaseId: purchase.id,
        purchaseOrderId: purchase.purchaseOrderId,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: purchase.finalAmount,
        currency: purchase.currency,
      };
    } catch (error) {
      logger.error('Error processing enterprise checkout', { error });
      throw error;
    }
  }

  /**
   * Complete bulk purchase and create licenses
   */
  async completeBulkPurchase(purchaseId: string) {
    try {
      const purchase = await prisma.bulkPurchase.findUnique({
        where: { id: purchaseId },
        include: { enterprise: true },
      });

      if (!purchase) {
        throw new Error('Bulk purchase not found');
      }

      // Create licenses for each item
      const items = purchase.items as any[];
      const licenses = [];

      for (const item of items) {
        const license = await this.createEnterpriseLicense({
          enterpriseId: purchase.enterpriseId,
          contentId: item.contentId,
          totalSeats: item.seats || item.quantity,
          pricePerSeat: item.price,
          currency: purchase.currency,
        });
        licenses.push(license);
      }

      // Update purchase status
      await prisma.bulkPurchase.update({
        where: { id: purchaseId },
        data: {
          paymentStatus: 'completed',
          completedAt: new Date(),
        },
      });

      // Generate invoice
      const invoice = await this.generateInvoice(purchaseId);

      logger.info('Bulk purchase completed', {
        purchaseId,
        licensesCreated: licenses.length,
        invoiceId: invoice.id,
      });

      return {
        purchase,
        licenses,
        invoice,
      };
    } catch (error) {
      logger.error('Error completing bulk purchase', { error });
      throw error;
    }
  }

  /**
   * Create enterprise license with seat management
   */
  async createEnterpriseLicense(params: CreateEnterpriseLicenseParams) {
    try {
      const {
        enterpriseId,
        contentId,
        totalSeats,
        pricePerSeat,
        currency = 'USD',
        expiresAt,
        metadata,
      } = params;

      // Generate unique license key
      const licenseKey = `LIC-${Date.now()}-${uuidv4().substring(0, 12).toUpperCase()}`;

      // Calculate total amount
      const totalAmount = pricePerSeat * totalSeats;

      // Create license
      const license = await prisma.enterpriseLicense.create({
        data: {
          licenseKey,
          enterpriseId,
          contentId,
          totalSeats,
          usedSeats: 0,
          pricePerSeat,
          totalAmount,
          discountPercent: 0,
          currency,
          status: 'active',
          expiresAt,
          metadata: metadata as any,
        },
      });

      logger.info('Enterprise license created', {
        licenseId: license.id,
        licenseKey,
        totalSeats,
      });

      return license;
    } catch (error) {
      logger.error('Error creating enterprise license', { error });
      throw error;
    }
  }

  /**
   * Assign seat to user
   */
  async assignSeat(licenseId: string, userEmail: string, userId?: string) {
    try {
      const license = await prisma.enterpriseLicense.findUnique({
        where: { id: licenseId },
      });

      if (!license) {
        throw new Error('License not found');
      }

      if (license.status !== 'active') {
        throw new Error('License is not active');
      }

      if (license.usedSeats >= license.totalSeats) {
        throw new Error('No available seats');
      }

      // Check if seat already assigned
      const existingSeat = await prisma.enterpriseLicenseSeat.findUnique({
        where: {
          licenseId_userEmail: {
            licenseId,
            userEmail,
          },
        },
      });

      if (existingSeat) {
        if (existingSeat.status === 'active') {
          throw new Error('Seat already assigned to this user');
        }
        // Reactivate revoked seat
        const seat = await prisma.enterpriseLicenseSeat.update({
          where: { id: existingSeat.id },
          data: {
            status: 'active',
            userId,
            revokedAt: null,
          },
        });
        return seat;
      }

      // Create new seat assignment
      const seat = await prisma.enterpriseLicenseSeat.create({
        data: {
          licenseId,
          userEmail,
          userId,
          status: 'active',
        },
      });

      // Update used seats count
      await prisma.enterpriseLicense.update({
        where: { id: licenseId },
        data: {
          usedSeats: { increment: 1 },
        },
      });

      logger.info('Seat assigned', {
        licenseId,
        seatId: seat.id,
        userEmail,
      });

      return seat;
    } catch (error) {
      logger.error('Error assigning seat', { error });
      throw error;
    }
  }

  /**
   * Revoke seat from user
   */
  async revokeSeat(seatId: string) {
    try {
      const seat = await prisma.enterpriseLicenseSeat.findUnique({
        where: { id: seatId },
      });

      if (!seat) {
        throw new Error('Seat not found');
      }

      if (seat.status !== 'active') {
        throw new Error('Seat is not active');
      }

      // Revoke seat
      await prisma.enterpriseLicenseSeat.update({
        where: { id: seatId },
        data: {
          status: 'revoked',
          revokedAt: new Date(),
        },
      });

      // Decrement used seats count
      await prisma.enterpriseLicense.update({
        where: { id: seat.licenseId },
        data: {
          usedSeats: { decrement: 1 },
        },
      });

      logger.info('Seat revoked', {
        seatId,
        licenseId: seat.licenseId,
      });

      return seat;
    } catch (error) {
      logger.error('Error revoking seat', { error });
      throw error;
    }
  }

  /**
   * Track license usage
   */
  async trackUsage(
    licenseId: string,
    userEmail: string,
    action: string,
    metadata?: Record<string, any>
  ) {
    try {
      const usage = await prisma.enterpriseLicenseUsage.create({
        data: {
          licenseId,
          userEmail,
          action,
          metadata: metadata as any,
        },
      });

      // Update last used timestamp for seat
      await prisma.enterpriseLicenseSeat.updateMany({
        where: {
          licenseId,
          userEmail,
          status: 'active',
        },
        data: {
          lastUsedAt: new Date(),
        },
      });

      return usage;
    } catch (error) {
      logger.error('Error tracking usage', { error });
      throw error;
    }
  }

  /**
   * Generate invoice for bulk purchase
   */
  async generateInvoice(purchaseId: string) {
    try {
      const purchase = await prisma.bulkPurchase.findUnique({
        where: { id: purchaseId },
        include: { enterprise: true },
      });

      if (!purchase) {
        throw new Error('Bulk purchase not found');
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

      // Prepare line items
      const items = purchase.items as any[];
      const lineItems = items.map((item) => ({
        description: `Content License - ${item.contentId}`,
        quantity: item.quantity,
        unitPrice: item.price,
        amount: item.price * item.quantity,
      }));

      // Add discount line item if applicable
      if (purchase.discountPercent > 0) {
        lineItems.push({
          description: `Bulk Discount (${purchase.discountPercent}%)`,
          quantity: 1,
          unitPrice: -Number(purchase.discountAmount),
          amount: -Number(purchase.discountAmount),
        });
      }

      // Calculate tax (example: 10%)
      const taxRate = 0.1;
      const tax = Number(purchase.finalAmount) * taxRate;
      const totalAmount = Number(purchase.finalAmount) + tax;

      // Create invoice
      const invoice = await prisma.enterpriseInvoice.create({
        data: {
          invoiceNumber,
          enterpriseId: purchase.enterpriseId,
          purchaseId: purchase.id,
          amount: purchase.finalAmount,
          tax,
          totalAmount,
          currency: purchase.currency,
          status: purchase.paymentStatus === 'completed' ? 'paid' : 'sent',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          paidAt: purchase.paymentStatus === 'completed' ? new Date() : null,
          lineItems: lineItems as any,
        },
      });

      // Generate PDF
      await this.generateInvoicePDF(invoice, purchase);
      // In production, upload to S3 and store URL
      const pdfUrl = `invoices/${invoiceNumber}.pdf`;

      // Update invoice with PDF URL
      await prisma.enterpriseInvoice.update({
        where: { id: invoice.id },
        data: { pdfUrl },
      });

      logger.info('Invoice generated', {
        invoiceId: invoice.id,
        invoiceNumber,
        purchaseId,
      });

      return invoice;
    } catch (error) {
      logger.error('Error generating invoice', { error });
      throw error;
    }
  }

  /**
   * Generate invoice PDF
   */
  private async generateInvoicePDF(invoice: any, purchase: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('INVOICE', { align: 'center' });
        doc.moveDown();

        // Invoice details
        doc.fontSize(12);
        doc.text(`Invoice Number: ${invoice.invoiceNumber}`);
        doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`);
        doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`);
        doc.text(`Status: ${invoice.status.toUpperCase()}`);
        doc.moveDown();

        // Enterprise details
        doc.text('Bill To:');
        doc.fontSize(10);
        doc.text(purchase.enterprise.companyName);
        doc.text(purchase.enterprise.companyEmail);
        if (purchase.enterprise.companyAddress) {
          doc.text(purchase.enterprise.companyAddress);
        }
        doc.moveDown();

        // Line items table
        doc.fontSize(12).text('Items:', { underline: true });
        doc.moveDown(0.5);

        const lineItems = invoice.lineItems as any[];
        lineItems.forEach((item: any) => {
          doc.fontSize(10);
          doc.text(
            `${item.description} - Qty: ${item.quantity} x ${invoice.currency} ${item.unitPrice.toFixed(2)} = ${invoice.currency} ${item.amount.toFixed(2)}`
          );
        });

        doc.moveDown();

        // Totals
        doc.fontSize(12);
        doc.text(`Subtotal: ${invoice.currency} ${Number(invoice.amount).toFixed(2)}`, {
          align: 'right',
        });
        doc.text(`Tax: ${invoice.currency} ${Number(invoice.tax).toFixed(2)}`, {
          align: 'right',
        });
        doc.fontSize(14);
        doc.text(`Total: ${invoice.currency} ${Number(invoice.totalAmount).toFixed(2)}`, {
          align: 'right',
          underline: true,
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get license details with seats
   */
  async getLicense(licenseId: string) {
    try {
      const license = await prisma.enterpriseLicense.findUnique({
        where: { id: licenseId },
        include: {
          enterprise: true,
          seats: {
            where: { status: 'active' },
            orderBy: { assignedAt: 'desc' },
          },
          usageRecords: {
            orderBy: { timestamp: 'desc' },
            take: 100,
          },
        },
      });

      if (!license) {
        throw new Error('License not found');
      }

      return license;
    } catch (error) {
      logger.error('Error getting license', { error });
      throw error;
    }
  }

  /**
   * List enterprise licenses
   */
  async listLicenses(enterpriseId: string, options?: { limit?: number; offset?: number }) {
    try {
      const { limit = 20, offset = 0 } = options || {};

      const [licenses, total] = await Promise.all([
        prisma.enterpriseLicense.findMany({
          where: { enterpriseId },
          include: {
            seats: {
              where: { status: 'active' },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.enterpriseLicense.count({ where: { enterpriseId } }),
      ]);

      return {
        licenses,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Error listing licenses', { error });
      throw error;
    }
  }

  /**
   * Get usage statistics for license
   */
  async getLicenseUsageStats(licenseId: string, startDate?: Date, endDate?: Date) {
    try {
      const where: any = { licenseId };

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const [totalUsage, usageByAction, usageByUser] = await Promise.all([
        prisma.enterpriseLicenseUsage.count({ where }),
        prisma.enterpriseLicenseUsage.groupBy({
          by: ['action'],
          where,
          _count: true,
        }),
        prisma.enterpriseLicenseUsage.groupBy({
          by: ['userEmail'],
          where,
          _count: true,
          orderBy: { _count: { userEmail: 'desc' } },
          take: 10,
        }),
      ]);

      return {
        totalUsage,
        usageByAction,
        topUsers: usageByUser,
      };
    } catch (error) {
      logger.error('Error getting usage stats', { error });
      throw error;
    }
  }

  /**
   * Generate usage report in CSV or PDF format
   */
  async generateUsageReport(
    enterpriseId: string,
    format: 'csv' | 'pdf',
    period: string
  ): Promise<Buffer | string> {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Fetch enterprise data
      const enterprise = await prisma.enterpriseAccount.findUnique({
        where: { id: enterpriseId },
      });

      if (!enterprise) {
        throw new Error('Enterprise not found');
      }

      // Fetch licenses
      const licenses = await prisma.enterpriseLicense.findMany({
        where: { enterpriseId },
        include: {
          seats: {
            where: { status: 'active' },
          },
          usageRecords: {
            where: {
              timestamp: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
      });

      // Fetch all usage data for the period
      const usageData = await prisma.enterpriseLicenseUsage.findMany({
        where: {
          licenseId: {
            in: licenses.map((l) => l.id),
          },
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      if (format === 'csv') {
        return this.generateCSVReport(enterprise, licenses, usageData, startDate, endDate);
      } else {
        return this.generatePDFReport(enterprise, licenses, usageData, startDate, endDate);
      }
    } catch (error) {
      logger.error('Error generating usage report', { error });
      throw error;
    }
  }

  /**
   * Generate CSV report
   */
  private generateCSVReport(
    enterprise: any,
    licenses: any[],
    usageData: any[],
    startDate: Date,
    endDate: Date
  ): string {
    const lines: string[] = [];

    // Header
    lines.push(`Enterprise Usage Report`);
    lines.push(`Company: ${enterprise.companyName}`);
    lines.push(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('');

    // License Summary
    lines.push('License Summary');
    lines.push('License Key,Content ID,Total Seats,Used Seats,Status,Expires At');
    licenses.forEach((license) => {
      lines.push(
        `${license.licenseKey},${license.contentId},${license.totalSeats},${license.usedSeats},${license.status},${license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Never'}`
      );
    });
    lines.push('');

    // Usage Details
    lines.push('Usage Details');
    lines.push('Timestamp,License Key,User Email,Action,Metadata');
    usageData.forEach((usage) => {
      const license = licenses.find((l) => l.id === usage.licenseId);
      const metadata = usage.metadata ? JSON.stringify(usage.metadata).replace(/,/g, ';') : '';
      lines.push(
        `${new Date(usage.timestamp).toLocaleString()},${license?.licenseKey || 'N/A'},${usage.userEmail},${usage.action},"${metadata}"`
      );
    });
    lines.push('');

    // Statistics
    lines.push('Statistics');
    const totalSeats = licenses.reduce((sum, l) => sum + l.totalSeats, 0);
    const usedSeats = licenses.reduce((sum, l) => sum + l.usedSeats, 0);
    const utilizationRate = totalSeats > 0 ? ((usedSeats / totalSeats) * 100).toFixed(2) : '0';

    lines.push(`Total Licenses,${licenses.length}`);
    lines.push(`Total Seats,${totalSeats}`);
    lines.push(`Used Seats,${usedSeats}`);
    lines.push(`Utilization Rate,${utilizationRate}%`);
    lines.push(`Total Usage Events,${usageData.length}`);

    // Usage by action
    const usageByAction: Record<string, number> = {};
    usageData.forEach((usage) => {
      usageByAction[usage.action] = (usageByAction[usage.action] || 0) + 1;
    });

    lines.push('');
    lines.push('Usage by Action');
    lines.push('Action,Count');
    Object.entries(usageByAction).forEach(([action, count]) => {
      lines.push(`${action},${count}`);
    });

    // Top users
    const usageByUser: Record<string, number> = {};
    usageData.forEach((usage) => {
      usageByUser[usage.userEmail] = (usageByUser[usage.userEmail] || 0) + 1;
    });

    const topUsers = Object.entries(usageByUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    lines.push('');
    lines.push('Top 10 Users');
    lines.push('User Email,Usage Count');
    topUsers.forEach(([email, count]) => {
      lines.push(`${email},${count}`);
    });

    return lines.join('\n');
  }

  /**
   * Generate PDF report
   */
  private async generatePDFReport(
    enterprise: any,
    licenses: any[],
    usageData: any[],
    startDate: Date,
    endDate: Date
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(24).text('Enterprise Usage Report', { align: 'center' });
        doc.moveDown();

        // Enterprise Info
        doc.fontSize(12);
        doc.text(`Company: ${enterprise.companyName}`);
        doc.text(`Email: ${enterprise.companyEmail}`);
        doc.text(
          `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
        );
        doc.text(`Generated: ${new Date().toLocaleString()}`);
        doc.moveDown();

        // Statistics Summary
        doc.fontSize(16).text('Summary Statistics', { underline: true });
        doc.moveDown(0.5);

        const totalSeats = licenses.reduce((sum, l) => sum + l.totalSeats, 0);
        const usedSeats = licenses.reduce((sum, l) => sum + l.usedSeats, 0);
        const utilizationRate = totalSeats > 0 ? ((usedSeats / totalSeats) * 100).toFixed(2) : '0';

        doc.fontSize(12);
        doc.text(`Total Licenses: ${licenses.length}`);
        doc.text(`Total Seats: ${totalSeats}`);
        doc.text(`Used Seats: ${usedSeats}`);
        doc.text(`Utilization Rate: ${utilizationRate}%`);
        doc.text(`Total Usage Events: ${usageData.length}`);
        doc.moveDown();

        // License Summary
        doc.fontSize(16).text('License Summary', { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(10);
        licenses.forEach((license, index) => {
          if (index > 0 && index % 5 === 0) {
            doc.addPage();
          }
          doc.text(
            `${index + 1}. ${license.licenseKey} - ${license.usedSeats}/${license.totalSeats} seats - ${license.status}`
          );
        });
        doc.moveDown();

        // Usage by Action
        const usageByAction: Record<string, number> = {};
        usageData.forEach((usage) => {
          usageByAction[usage.action] = (usageByAction[usage.action] || 0) + 1;
        });

        doc.addPage();
        doc.fontSize(16).text('Usage by Action', { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12);
        Object.entries(usageByAction).forEach(([action, count]) => {
          doc.text(`${action}: ${count} events`);
        });
        doc.moveDown();

        // Top Users
        const usageByUser: Record<string, number> = {};
        usageData.forEach((usage) => {
          usageByUser[usage.userEmail] = (usageByUser[usage.userEmail] || 0) + 1;
        });

        const topUsers = Object.entries(usageByUser)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        doc.fontSize(16).text('Top 10 Users', { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12);
        topUsers.forEach(([email, count], index) => {
          doc.text(`${index + 1}. ${email}: ${count} events`);
        });

        // Footer
        doc.fontSize(10).text(
          `Report generated by KnowTon Platform - ${new Date().toLocaleString()}`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(enterpriseId: string, period: string) {
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Fetch licenses
      const licenses = await prisma.enterpriseLicense.findMany({
        where: { enterpriseId },
        include: {
          seats: {
            where: { status: 'active' },
          },
        },
      });

      // Calculate stats
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const stats = {
        totalLicenses: licenses.length,
        activeLicenses: licenses.filter((l) => l.status === 'active').length,
        totalSeats: licenses.reduce((sum, l) => sum + l.totalSeats, 0),
        usedSeats: licenses.reduce((sum, l) => sum + l.usedSeats, 0),
        utilizationRate: 0,
        expiringLicenses: licenses.filter((l) => {
          if (!l.expiresAt) return false;
          const expiryDate = new Date(l.expiresAt);
          return expiryDate <= thirtyDaysFromNow && expiryDate > now;
        }).length,
      };

      stats.utilizationRate =
        stats.totalSeats > 0 ? (stats.usedSeats / stats.totalSeats) * 100 : 0;

      // Fetch usage data
      const usageData = await prisma.enterpriseLicenseUsage.findMany({
        where: {
          licenseId: {
            in: licenses.map((l) => l.id),
          },
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Aggregate usage
      const usageByAction: Record<string, number> = {};
      const usageByUser: Record<string, number> = {};
      const usageByLicense: Record<string, number> = {};

      usageData.forEach((usage) => {
        usageByAction[usage.action] = (usageByAction[usage.action] || 0) + 1;
        usageByUser[usage.userEmail] = (usageByUser[usage.userEmail] || 0) + 1;
        usageByLicense[usage.licenseId] = (usageByLicense[usage.licenseId] || 0) + 1;
      });

      return {
        ...stats,
        totalUsage: usageData.length,
        usageByAction: Object.entries(usageByAction).map(([action, count]) => ({
          action,
          count,
        })),
        topUsers: Object.entries(usageByUser)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([email, count]) => ({ email, count })),
        usageByLicense: Object.entries(usageByLicense).map(([licenseId, count]) => ({
          licenseId,
          count,
        })),
      };
    } catch (error) {
      logger.error('Error getting dashboard stats', { error });
      throw error;
    }
  }
}

export const bulkPurchaseService = new BulkPurchaseService();
