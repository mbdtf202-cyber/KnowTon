# Localization Quick Start

## Overview

This guide helps you quickly implement localization in your components.

## Installation

Already installed! The localization system is ready to use.

## Quick Examples

### 1. Format a Date

```typescript
import { useLocalization } from '../i18n';

const MyComponent = () => {
  const { formatDate } = useLocalization();
  
  return <p>{formatDate(new Date())}</p>;
  // Output: "January 15, 2025" (en) or "2025年1月15日" (zh)
};
```

### 2. Format Currency

```typescript
import { useLocalization } from '../i18n';

const PriceTag = ({ amount }) => {
  const { formatCurrency } = useLocalization();
  
  return <p>{formatCurrency(amount, 'USD')}</p>;
  // Output: "$1,234.56" (en) or "US$1,234.56" (zh)
};
```

### 3. Format Numbers

```typescript
import { useLocalization } from '../i18n';

const Stats = ({ views }) => {
  const { formatCompactNumber } = useLocalization();
  
  return <p>{formatCompactNumber(views)} views</p>;
  // Output: "1.2M views" (en) or "120万 views" (zh)
};
```

### 4. Relative Time

```typescript
import { useLocalization } from '../i18n';

const TimeAgo = ({ date }) => {
  const { formatRelativeTime } = useLocalization();
  
  return <p>{formatRelativeTime(date)}</p>;
  // Output: "2 hours ago" (en) or "2小时前" (zh)
};
```

### 5. Language Switcher

```typescript
import { useLocalization } from '../i18n';
import { SUPPORTED_LANGUAGES } from '../i18n/config';

const LanguageSwitcher = () => {
  const { locale, changeLanguage } = useLocalization();
  
  return (
    <select value={locale} onChange={(e) => changeLanguage(e.target.value)}>
      {SUPPORTED_LANGUAGES.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.nativeName}
        </option>
      ))}
    </select>
  );
};
```

### 6. RTL Support

```typescript
import { useTextDirection } from '../i18n';

const MyComponent = () => {
  const { direction, isRTL } = useTextDirection();
  
  return (
    <div dir={direction} className={isRTL ? 'rtl-mode' : 'ltr-mode'}>
      {/* Content automatically adjusts */}
    </div>
  );
};
```

## Common Use Cases

### Display File Size

```typescript
const { formatFileSize } = useLocalization();
<p>Size: {formatFileSize(1234567890)}</p>
// Output: "1.23 GB"
```

### Display Duration

```typescript
const { formatDuration } = useLocalization();
<p>Duration: {formatDuration(3665)}</p>
// Output: "1h 1m 5s"
```

### Display List

```typescript
const { formatList } = useLocalization();
<p>Authors: {formatList(['Alice', 'Bob', 'Charlie'])}</p>
// Output: "Alice, Bob, and Charlie" (en) or "Alice、Bob和Charlie" (zh)
```

### Display Percentage

```typescript
const { formatPercentage } = useLocalization();
<p>Progress: {formatPercentage(0.75)}</p>
// Output: "75%"
```

## Testing

Visit `/localization-test` in your browser to see all features in action.

## Next Steps

- Read the full [Localization Guide](./LOCALIZATION_GUIDE.md)
- Add new translations to `src/i18n/locales/`
- Customize date/time formats
- Add RTL language support

## Tips

1. **Always use formatters** - Don't format dates/currencies manually
2. **Test all locales** - Switch languages to verify formatting
3. **Use semantic HTML** - Wrap dates in `<time>` tags
4. **Handle RTL** - Use logical CSS properties (start/end instead of left/right)
5. **Provide context** - Use translation keys with context for better translations

## Common Patterns

### Price Display with Currency Symbol

```typescript
const { formatCurrency, getCurrencySymbol } = useLocalization();

<div>
  <span className="text-sm">{getCurrencySymbol('USD')}</span>
  <span className="text-2xl">{formatCurrency(99.99, 'USD')}</span>
</div>
```

### Date Range

```typescript
const { formatDate } = useLocalization();

<p>
  {formatDate(startDate)} - {formatDate(endDate)}
</p>
```

### Compact Stats

```typescript
const { formatCompactNumber } = useLocalization();

<div className="stats">
  <div>{formatCompactNumber(views)} views</div>
  <div>{formatCompactNumber(likes)} likes</div>
  <div>{formatCompactNumber(shares)} shares</div>
</div>
```

## Need Help?

- Check the [full documentation](./LOCALIZATION_GUIDE.md)
- Visit `/localization-test` for live examples
- Review test files in `src/i18n/__tests__/`
