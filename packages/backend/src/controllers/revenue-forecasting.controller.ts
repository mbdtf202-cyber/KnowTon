import { Request, Response } from 'express';
import { revenueForecastingService } from '../services/revenue-forecasting.service';

export class RevenueForecastingController {
  /**
   * Generate comprehensive revenue forecast report
   */
  async generateForecastReport(req: Request, res: Response): Promise<void> {
    try {
      const { historicalDays, forecastDays } = req.query;

      const histDays = historicalDays ? parseInt(historicalDays as string) : 90;
      const fcstDays = forecastDays ? parseInt(forecastDays as string) : 30;

      if (histDays < 7 || histDays > 365) {
        res.status(400).json({ error: 'historicalDays must be between 7 and 365' });
        return;
      }

      if (fcstDays < 1 || fcstDays > 90) {
        res.status(400).json({ error: 'forecastDays must be between 1 and 90' });
        return;
      }

      const report = await revenueForecastingService.generateForecastReport(
        histDays,
        fcstDays
      );

      res.json(report);
    } catch (error: any) {
      console.error('Error generating forecast report:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Export forecast report to PDF
   */
  async exportReportToPDF(req: Request, res: Response): Promise<void> {
    try {
      const { historicalDays, forecastDays } = req.query;

      const histDays = historicalDays ? parseInt(historicalDays as string) : 90;
      const fcstDays = forecastDays ? parseInt(forecastDays as string) : 30;

      // Generate report
      const report = await revenueForecastingService.generateForecastReport(
        histDays,
        fcstDays
      );

      // Export to PDF
      const pdfBuffer = await revenueForecastingService.exportToPDF(report);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=revenue-forecast-${Date.now()}.pdf`
      );
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('Error exporting forecast to PDF:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Export forecast report to CSV
   */
  async exportReportToCSV(req: Request, res: Response): Promise<void> {
    try {
      const { historicalDays, forecastDays } = req.query;

      const histDays = historicalDays ? parseInt(historicalDays as string) : 90;
      const fcstDays = forecastDays ? parseInt(forecastDays as string) : 30;

      // Generate report
      const report = await revenueForecastingService.generateForecastReport(
        histDays,
        fcstDays
      );

      // Export to CSV
      const csv = await revenueForecastingService.exportToCSV(report);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=revenue-forecast-${Date.now()}.csv`
      );
      res.send(csv);
    } catch (error: any) {
      console.error('Error exporting forecast to CSV:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const revenueForecastingController = new RevenueForecastingController();
