import { Router } from 'express';
import multer from 'multer';
import brandingController from '../controllers/branding.controller';
import { resolveTenant, requireTenant } from '../middleware/tenant.middleware';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
});

// Apply tenant middleware to all routes
router.use(resolveTenant);
router.use(requireTenant);

/**
 * @route   GET /api/v1/branding
 * @desc    Get tenant branding configuration
 * @access  Private (requires tenant context)
 */
router.get('/', brandingController.getBranding);

/**
 * @route   PUT /api/v1/branding
 * @desc    Update tenant branding
 * @access  Private (requires tenant context)
 */
router.put('/', brandingController.updateBranding);

/**
 * @route   POST /api/v1/branding/logo
 * @desc    Upload logo
 * @access  Private (requires tenant context)
 */
router.post('/logo', upload.single('logo'), brandingController.uploadLogo);

/**
 * @route   GET /api/v1/branding/theme.css
 * @desc    Get generated theme CSS
 * @access  Public
 */
router.get('/theme.css', brandingController.getThemeCSS);

/**
 * @route   POST /api/v1/branding/preview
 * @desc    Preview branding without saving
 * @access  Private
 */
router.post('/preview', brandingController.previewBranding);

/**
 * @route   POST /api/v1/branding/reset
 * @desc    Reset branding to defaults
 * @access  Private (requires tenant context)
 */
router.post('/reset', brandingController.resetBranding);

export default router;
