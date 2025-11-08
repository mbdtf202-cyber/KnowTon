# Custom Branding - Quick Start Guide

## 5-Minute Setup

### Step 1: Access Branding Management

Navigate to the branding management page:
```
https://your-platform.com/branding
```

Or via API:
```bash
curl https://api.knowton.app/api/v1/branding \
  -H "X-Tenant-Slug: your-tenant"
```

### Step 2: Upload Your Logo

**Via UI:**
1. Click "Upload Logo" button
2. Select your logo file (PNG, JPEG, SVG, or WebP, max 2MB)
3. Logo will be automatically uploaded and displayed

**Via API:**
```bash
curl -X POST https://api.knowton.app/api/v1/branding/logo \
  -H "X-Tenant-Slug: your-tenant" \
  -F "logo=@/path/to/your/logo.png"
```

### Step 3: Set Your Colors

**Via UI:**
1. Go to "Colors" tab
2. Use color pickers or enter hex codes
3. Click "Save Changes"

**Via API:**
```bash
curl -X PUT https://api.knowton.app/api/v1/branding \
  -H "X-Tenant-Slug: your-tenant" \
  -H "Content-Type: application/json" \
  -d '{
    "primaryColor": "#3B82F6",
    "secondaryColor": "#8B5CF6",
    "accentColor": "#10B981"
  }'
```

### Step 4: Configure Custom Domain (Optional)

**DNS Setup:**
```
Type: CNAME
Name: app (or your subdomain)
Value: knowton.app
TTL: 3600
```

**Update Branding:**
```bash
curl -X PUT https://api.knowton.app/api/v1/branding \
  -H "X-Tenant-Slug: your-tenant" \
  -H "Content-Type: application/json" \
  -d '{"customDomain": "app.yourcompany.com"}'
```

### Step 5: Preview and Publish

**Via UI:**
1. Click "Preview" tab to see live preview
2. Review all changes
3. Click "Save Changes" to publish

**Via API:**
```bash
# Preview without saving
curl -X POST https://api.knowton.app/api/v1/branding/preview \
  -H "Content-Type: application/json" \
  -d '{
    "primaryColor": "#FF5733",
    "companyName": "Acme Corp"
  }'
```

## Common Use Cases

### Use Case 1: Basic Branding

Minimum configuration for a branded experience:

```json
{
  "logoUrl": "https://yourcdn.com/logo.png",
  "primaryColor": "#1E40AF",
  "companyName": "Your Company"
}
```

### Use Case 2: Full Branding

Complete branding configuration:

```json
{
  "logoUrl": "https://yourcdn.com/logo.png",
  "faviconUrl": "https://yourcdn.com/favicon.ico",
  "primaryColor": "#1E40AF",
  "secondaryColor": "#3B82F6",
  "accentColor": "#10B981",
  "customFonts": {
    "heading": "Montserrat",
    "body": "Open Sans"
  },
  "companyName": "Your Company",
  "tagline": "Your Tagline",
  "customDomain": "app.yourcompany.com"
}
```

### Use Case 3: Dark Theme

Create a dark-themed platform:

```json
{
  "primaryColor": "#3B82F6",
  "secondaryColor": "#8B5CF6",
  "backgroundColor": "#1F2937",
  "textColor": "#F9FAFB"
}
```

## Testing Your Branding

### 1. Visual Check
- Logo displays correctly
- Colors are applied consistently
- Fonts load properly
- Custom domain works

### 2. Browser Testing
Test in multiple browsers:
- Chrome
- Firefox
- Safari
- Edge

### 3. Device Testing
Test on different devices:
- Desktop
- Tablet
- Mobile

### 4. Accessibility Check
- Color contrast ratio (WCAG AA: 4.5:1)
- Text readability
- Logo visibility

## Quick Fixes

### Logo Not Showing
```bash
# Re-upload logo
curl -X POST https://api.knowton.app/api/v1/branding/logo \
  -H "X-Tenant-Slug: your-tenant" \
  -F "logo=@/path/to/logo.png"
```

### Reset to Defaults
```bash
curl -X POST https://api.knowton.app/api/v1/branding/reset \
  -H "X-Tenant-Slug: your-tenant"
```

### Get Current Configuration
```bash
curl https://api.knowton.app/api/v1/branding \
  -H "X-Tenant-Slug: your-tenant"
```

## Next Steps

1. **Add Custom CSS**: For advanced styling
2. **Configure Social Links**: Add social media links to footer
3. **Set Up Analytics**: Track branding effectiveness
4. **Create Brand Guidelines**: Document your branding decisions

## Support

Need help? Contact us:
- Email: support@knowton.app
- Docs: https://docs.knowton.app/branding
- Community: https://community.knowton.app
