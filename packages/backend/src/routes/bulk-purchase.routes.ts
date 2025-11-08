import { Router, Request, Response } from 'express';
import { bulkPurchaseService } from '../services/bulk-purchase.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Create bulk purchase
 * POST /api/v1/bulk-purchase/create
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { enterpriseId, items, currency, paymentMethod, metadata } = req.body;

    // Validate required fields
    if (!enterpriseId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: enterpriseId, items (array)',
      });
    }

    // Validate items
    for (const item of items) {
      if (!item.contentId || !item.quantity || !item.price) {
        return res.status(400).json({
          error: 'Each item must have contentId, quantity, and price',
        });
      }
    }

    const purchase = await bulkPurchaseService.createBulkPurchase({
      enterpriseId,
      items,
      currency,
      paymentMethod,
      metadata,
    });

    res.json({
      success: true,
      data: purchase,
    });
  } catch (error: any) {
    logger.error('Error creating bulk purchase', { error });
    res.status(500).json({
      error: error.message || 'Failed to create bulk purchase',
    });
  }
});

/**
 * Process enterprise checkout
 * POST /api/v1/bulk-purchase/:purchaseId/checkout
 */
router.post('/:purchaseId/checkout', async (req: Request, res: Response) => {
  try {
    const { purchaseId } = req.params;

    const result = await bulkPurchaseService.processEnterpriseCheckout(purchaseId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error processing enterprise checkout', { error });
    res.status(500).json({
      error: error.message || 'Failed to process checkout',
    });
  }
});

/**
 * Complete bulk purchase
 * POST /api/v1/bulk-purchase/:purchaseId/complete
 */
router.post('/:purchaseId/complete', async (req: Request, res: Response) => {
  try {
    const { purchaseId } = req.params;

    const result = await bulkPurchaseService.completeBulkPurchase(purchaseId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error completing bulk purchase', { error });
    res.status(500).json({
      error: error.message || 'Failed to complete purchase',
    });
  }
});

/**
 * Get bulk purchase details
 * GET /api/v1/bulk-purchase/:purchaseId
 */
router.get('/:purchaseId', async (req: Request, res: Response) => {
  try {
    const { purchaseId } = req.params;

    const purchase = await bulkPurchaseService['prisma'].bulkPurchase.findUnique({
      where: { id: purchaseId },
      include: {
        enterprise: true,
        invoices: true,
      },
    });

    if (!purchase) {
      return res.status(404).json({
        error: 'Bulk purchase not found',
      });
    }

    res.json({
      success: true,
      data: purchase,
    });
  } catch (error: any) {
    logger.error('Error getting bulk purchase', { error });
    res.status(500).json({
      error: error.message || 'Failed to get bulk purchase',
    });
  }
});

/**
 * Create enterprise license
 * POST /api/v1/bulk-purchase/licenses/create
 */
router.post('/licenses/create', async (req: Request, res: Response) => {
  try {
    const { enterpriseId, contentId, totalSeats, pricePerSeat, currency, expiresAt, metadata } =
      req.body;

    // Validate required fields
    if (!enterpriseId || !contentId || !totalSeats || !pricePerSeat) {
      return res.status(400).json({
        error: 'Missing required fields: enterpriseId, contentId, totalSeats, pricePerSeat',
      });
    }

    const license = await bulkPurchaseService.createEnterpriseLicense({
      enterpriseId,
      contentId,
      totalSeats: parseInt(totalSeats),
      pricePerSeat: parseFloat(pricePerSeat),
      currency,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      metadata,
    });

    res.json({
      success: true,
      data: license,
    });
  } catch (error: any) {
    logger.error('Error creating enterprise license', { error });
    res.status(500).json({
      error: error.message || 'Failed to create license',
    });
  }
});

/**
 * Get license details
 * GET /api/v1/bulk-purchase/licenses/:licenseId
 */
router.get('/licenses/:licenseId', async (req: Request, res: Response) => {
  try {
    const { licenseId } = req.params;

    const license = await bulkPurchaseService.getLicense(licenseId);

    res.json({
      success: true,
      data: license,
    });
  } catch (error: any) {
    logger.error('Error getting license', { error });
    res.status(404).json({
      error: error.message || 'License not found',
    });
  }
});

/**
 * List enterprise licenses
 * GET /api/v1/bulk-purchase/enterprises/:enterpriseId/licenses
 */
router.get('/enterprises/:enterpriseId/licenses', async (req: Request, res: Response) => {
  try {
    const { enterpriseId } = req.params;
    const { limit, offset } = req.query;

    const result = await bulkPurchaseService.listLicenses(enterpriseId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error listing licenses', { error });
    res.status(500).json({
      error: error.message || 'Failed to list licenses',
    });
  }
});

/**
 * Assign seat to user
 * POST /api/v1/bulk-purchase/licenses/:licenseId/seats/assign
 */
router.post('/licenses/:licenseId/seats/assign', async (req: Request, res: Response) => {
  try {
    const { licenseId } = req.params;
    const { userEmail, userId } = req.body;

    if (!userEmail) {
      return res.status(400).json({
        error: 'Missing required field: userEmail',
      });
    }

    const seat = await bulkPurchaseService.assignSeat(licenseId, userEmail, userId);

    res.json({
      success: true,
      data: seat,
    });
  } catch (error: any) {
    logger.error('Error assigning seat', { error });
    res.status(500).json({
      error: error.message || 'Failed to assign seat',
    });
  }
});

/**
 * Revoke seat from user
 * POST /api/v1/bulk-purchase/seats/:seatId/revoke
 */
router.post('/seats/:seatId/revoke', async (req: Request, res: Response) => {
  try {
    const { seatId } = req.params;

    const seat = await bulkPurchaseService.revokeSeat(seatId);

    res.json({
      success: true,
      data: seat,
    });
  } catch (error: any) {
    logger.error('Error revoking seat', { error });
    res.status(500).json({
      error: error.message || 'Failed to revoke seat',
    });
  }
});

/**
 * Track license usage
 * POST /api/v1/bulk-purchase/licenses/:licenseId/usage
 */
router.post('/licenses/:licenseId/usage', async (req: Request, res: Response) => {
  try {
    const { licenseId } = req.params;
    const { userEmail, action, metadata } = req.body;

    if (!userEmail || !action) {
      return res.status(400).json({
        error: 'Missing required fields: userEmail, action',
      });
    }

    const usage = await bulkPurchaseService.trackUsage(licenseId, userEmail, action, metadata);

    res.json({
      success: true,
      data: usage,
    });
  } catch (error: any) {
    logger.error('Error tracking usage', { error });
    res.status(500).json({
      error: error.message || 'Failed to track usage',
    });
  }
});

/**
 * Get license usage statistics
 * GET /api/v1/bulk-purchase/licenses/:licenseId/stats
 */
router.get('/licenses/:licenseId/stats', async (req: Request, res: Response) => {
  try {
    const { licenseId } = req.params;
    const { startDate, endDate } = req.query;

    const stats = await bulkPurchaseService.getLicenseUsageStats(
      licenseId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error getting usage stats', { error });
    res.status(500).json({
      error: error.message || 'Failed to get usage stats',
    });
  }
});

/**
 * Generate invoice for purchase
 * POST /api/v1/bulk-purchase/:purchaseId/invoice
 */
router.post('/:purchaseId/invoice', async (req: Request, res: Response) => {
  try {
    const { purchaseId } = req.params;

    const invoice = await bulkPurchaseService.generateInvoice(purchaseId);

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error: any) {
    logger.error('Error generating invoice', { error });
    res.status(500).json({
      error: error.message || 'Failed to generate invoice',
    });
  }
});

/**
 * Calculate bulk discount
 * POST /api/v1/bulk-purchase/calculate-discount
 */
router.post('/calculate-discount', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        error: 'Missing required field: items (array)',
      });
    }

    const totalItems = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 0),
      0
    );

    const discountPercent = bulkPurchaseService.calculateBulkDiscount(totalItems);
    const discountAmount = (totalAmount * discountPercent) / 100;
    const finalAmount = totalAmount - discountAmount;

    res.json({
      success: true,
      data: {
        totalItems,
        totalAmount,
        discountPercent,
        discountAmount,
        finalAmount,
      },
    });
  } catch (error: any) {
    logger.error('Error calculating discount', { error });
    res.status(500).json({
      error: error.message || 'Failed to calculate discount',
    });
  }
});

