# Custom Branding - White-Label Solution

## Overview

The Custom Branding feature allows tenants to fully customize the appearance of their KnowTon platform instance, creating a white-label experience with their own brand identity.

## Features

### 1. Logo & Favicon
- Upload custom logo (PNG, JPEG, SVG, WebP)
- Set custom favicon
- Maximum file size: 2MB
- Automatic image optimization

### 2. Color Customization
- **Primary Color**: Main brand color for buttons, links, headers
- **Secondary Color**: Supporting color for accents and highlights
- **Accent Color**: Call-to-action and emphasis elements
- **Background Color**: Page background
- **Text Color**: Default text color

### 3. Typography
- Custom heading font family
- Custom body font family
- Support for Google Fonts and system fonts

### 4. Custom Domain
- Configure custom domain (e.g., app.yourcompany.com)
- Automatic SSL certificate provisioning
- DNS configuration guidance

### 5. Custom CSS
- Add custom CSS for advanced styling
- Maximum 50KB
- Security validation to prevent XSS
- Restricted patterns: `<script>`, `javascript:`, `@import`, etc.

### 6. Additional Branding
- Company name
- Tagline
- Footer text
- Social media links (Twitter, LinkedIn, GitHub, Discord)

## API Endpoints

### Get Branding Configuration
```bash
GET /api/v1/branding
Headers:
  X-Tenant-Slug: your-tenant-slug
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logoUrl": "https://cdn.example.com/logo.png",
    "faviconUrl": "https://cdn.example.com/favicon.ico",
    "primaryColor": "#3B82F6",
    "secondaryColor": "#8B5CF6",
    "accentColor": "#10B981",
    "backgroundColor": "#FFFFFF",
    "textColor": "#1F2937",
    "customFonts": {
      "heading": "Inter",
      "body": "Open Sans"
    },
    "customDomain": "app.yourcompany.com",
    "companyName": "Your Company",
    "tagline": "Your Platform Tagline",
    "footerText": "© 2025 Your Company",
    "socialLinks": {
      "twitter": "https://twitter.com/yourcompany",
      "linkedin": "https://linkedin.com/company/yourcompany"
    }
  }
}
```

### Update Branding
```bash
PUT /api/v1/branding
Headers:
  X-Tenant-Slug: your-tenant-slug
  Content-Type: application/json

Body:
{
  "primaryColor": "#FF5733",
  "secondaryColor": "#C70039",
  "companyName": "Acme Corp",
  "tagline": "Innovation at Scale"
}
```

### Upload Logo
```bash
POST /api/v1/branding/logo
Headers:
  X-Tenant-Slug: your-tenant-slug
  Content-Type: multipart/form-data

Body:
  logo: <file>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logoUrl": "/uploads/branding/logo-tenant-123-1699999999.png"
  }
}
```

### Get Theme CSS
```bash
GET /api/v1/branding/theme.css
Headers:
  X-Tenant-Slug: your-tenant-slug
```

**Response:** (CSS file)
```css
:root {
  --primary-color: #3B82F6;
  --secondary-color: #8B5CF6;
  --accent-color: #10B981;
}

.btn-primary {
  background-color: var(--primary-color) !important;
}
/* ... */
```

### Preview Branding
```bash
POST /api/v1/branding/preview
Content-Type: application/json

Body:
{
  "primaryColor": "#FF5733",
  "secondaryColor": "#C70039"
}
```

### Reset Branding
```bash
POST /api/v1/branding/reset
Headers:
  X-Tenant-Slug: your-tenant-slug
```

## Frontend Integration

### 1. Branding Management Page

Navigate to `/branding` to access the branding management interface.

```tsx
import BrandingManagementPage from './pages/BrandingManagementPage';

// In your router
<Route path="/branding" element={<BrandingManagementPage />} />
```

### 2. Apply Branding to App

Wrap your app with the `BrandingProvider`:

```tsx
import BrandingProvider from './components/BrandingProvider';

function App() {
  return (
    <BrandingProvider>
      <YourApp />
    </BrandingProvider>
  );
}
```

### 3. Use Branding Hook

```tsx
import { useBranding } from './hooks/useBranding';

function MyComponent() {
  const { branding, loading, updateBranding } = useBranding();

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ color: branding?.primaryColor }}>
      <h1>{branding?.companyName}</h1>
    </div>
  );
}
```

## Custom Domain Setup

### DNS Configuration

1. Add a CNAME record pointing to the KnowTon platform:
   ```
   CNAME: app.yourcompany.com → knowton.app
   ```

