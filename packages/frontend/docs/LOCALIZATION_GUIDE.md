# Localization Guide

## Overview

This guide covers the localization (l10n) implementation for the KnowTon platform, including date/time formatting, currency formatting, number formatting, and RTL (Right-to-Left) language support.

## Features

### 1. Date & Time Formatting

All dates and times are formatted according to the user's locale:

```typescript
import { useLocalization } from '../i18n';

const MyComponent = () => {
  const { formatDate, formatDateTime, formatTime, formatRelativeTime } = useLocalization();
  
  const date = new Date();
  
  return (
    <div>
      <p>Date: {formatDate(date)}</p>
      <p>Date & Time: {formatDateTime(date)}</p>
      <p>Time: {formatTime(date)}</p>
      <p>Relative: {formatRelativeTime(date)}</p>
    </div>
  );
};
```

**Supported formats:**
- Long date: "January 15, 2025" (en) / "2025年1月15日" (zh)
- Short date: "Jan 15, 2025" (en) / "2025/1/15" (zh)
- Date & time: "January 15, 2025, 2:30 PM" (en)
- Time only: "2:30:00 PM" (en) / "14:30:00" (zh)
- Relative time: "2 hours ago", "5 days ago"

### 2. Currency Formatting

Currencies are formatted with proper symbols and decimal separators:

```typescript
import { useLocalization } from '../i18n';

const PriceDisplay = ({ amount, currency }) => {
  const { formatCurrency, getCurrencySymbol } = useLocalization();
  
  return (
    <div>
      <p>Price: {formatCurrency(amount, currency)}</p>
      <p>Symbol: {getCurrencySymbol(currency)}</p>
    </div>
  );
};
```

**Supported currencies:**
- USD: $1,234.56 (en) / US$1,234.56 (zh)
- EUR: €1,234.56 (en) / €1.234,56 (de)
- CNY: ¥1,234.56 (en) / ¥1,234.56 (zh)
- JPY: ¥1,235 (en) / ¥1,235 (ja)
- GBP: £1,234.56 (en)

### 3. Number Formatting

Numbers are formatted with locale-specific separators:

```typescript
import { useLocalization } from '../i18n';

const StatsDisplay = ({ value }) => {
  const { formatNumber, formatPercentage, formatCompactNumber } = useLocalization();
  
  return (
    <div>
      <p>Number: {formatNumber(value)}</p>
      <p>Percentage: {formatPercentage(0.1234)}</p>
      <p>Compact: {formatCompactNumber(1234567)}</p>
    </div>
  );
};
```

**Examples:**
- Standard: 1,234,567.89 (en) / 1.234.567,89 (de)
- Percentage: 12.34% (en) / 12,34% (de)
- Compact: 1.2M (en) / 1,2 Mio. (de)

### 4. RTL Language Support

The platform automatically adjusts layout for RTL languages (Arabic, Hebrew, Persian, Urdu):

```typescript
import { useTextDirection } from '../i18n';

const MyComponent = () => {
  const { direction, isRTL } = useTextDirection();
  
  return (
    <div dir={direction} className={isRTL ? 'rtl-layout' : 'ltr-layout'}>
      {/* Content automatically adjusts */}
    </div>
  );
};
```

**RTL Features:**
- Automatic text direction (dir="rtl")
- Reversed flex layouts
- Mirrored margins and paddings
- Flipped icons and arrows
- Right-aligned text by default
- Proper form input alignment

### 5. Utility Formatters

Additional formatters for common use cases:

```typescript
import { useFormatters } from '../i18n';

const FileInfo = ({ bytes, seconds }) => {
  const { formatFileSize, formatDuration, formatList } = useFormatters();
  
  return (
    <div>
      <p>Size: {formatFileSize(bytes)}</p>
      <p>Duration: {formatDuration(seconds)}</p>
      <p>Tags: {formatList(['tag1', 'tag2', 'tag3'])}</p>
    </div>
  );
};
```

**Examples:**
- File size: 1.23 GB, 456 MB, 789 KB
- Duration: 1h 5m 30s
- List: "Alice, Bob, and Charlie" (en) / "Alice、Bob和Charlie" (zh)

## Usage

### Basic Usage

```typescript
import { useLocalization } from '../i18n';

const MyComponent = () => {
  const { t, locale, formatCurrency, formatDate } = useLocalization();
  
  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>Current locale: {locale}</p>
      <p>Price: {formatCurrency(99.99, 'USD')}</p>
      <p>Date: {formatDate(new Date())}</p>
    </div>
  );
};
```

### Changing Language

```typescript
import { useLocalization } from '../i18n';

const LanguageSwitcher = () => {
  const { locale, changeLanguage } = useLocalization();
  
  return (
    <select value={locale} onChange={(e) => changeLanguage(e.target.value)}>
      <option value="en">English</option>
      <option value="zh">中文</option>
    </select>
  );
};
```

### Custom Date Format

```typescript
const { formatDate } = useLocalization();

// Short format
const shortDate = formatDate(date, {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

// Long format with weekday
const longDate = formatDate(date, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
```