/**
 * Export enterprise usage report
 * GET /api/v1/bulk-purchase/enterprises/:enterpriseId/reports/export
 */
router.get('/enterprises/:enterpriseId/reports/export', async (req: Request, res: Response) => {
  try {
    const { enterpriseId } = req.params;
    const { format = 'csv', period = '30d' } = req.query;

    if (!['csv', 'pdf'].includes(format as string)) {
      return res.status(400).json({
        error: 'Invalid format. Must be csv or pdf',
      });
    }

    const report = await bulkPurchaseService.generateUsageReport(
      enterpriseId,
      format as 'csv' | 'pdf',
      period as string
    );

    // Set appropriate headers
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="enterprise-report-${Date.now()}.csv"`
      );
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="enterprise-report-${Date.now()}.pdf"`
      );
    }

    res.send(report);
  } catch (error: any) {
    logger.error('Error exporting report', { error });
    res.status(500).json({
      error: error.message || 'Failed to export report',
    });
  }
});

/**
 * Get enterprise dashboard stats
 * GET /api/v1/bulk-purchase/enterprises/:enterpriseId/dashboard
 */
router.get('/enterprises/:enterpriseId/dashboard', async (req: Request, res: Response) => {
  try {
    const { enterpriseId } = req.params;
    const { period = '30d' } = req.query;

    const stats = await bulkPurchaseService.getDashboardStats(enterpriseId, period as string);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error getting dashboard stats', { error });
    res.status(500).json({
      error: error.message || 'Failed to get dashboard stats',
    });
  }
});

export default router;
