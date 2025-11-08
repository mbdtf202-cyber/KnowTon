/**
 * Tests for localization formatters
 */

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
} from '../formatters';

import { vi } from 'vitest';

// Mock i18n
vi.mock('../config', () => ({
  __esModule: true,
  default: {
    language: 'en',
  },
}));

describe('Date/Time Formatters', () => {
  const testDate = new Date('2025-01-15T14:30:00Z');

  test('formatDate formats date correctly', () => {
    const result = formatDate(testDate);
    expect(result).toContain('2025');
    expect(result).toContain('January');
  });

  test('formatDateTime formats date and time correctly', () => {
    const result = formatDateTime(testDate);
    expect(result).toContain('2025');
    expect(result).toMatch(/\d{1,2}:\d{2}/); // Contains time
  });

  test('formatTime formats time correctly', () => {
    const result = formatTime(testDate);
    expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });

  test('formatRelativeTime formats relative time correctly', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = formatRelativeTime(twoHoursAgo);
    expect(result).toContain('hour');
  });

  test('formatDate accepts string input', () => {
    const result = formatDate('2025-01-15');
    expect(result).toContain('2025');
  });

  test('formatDate accepts number input', () => {
    const result = formatDate(testDate.getTime());
    expect(result).toContain('2025');
  });
});

describe('Currency Formatters', () => {
  test('formatCurrency formats USD correctly', () => {
    const result = formatCurrency(1234.56, 'USD');
    expect(result).toContain('1,234.56');
    expect(result).toMatch(/\$|USD/);
  });

  test('formatCurrency formats EUR correctly', () => {
    const result = formatCurrency(1234.56, 'EUR');
    expect(result).toContain('1');
    expect(result).toContain('234');
  });

  test('formatCurrency formats CNY correctly', () => {
    const result = formatCurrency(1234.56, 'CNY');
    expect(result).toContain('1');
    expect(result).toContain('234');
  });

  test('formatCurrency uses default USD', () => {
    const result = formatCurrency(1234.56);
    expect(result).toMatch(/\$|USD/);
  });

  test('formatCurrency accepts custom options', () => {
    const result = formatCurrency(1234.56, 'USD', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    });
    expect(result).not.toContain('.56');
  });

  test('getCurrencySymbol returns symbol', () => {
    const symbol = getCurrencySymbol('USD');
    expect(symbol).toBeTruthy();
    expect(symbol.length).toBeGreaterThan(0);
  });
});

describe('Number Formatters', () => {
  test('formatNumber formats number with locale separators', () => {
    const result = formatNumber(1234567.89);
    expect(result).toContain('1');
    expect(result).toContain('234');
    expect(result).toContain('567');
  });

  test('formatPercentage formats percentage correctly', () => {
    const result = formatPercentage(0.1234);
    expect(result).toContain('12');
    expect(result).toContain('%');
  });

  test('formatPercentage with normalize option', () => {
    const result = formatPercentage(12.34, true);
    expect(result).toContain('12');
    expect(result).toContain('%');
  });

  test('formatCompactNumber formats large numbers', () => {
    const result = formatCompactNumber(1234567);
    expect(result).toMatch(/[0-9.]+[KMB]/i);
  });

  test('formatNumber accepts custom options', () => {
    const result = formatNumber(1234.5678, { maximumFractionDigits: 2 });
    expect(result).toContain('1');
    expect(result).toContain('234');
  });
});

describe('Text Direction', () => {
  test('getTextDirection returns ltr for English', () => {
    const direction = getTextDirection();
    expect(direction).toBe('ltr');
  });

  test('isRTL returns false for English', () => {
    const rtl = isRTL();
    expect(rtl).toBe(false);
  });
});

describe('Utility Formatters', () => {
  test('formatFileSize formats bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1024)).toContain('KB');
    expect(formatFileSize(1048576)).toContain('MB');
    expect(formatFileSize(1073741824)).toContain('GB');
  });

  test('formatDuration formats seconds correctly', () => {
    expect(formatDuration(30)).toBe('30s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(3665)).toBe('1h 1m 5s');
  });

  test('formatDuration handles zero', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  test('formatList formats array of items', () => {
    const result = formatList(['Alice', 'Bob', 'Charlie']);
    expect(result).toContain('Alice');
    expect(result).toContain('Bob');
    expect(result).toContain('Charlie');
  });

  test('formatList handles single item', () => {
    const result = formatList(['Alice']);
    expect(result).toBe('Alice');
  });

  test('formatList handles empty array', () => {
    const result = formatList([]);
    expect(result).toBe('');
  });

  test('formatList with disjunction type', () => {
    const result = formatList(['Red', 'Green', 'Blue'], 'disjunction');
    expect(result).toContain('Red');
    expect(result).toContain('Green');
    expect(result).toContain('Blue');
  });
});

describe('Edge Cases', () => {
  test('formatCurrency handles zero', () => {
    const result = formatCurrency(0, 'USD');
    expect(result).toContain('0');
  });

  test('formatCurrency handles negative numbers', () => {
    const result = formatCurrency(-1234.56, 'USD');
    expect(result).toContain('1,234.56');
  });

  test('formatNumber handles very large numbers', () => {
    const result = formatNumber(999999999999);
    expect(result).toBeTruthy();
  });

  test('formatPercentage handles edge values', () => {
    expect(formatPercentage(0)).toContain('0');
    expect(formatPercentage(1)).toContain('100');
  });

  test('formatFileSize handles very large files', () => {
    const result = formatFileSize(1099511627776); // 1 TB
    expect(result).toContain('TB');
  });
});
