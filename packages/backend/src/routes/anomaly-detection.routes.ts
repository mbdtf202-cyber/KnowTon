import { Router } from 'express';
import { AnomalyDetectionController } from '../controllers/anomaly-detection.controller';

const router = Router();
const controller = new AnomalyDetectionController();

/**
 * @route GET /api/v1/anomaly-detection/active
 * @desc Get active anomalies
 * @query metric, severity, type
 */
router.get('/active', (req, res) => controller.getActiveAnomalies(req, res));

/**
 * @route GET /api/v1/anomaly-detection/history
 * @desc Get anomaly history
 * @query startDate, endDate, metric, severity, type
 */
router.get('/history', (req, res) => controller.getAnomalyHistory(req, res));

/**
 * @route GET /api/v1/anomaly-detection/statistics
 * @desc Get anomaly statistics
 * @query startDate, endDate
 */
router.get('/statistics', (req, res) => controller.getAnomalyStatistics(req, res));

/**
 * @route GET /api/v1/anomaly-detection/:alertId/investigate
 * @desc Investigate an anomaly
 * @param alertId
 */
router.get('/:alertId/investigate', (req, res) => controller.investigateAnomaly(req, res));

/**
 * @route POST /api/v1/anomaly-detection/:alertId/acknowledge
 * @desc Acknowledge an anomaly
 * @param alertId
 * @body acknowledgedBy
 */
router.post('/:alertId/acknowledge', (req, res) => controller.acknowledgeAnomaly(req, res));

/**
 * @route POST /api/v1/anomaly-detection/:alertId/resolve
 * @desc Resolve an anomaly
 * @param alertId
 * @body notes
 */
router.post('/:alertId/resolve', (req, res) => controller.resolveAnomaly(req, res));

/**
 * @route PUT /api/v1/anomaly-detection/config
 * @desc Update detection configuration
 * @body DetectionConfig
 */
router.put('/config', (req, res) => controller.updateDetectionConfig(req, res));

export default router;
