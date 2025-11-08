import express from 'express';
import apiCustomizationController from '../controllers/api-customization.controller';
import { resolveTenant, requireTenant } from '../middleware/tenant.middleware';

const router = express.Router();

// Apply tenant resolution middleware
router.use(resolveTenant);

// API Endpoint Management
router.post('/endpoints', apiCustomizationController.createApiEndpoint);
router.get('/endpoints/:tenantId', apiCustomizationController.listApiEndpoints);
router.get('/endpoints/:tenantId/:path/:method', apiCustomizationController.getApiEndpoint);
router.put('/endpoints/:tenantId/:path/:method', apiCustomizationController.updateApiEndpoint);
router.delete('/endpoints/:tenantId/:path/:method', apiCustomizationController.deleteApiEndpoint);

// API Key Management
router.post('/keys/:tenantId', apiCustomizationController.createApiKey);
router.get('/keys/:key/validate', apiCustomizationController.validateApiKey);
router.get('/keys/:keyId/usage', apiCustomizationController.getApiKeyUsage);

// Rate Limiting
router.get('/rate-limit/:tenantId', apiCustomizationController.getTenantRateLimit);

// Security
router.get('/security/:tenantId/ip-whitelist', apiCustomizationController.checkIpWhitelist);
router.get('/security/:tenantId/origin', apiCustomizationController.checkOrigin);

export default router;
