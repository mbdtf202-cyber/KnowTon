import { Router } from 'express';
import { revenueForecastingController } from '../controllers/revenue-forecasting.controller';

const router = Router();

// Generate comprehensive forecast report
router.get('/report', revenueForecastingController.generateForecastReport);

// Export forecast report to PDF
router.get('/export/pdf', revenueForecastingController.exportReportToPDF);

// Export forecast report to CSV
router.get('/export/csv', revenueForecastingController.exportReportToCSV);

export default router;
