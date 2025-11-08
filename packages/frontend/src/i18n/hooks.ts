/**
 * React hooks for localization formatters
 * Provides reactive formatting that updates when locale changes
 */

import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import {
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

/**
 * Hook for date/time formatting
 * Returns formatting functions that react to locale changes
 */
export const useDateTimeFormat = () => {
  const { i18n } = useTranslation();
  
  return useMemo(() => ({
    formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatDate(date, options),
    formatDateTime: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatDateTime(date, options),
    formatTime: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatTime(date, options),
    formatRelativeTime: (date: Date | string | number) =>
      formatRelativeTime(date),
  }), [i18n.language]);
};

/**
 * Hook for number/currency formatting
 * Returns formatting functions that react to locale changes
 */
export const useNumberFormat = () => {
  const { i18n } = useTranslation();
  
  return useMemo(() => ({
    formatCurrency: (amount: number, currency?: string, options?: Intl.NumberFormatOptions) =>
      formatCurrency(amount, currency, options),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, options),
    formatPercentage: (value: number, normalize?: boolean, options?: Intl.NumberFormatOptions) =>
      formatPercentage(value, normalize, options),
    formatCompactNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      formatCompactNumber(value, options),
    getCurrencySymbol: (currency?: string) =>
      getCurrencySymbol(currency),
  }), [i18n.language]);
};

/**
 * Hook for text direction
 * Returns current text direction and RTL status
 */
export const useTextDirection = () => {
  const { i18n } = useTranslation();
  
  return useMemo(() => ({
    direction: getTextDirection(),
    isRTL: isRTL(),
  }), [i18n.language]);
};

/**
 * Hook for utility formatters
 * Returns various utility formatting functions
 */
export const useFormatters = () => {
  const { i18n } = useTranslation();
  
  return useMemo(() => ({
    formatFileSize: (bytes: number) => formatFileSize(bytes),
    formatDuration: (seconds: number) => formatDuration(seconds),
    formatList: (items: string[], type?: 'conjunction' | 'disjunction' | 'unit') =>
      formatList(items, type),
  }), [i18n.language]);
};

/**
 * Combined hook for all formatters
 * Returns all formatting functions in one object
 */
export const useLocalization = () => {
  const { i18n, t } = useTranslation();
  
  return useMemo(() => ({
    // Translation
    t,
    locale: i18n.language,
    changeLanguage: i18n.changeLanguage,
    
    // Date/Time
    formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatDate(date, options),
    formatDateTime: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatDateTime(date, options),
    formatTime: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatTime(date, options),
    formatRelativeTime: (date: Date | string | number) =>
      formatRelativeTime(date),
    
    // Numbers/Currency
    formatCurrency: (amount: number, currency?: string, options?: Intl.NumberFormatOptions) =>
      formatCurrency(amount, currency, options),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, options),
    formatPercentage: (value: number, normalize?: boolean, options?: Intl.NumberFormatOptions) =>
      formatPercentage(value, normalize, options),
    formatCompactNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      formatCompactNumber(value, options),
    getCurrencySymbol: (currency?: string) =>
      getCurrencySymbol(currency),
    
    // Text Direction
    direction: getTextDirection(),
    isRTL: isRTL(),
    
    // Utilities
    formatFileSize: (bytes: number) => formatFileSize(bytes),
    formatDuration: (seconds: number) => formatDuration(seconds),
    formatList: (items: string[], type?: 'conjunction' | 'disjunction' | 'unit') =>
      formatList(items, type),
  }), [i18n.language, t, i18n.changeLanguage]);
};
