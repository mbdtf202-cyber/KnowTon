import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';

const router = Router();
const reportController = new ReportController();

/**
 * @route   GET /api/v1/reports/earnings/:address
 * @desc    Generate earnings report for a creator
 * @query   format (pdf|csv|json), startDate, endDate
 * @access  Public
 */
router.get('/earnings/:address', (req, res) =>
  reportController.generateEarningsReport(req, res)
);

/**
 * @route   GET /api/v1/reports/performance/:address
 * @desc    Generate content performance report for a creator
 * @query   format (pdf|csv|json), startDate, endDate
 * @access  Public
 */
router.get('/performance/:address', (req, res) =>
  reportController.generatePerformanceReport(req, res)
);

export default router;
