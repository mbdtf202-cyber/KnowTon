# Branding Integration Guide

## Quick Integration

### 1. Add Route to Your App

```tsx
import BrandingManagementPage from './pages/BrandingManagementPage';

// In your router configuration
<Route path="/branding" element={<BrandingManagementPage />} />
```

### 2. Wrap App with Branding Provider

```tsx
import BrandingProvider from './components/BrandingProvider';

function App() {
  return (
    <BrandingProvider>
      <Router>
        {/* Your routes */}
      </Router>
    </BrandingProvider>
  );
}
```

### 3. Use Branding in Components

```tsx
import { useBranding } from './hooks/useBranding';

function MyComponent() {
  const { branding, loading } = useBranding();

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ color: branding?.primaryColor }}>
      <img src={branding?.logoUrl} alt="Logo" />
      <h1>{branding?.companyName}</h1>
    </div>
  );
}
```

## API Usage

### Get Branding
```typescript
const { branding } = useBranding();
```

### Update Branding
```typescript
const { updateBranding } = useBranding();

await updateBranding({
  primaryColor: '#FF5733',
  companyName: 'Acme Corp'
});
```

### Upload Logo
```typescript
const { uploadLogo } = useBranding();

const handleFileSelect = async (file: File) => {
  const logoUrl = await uploadLogo(file);
  console.log('Logo uploaded:', logoUrl);
};
```

## CSS Variables

The branding system automatically sets CSS variables:

```css
:root {
  --primary-color: #3B82F6;
  --secondary-color: #8B5CF6;
  --accent-color: #10B981;
  --background-color: #FFFFFF;
  --text-color: #1F2937;
  --font-heading: 'Inter';
  --font-body: 'Open Sans';
}
```

Use them in your components:

```tsx
<button style={{ backgroundColor: 'var(--primary-color)' }}>
  Click Me
</button>
```

## TypeScript Types

```typescript
interface BrandingConfig {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  customCss?: string;
  customFonts?: {
    heading?: string;
    body?: string;
  };
  customDomain?: string;
  companyName?: string;
  tagline?: string;
  footerText?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    discord?: string;
  };
}
```

## Complete Example

```tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BrandingProvider from './components/BrandingProvider';
import BrandingManagementPage from './pages/BrandingManagementPage';
import HomePage from './pages/HomePage';

function App() {
  return (
    <BrandingProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/branding" element={<BrandingManagementPage />} />
        </Routes>
      </BrowserRouter>
    </BrandingProvider>
  );
}

export default App;
```
