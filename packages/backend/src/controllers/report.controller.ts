import { Request, Response } from 'express';
import { ReportService } from '../services/report.service';

const reportService = new ReportService();

export class ReportController {
  /**
   * Generate earnings report
   * GET /api/v1/reports/earnings/:address
   */
  async generateEarningsReport(req: Request, res: Response) {
    try {
      const { address } = req.params;
      const { format = 'pdf', startDate, endDate } = req.query;

      // Validate format
      if (!['pdf', 'csv', 'json'].includes(format as string)) {
        return res.status(400).json({
          error: 'Invalid format. Supported formats: pdf, csv, json',
        });
      }

      // Check cache first
      const cacheKey = `report:earnings:${address}:${format}:${startDate}:${endDate}`;
      const cached = await reportService.getCachedReport(cacheKey);
      
      if (cached) {
        return this.sendReport(res, cached, format as string, 'earnings');
      }

      // Generate report
      const report = await reportService.generateEarningsReport(address, {
        format: format as 'pdf' | 'csv' | 'json',
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      // Cache the report
      await reportService.cacheReport(cacheKey, report, 3600); // 1 hour

      this.sendReport(res, report, format as string, 'earnings');
    } catch (error) {
      console.error('Error generating earnings report:', error);
      res.status(500).json({
        error: 'Failed to generate earnings report',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Generate content performance report
   * GET /api/v1/reports/performance/:address
   */
  async generatePerformanceReport(req: Request, res: Response) {
    try {
      const { address } = req.params;
      const { format = 'pdf', startDate, endDate } = req.query;

      // Validate format
      if (!['pdf', 'csv', 'json'].includes(format as string)) {
        return res.status(400).json({
          error: 'Invalid format. Supported formats: pdf, csv, json',
        });
      }

      // Check cache first
      const cacheKey = `report:performance:${address}:${format}:${startDate}:${endDate}`;
      const cached = await reportService.getCachedReport(cacheKey);
      
      if (cached) {
        return this.sendReport(res, cached, format as string, 'performance');
      }

      // Generate report
      const report = await reportService.generateContentPerformanceReport(address, {
        format: format as 'pdf' | 'csv' | 'json',
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      // Cache the report
      await reportService.cacheReport(cacheKey, report, 3600); // 1 hour

      this.sendReport(res, report, format as string, 'performance');
    } catch (error) {
      console.error('Error generating performance report:', error);
      res.status(500).json({
        error: 'Failed to generate performance report',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Helper method to send report with appropriate headers
   */
  private sendReport(
    res: Response,
    report: Buffer | string,
    format: string,
    reportType: string
  ) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `knowton-${reportType}-${timestamp}`;

    switch (format) {
      case 'pdf':
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        res.send(report);
        break;
      
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(report);
        break;
      
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.json(JSON.parse(report as string));
        break;
      
      default:
        res.status(400).json({ error: 'Unsupported format' });
    }
  }
}
