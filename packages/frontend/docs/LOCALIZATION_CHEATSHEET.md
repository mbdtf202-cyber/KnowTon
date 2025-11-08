# Localization Cheatsheet

Quick reference for using localization in KnowTon platform.

## Import

```typescript
import { useLocalization } from '../i18n';
```

## Basic Setup

```typescript
const {
  t,                    // Translation function
  locale,               // Current locale (e.g., 'en', 'zh')
  changeLanguage,       // Change language function
  formatDate,           // Format dates
  formatCurrency,       // Format currency
  formatNumber,         // Format numbers
  direction,            // Text direction ('ltr' or 'rtl')
  isRTL,               // Is RTL boolean
} = useLocalization();
```

## Date & Time

```typescript
// Date only
formatDate(new Date())
// → "January 15, 2025" (en)
// → "2025年1月15日" (zh)

// Date + Time
formatDateTime(new Date())
// → "January 15, 2025, 2:30 PM" (en)

// Time only
formatTime(new Date())
// → "2:30:00 PM" (en)

// Relative time
formatRelativeTime(date)
// → "2 hours ago" (en)
// → "2小时前" (zh)

// Custom format
formatDate(date, { 
  year: 'numeric', 
  month: 'short', 
  day: 'numeric' 
})
// → "Jan 15, 2025" (en)
```

## Currency

```typescript
// Basic
formatCurrency(1234.56, 'USD')
// → "$1,234.56" (en)

// Different currencies
formatCurrency(1234.56, 'EUR')  // → "€1,234.56"
formatCurrency(1234.56, 'CNY')  // → "¥1,234.56"
formatCurrency(1234.56, 'JPY')  // → "¥1,235"

// Get symbol only
getCurrencySymbol('USD')  // → "$"

// Compact format
formatCurrency(1234567, 'USD', { notation: 'compact' })
// → "$1.2M"
```

## Numbers

```typescript
// Standard
formatNumber(1234567.89)
// → "1,234,567.89" (en)
// → "1.234.567,89" (de)

// Percentage
formatPercentage(0.1234)
// → "12.34%"

// Compact
formatCompactNumber(1234567)
// → "1.2M" (en)
// → "123万" (zh)

// Custom decimals
formatNumber(1234.5678, { 
  minimumFractionDigits: 2,
  maximumFractionDigits: 2 
})
// → "1,234.57"
```

## Utilities

```typescript
// File size
formatFileSize(1234567890)
// → "1.23 GB"

// Duration
formatDuration(3665)
// → "1h 1m 5s"

// List
formatList(['Alice', 'Bob', 'Charlie'])
// → "Alice, Bob, and Charlie" (en)
// → "Alice、Bob和Charlie" (zh)

// List with "or"
formatList(['Red', 'Green', 'Blue'], 'disjunction')
// → "Red, Green, or Blue"
```

## RTL Support

```typescript
// Get direction
const { direction, isRTL } = useTextDirection();

// Use in component
<div dir={direction}>
  {/* Content */}
</div>

// Conditional styling
<div className={isRTL ? 'rtl-mode' : 'ltr-mode'}>
  {/* Content */}
</div>
```

## Language Switching

```typescript
// Simple toggle
<button onClick={() => changeLanguage(locale === 'en' ? 'zh' : 'en')}>
  Switch Language
</button>

// Dropdown
<select value={locale} onChange={(e) => changeLanguage(e.target.value)}>
  <option value="en">English</option>
  <option value="zh">中文</option>
</select>
```

## Common Patterns

### Price Display

```typescript
<div className="price">
  <span className="currency">{getCurrencySymbol('USD')}</span>
  <span className="amount">{formatCurrency(99.99, 'USD')}</span>
</div>
```

### Date Range

```typescript
<p>
  {formatDate(startDate)} - {formatDate(endDate)}
</p>
```

### Stats Card

```typescript
<div className="stat">
  <div className="value">{formatCompactNumber(views)}</div>
  <div className="label">Views</div>
</div>
```

### Time Ago

```typescript
<time dateTime={date.toISOString()}>
  {formatRelativeTime(date)}
</time>
```

### File Info

```typescript
<div>
  <p>Size: {formatFileSize(bytes)}</p>
  <p>Duration: {formatDuration(seconds)}</p>
</div>
```

## Supported Locales

- `en` - English
- `zh` - Chinese (中文)

## Supported Currencies

- `USD` - US Dollar ($)
- `EUR` - Euro (€)
- `CNY` - Chinese Yuan (¥)
- `JPY` - Japanese Yen (¥)
- `GBP` - British Pound (£)
- And all other ISO 4217 currency codes

## Testing

### Manual Test
Visit: `/localization-test`

### Run Tests
```bash
npm test -- formatters.test.ts --run
```

## Tips

1. ✅ Always use formatters, never format manually
2. ✅ Pass Date objects, not strings
3. ✅ Use valid ISO currency codes
4. ✅ Set `dir` attribute for RTL
5. ✅ Test with multiple locales

## Common Mistakes

❌ **Don't:**
```typescript
<p>Price: ${price}</p>
<p>Date: {date.toString()}</p>
<p>{number.toFixed(2)}</p>
```

✅ **Do:**
```typescript
<p>Price: {formatCurrency(price, 'USD')}</p>
<p>Date: {formatDate(date)}</p>
<p>{formatNumber(number)}</p>
```

## More Info

- Full Guide: `LOCALIZATION_GUIDE.md`
- Quick Start: `LOCALIZATION_QUICK_START.md`
- Source: `src/i18n/`
