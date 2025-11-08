/**
 * i18n module exports
 * Centralized exports for all internationalization utilities
 */

// Main config
export { default as i18n, SUPPORTED_LANGUAGES, RTL_LANGUAGES } from './config';

// Formatters
export {
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatCompactNumber,
  getTextDirection,
  isRTL,
  formatFileSize,
  formatDuration,
  getCurrencySymbol,
  formatList,
} from './formatters';

// Hooks
export {
  useDateTimeFormat,
  useNumberFormat,
  useTextDirection,
  useFormatters,
  useLocalization,
} from './hooks';