### Custom Number Format

```typescript
const { formatNumber } = useLocalization();

// With specific decimal places
const precise = formatNumber(1234.5678, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4
});

// Scientific notation
const scientific = formatNumber(1234567, {
  notation: 'scientific'
});
```

## RTL Styling

### CSS Classes

The platform includes RTL-aware CSS classes:

```css
/* Automatically adjusts in RTL */
.text-start  /* Left in LTR, Right in RTL */
.text-end    /* Right in LTR, Left in RTL */

/* Manual RTL control */
[dir="rtl"] .custom-class {
  /* RTL-specific styles */
}
```

### Tailwind CSS

Tailwind utilities work automatically with RTL:

```jsx
<div className="ml-4">  {/* Becomes mr-4 in RTL */}
<div className="text-left">  {/* Becomes text-right in RTL */}
<div className="border-l">  {/* Becomes border-r in RTL */}
```

### Custom RTL Styles

For custom components, use the direction attribute:

```jsx
<div dir={direction}>
  <div className="flex">
    {/* Flex items automatically reverse in RTL */}
  </div>
</div>
```

## Testing

### Manual Testing

Visit `/localization-test` to see all localization features in action:

1. Switch between languages
2. Observe date/time formatting changes
3. Check currency formatting for different currencies
4. Test RTL layout (when Arabic/Hebrew is added)
5. Verify number formatting

### Automated Testing

Run the test suite:

```bash
npm test -- formatters.test.ts
```

Tests cover:
- Date/time formatting
- Currency formatting
- Number formatting
- Text direction detection
- Utility formatters
- Edge cases

## Adding New Languages

### 1. Create Translation File

Create a new JSON file in `src/i18n/locales/`:

```json
// src/i18n/locales/ja.json
{
  "common": {
    "connect": "接続",
    "loading": "読み込み中...",
    // ... more translations
  }
}
```

### 2. Update Config

Add the language to `src/i18n/config.ts`:

```typescript
import jaTranslations from './locales/ja.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
];

i18n.init({
  resources: {
    en: { translation: enTranslations },
    zh: { translation: zhTranslations },
    ja: { translation: jaTranslations },
  },
  // ... rest of config
});
```

### 3. Test

1. Switch to the new language
2. Verify all translations appear correctly
3. Check date/time formatting
4. Verify currency formatting
5. Test layout (especially for RTL languages)

## Best Practices

### 1. Always Use Formatters

❌ **Don't:**
```typescript
<p>Price: ${price}</p>
<p>Date: {date.toString()}</p>
```

✅ **Do:**
```typescript
<p>Price: {formatCurrency(price, 'USD')}</p>
<p>Date: {formatDate(date)}</p>
```

### 2. Use Semantic HTML

```typescript
<time dateTime={date.toISOString()}>
  {formatDate(date)}
</time>
```

### 3. Handle RTL Gracefully

```typescript
// Use logical properties
<div className="ms-4">  {/* margin-inline-start */}
<div className="text-start">  {/* text-align: start */}
```

### 4. Test All Locales

- Test with different languages
- Verify layout doesn't break
- Check text overflow
- Test with long translations

### 5. Provide Context

```typescript
// Good: Provides context for translators
t('dashboard.greeting', { name: userName })

// Bad: Hard to translate
t('greeting') + userName
```

## Troubleshooting

### Issue: Dates not formatting correctly

**Solution:** Ensure you're passing a valid Date object:

```typescript
// Convert string to Date
const date = new Date(dateString);
formatDate(date);
```

### Issue: Currency symbol not showing

**Solution:** Check if the currency code is valid:

```typescript
// Use ISO 4217 currency codes
formatCurrency(amount, 'USD')  // ✓
formatCurrency(amount, 'usd')  // ✗
```

### Issue: RTL layout broken

**Solution:** Ensure the dir attribute is set:

```typescript
const { direction } = useTextDirection();
<div dir={direction}>
  {/* content */}
</div>
```

### Issue: Numbers not formatting

**Solution:** Ensure you're passing a number, not a string:

```typescript
formatNumber(Number(value))  // ✓
formatNumber(value)  // ✗ if value is string
```

## Performance

### Memoization

All formatters are memoized and only re-compute when the locale changes:

```typescript
// Automatically memoized
const { formatDate } = useLocalization();
```

### Lazy Loading

Locale data is loaded on demand:

```typescript
// Only loads when language is changed
changeLanguage('ja');
```

## Browser Support

- Chrome 24+
- Firefox 29+
- Safari 10+
- Edge 12+

All modern browsers support `Intl` API. For older browsers, consider using a polyfill.

## Resources

- [MDN: Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [i18next Documentation](https://www.i18next.com/)
- [React i18next](https://react.i18next.com/)
- [RTL Styling Guide](https://rtlstyling.com/)

## Support

For issues or questions:
1. Check this documentation
2. Review the test component at `/localization-test`
3. Check the test suite in `__tests__/formatters.test.ts`
4. Open an issue on GitHub
