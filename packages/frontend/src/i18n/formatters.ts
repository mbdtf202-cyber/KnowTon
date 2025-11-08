/**
 * Localization formatters for dates, times, and currencies
 * Provides locale-aware formatting utilities
 */

import i18n from './config';

/**
 * Format a date according to the current locale
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const locale = i18n.language || 'en';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat(locale, options || defaultOptions).format(dateObj);
};

/**
 * Format a date and time according to the current locale
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date and time string
 */
export const formatDateTime = (
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const locale = i18n.language || 'en';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return new Intl.DateTimeFormat(locale, options || defaultOptions).format(dateObj);
};

/**
 * Format a time according to the current locale
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted time string
 */
export const formatTime = (
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const locale = i18n.language || 'en';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };

  return new Intl.DateTimeFormat(locale, options || defaultOptions).format(dateObj);
};

/**
 * Format a relative time (e.g., "2 hours ago")
 * @param date - Date to format
 * @returns Relative time string
 */
export const formatRelativeTime = (date: Date | string | number): string => {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const locale = i18n.language || 'en';
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  } else if (diffInSeconds < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
  }
};

/**
 * Format a currency amount according to the current locale
 * @param amount - Amount to format
 * @param currency - Currency code (e.g., 'USD', 'EUR', 'CNY')
 * @param options - Intl.NumberFormat options
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions
): string => {
  const locale = i18n.language || 'en';
  
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  return new Intl.NumberFormat(locale, { ...defaultOptions, ...options }).format(amount);
};

/**
 * Format a number according to the current locale
 * @param value - Number to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number,
  options?: Intl.NumberFormatOptions
): string => {
  const locale = i18n.language || 'en';
  return new Intl.NumberFormat(locale, options).format(value);
};

/**
 * Format a percentage according to the current locale
 * @param value - Value to format (0-1 or 0-100 depending on normalize parameter)
 * @param normalize - Whether to divide by 100 (default: false)
 * @param options - Intl.NumberFormat options
 * @returns Formatted percentage string
 */
export const formatPercentage = (
  value: number,
  normalize: boolean = false,
  options?: Intl.NumberFormatOptions
): string => {
  const locale = i18n.language || 'en';
  const normalizedValue = normalize ? value / 100 : value;
  
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  };

  return new Intl.NumberFormat(locale, { ...defaultOptions, ...options }).format(normalizedValue);
};

/**
 * Format a compact number (e.g., 1.2K, 3.4M)
 * @param value - Number to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted compact number string
 */
export const formatCompactNumber = (
  value: number,
  options?: Intl.NumberFormatOptions
): string => {
  const locale = i18n.language || 'en';
  
  const defaultOptions: Intl.NumberFormatOptions = {
    notation: 'compact',
    compactDisplay: 'short',
  };

  return new Intl.NumberFormat(locale, { ...defaultOptions, ...options }).format(value);
};

/**
 * Get the text direction for the current locale
 * @returns 'ltr' or 'rtl'
 */
export const getTextDirection = (): 'ltr' | 'rtl' => {
  const locale = i18n.language || 'en';
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  
  return rtlLanguages.some(lang => locale.startsWith(lang)) ? 'rtl' : 'ltr';
};

/**
 * Check if the current locale uses RTL
 * @returns true if RTL, false otherwise
 */
export const isRTL = (): boolean => {
  return getTextDirection() === 'rtl';
};

/**
 * Format file size in a human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  const locale = i18n.language || 'en';
  
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const value = bytes / Math.pow(k, i);
  const formattedValue = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  
  return `${formattedValue} ${sizes[i]}`;
};

/**
 * Format duration in a human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts: string[] = [];
  
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}s`);
  }
  
  return parts.join(' ');
};

/**
 * Get locale-specific currency symbol
 * @param currency - Currency code
 * @returns Currency symbol
 */
export const getCurrencySymbol = (currency: string = 'USD'): string => {
  const locale = i18n.language || 'en';
  
  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);
    
    // Extract symbol by removing digits and spaces
    return formatted.replace(/[\d\s]/g, '');
  } catch {
    return currency;
  }
};

/**
 * Format a list of items according to locale
 * @param items - Array of items to format
 * @param type - List type ('conjunction', 'disjunction', or 'unit')
 * @returns Formatted list string
 */
export const formatList = (
  items: string[],
  type: 'conjunction' | 'disjunction' | 'unit' = 'conjunction'
): string => {
  const locale = i18n.language || 'en';
  
  try {
    const formatter = new Intl.ListFormat(locale, { style: 'long', type });
    return formatter.format(items);
  } catch {
    // Fallback for older browsers
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return items.join(type === 'disjunction' ? ' or ' : ' and ');
    return items.slice(0, -1).join(', ') + (type === 'disjunction' ? ', or ' : ', and ') + items[items.length - 1];
  }
};
