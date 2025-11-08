export const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'http://localhost:3001/api/v1'
    : 'https://api.knowton.io/api/v1',
  TIMEOUT: 30000,
};

export const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  background: '#ffffff',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  placeholder: '#9ca3af',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
};

export const CONTENT_TYPES = {
  PDF: 'pdf',
  VIDEO: 'video',
  AUDIO: 'audio',
  COURSE: 'course',
} as const;
