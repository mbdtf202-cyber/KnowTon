import express from 'express';
import tenantController from '../controllers/tenant.controller';
import { resolveTenant, requireTenant } from '../middleware/tenant.middleware';

const router = express.Router();

// Apply tenant resolution middleware to all routes
router.use(resolveTenant);

// Public routes (no tenant required)
router.post('/', tenantController.createTenant);
router.get('/', tenantController.listTenants);
router.get('/slug/:slug', tenantController.getTenantBySlug);
router.get('/:id', tenantController.getTenant);

// Tenant-specific routes (require tenant context)
router.get('/current/info', requireTenant, tenantController.getCurrentTenant);

// Admin routes (require authentication - add auth middleware as needed)
router.put('/:id', tenantController.updateTenant);
router.put('/:id/config', tenantController.updateTenantConfig);
router.delete('/:id', tenantController.deleteTenant);
router.post('/:id/suspend', tenantController.suspendTenant);
router.post('/:id/activate', tenantController.activateTenant);

// API key management
router.post('/:id/api-keys', tenantController.createApiKey);
router.get('/:id/api-keys', tenantController.listApiKeys);
router.delete('/:id/api-keys/:keyId', tenantController.revokeApiKey);

// Usage and limits
router.get('/:id/usage', tenantController.getTenantUsage);
router.get('/:id/limits', tenantController.checkLimits);

export default router;