2. Update branding configuration with your custom domain:
   ```bash
   curl -X PUT https://api.knowton.app/api/v1/branding \
     -H "X-Tenant-Slug: your-tenant" \
     -H "Content-Type: application/json" \
     -d '{"customDomain": "app.yourcompany.com"}'
   ```

3. SSL certificate will be automatically provisioned (may take up to 24 hours)

### Verification

Check DNS propagation:
```bash
dig app.yourcompany.com CNAME
```

Test SSL certificate:
```bash
curl -I https://app.yourcompany.com
```

## Security Considerations

### Custom CSS Validation

The system validates custom CSS to prevent security vulnerabilities:

**Blocked Patterns:**
- `<script>` tags
- `javascript:` protocol
- `expression()` (IE-specific)
- `@import` statements
- `-moz-binding` (XBL)
- `behavior:` (IE-specific)

**Size Limit:** 50KB maximum

### Logo Upload Validation

**Allowed Types:**
- image/png
- image/jpeg
- image/svg+xml
- image/webp

**Size Limit:** 2MB maximum

## Best Practices

### Color Selection

1. **Contrast Ratio**: Ensure sufficient contrast between text and background (WCAG AA: 4.5:1)
2. **Accessibility**: Test colors with color blindness simulators
3. **Consistency**: Use colors consistently across the platform

### Typography

1. **Readability**: Choose fonts with good readability at various sizes
2. **Loading**: Use system fonts or web-safe fonts for faster loading
3. **Fallbacks**: Always provide fallback fonts

### Custom CSS

1. **Specificity**: Use specific selectors to avoid conflicts
2. **Testing**: Test custom CSS across different browsers
3. **Performance**: Minimize CSS size for better performance
4. **Maintenance**: Document custom CSS for future reference

### Logo Design

1. **Format**: Use SVG for scalability, PNG for raster images
2. **Size**: Optimize images before uploading
3. **Transparency**: Use transparent backgrounds for logos
4. **Dimensions**: Recommended logo dimensions: 200x50px to 400x100px

## Examples

### Example 1: Corporate Branding

```json
{
  "logoUrl": "https://cdn.acme.com/logo.svg",
  "primaryColor": "#1E40AF",
  "secondaryColor": "#3B82F6",
  "accentColor": "#10B981",
  "customFonts": {
    "heading": "Montserrat",
    "body": "Open Sans"
  },
  "companyName": "Acme Corporation",
  "tagline": "Innovation Through Technology",
  "customDomain": "learn.acme.com"
}
```

### Example 2: Educational Institution

```json
{
  "logoUrl": "https://cdn.university.edu/logo.png",
  "primaryColor": "#7C3AED",
  "secondaryColor": "#A78BFA",
  "accentColor": "#F59E0B",
  "customFonts": {
    "heading": "Playfair Display",
    "body": "Lato"
  },
  "companyName": "University Learning Platform",
  "tagline": "Empowering Minds, Shaping Futures"
}
```

### Example 3: Creative Agency

```json
{
  "logoUrl": "https://cdn.creative.co/logo.svg",
  "primaryColor": "#EC4899",
  "secondaryColor": "#8B5CF6",
  "accentColor": "#F59E0B",
  "backgroundColor": "#0F172A",
  "textColor": "#F1F5F9",
  "customFonts": {
    "heading": "Poppins",
    "body": "Inter"
  },
  "companyName": "Creative Studio",
  "tagline": "Where Ideas Come to Life"
}
```

## Troubleshooting

### Logo Not Displaying

1. Check file format (must be PNG, JPEG, SVG, or WebP)
2. Verify file size (must be under 2MB)
3. Check URL accessibility
4. Clear browser cache

### Colors Not Applying

1. Verify color format (hex, rgb, or rgba)
2. Check for CSS specificity conflicts
3. Clear browser cache
4. Inspect element to verify CSS variables

### Custom Domain Not Working

1. Verify DNS CNAME record
2. Wait for DNS propagation (up to 24 hours)
3. Check SSL certificate status
4. Verify domain configuration in branding settings

### Custom CSS Not Working

1. Check for validation errors
2. Verify CSS syntax
3. Check for blocked patterns
4. Ensure CSS size is under 50KB

## Support

For additional support with custom branding:

- **Documentation**: https://docs.knowton.app/branding
- **Support Email**: support@knowton.app
- **Community Forum**: https://community.knowton.app

## Changelog

### Version 2.0.0 (2025-11-07)
- Initial release of custom branding feature
- Logo and favicon upload
- Color customization
- Typography customization
- Custom domain support
- Custom CSS support
- Live preview functionality
- Security validation
