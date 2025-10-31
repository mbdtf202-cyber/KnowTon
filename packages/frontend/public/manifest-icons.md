# PWA Manifest Icons

## Required Icons

To complete the PWA setup, add the following icon files to the `public` directory:

### Icon Sizes
- `pwa-192x192.png` - 192x192 pixels
- `pwa-512x512.png` - 512x512 pixels
- `apple-touch-icon.png` - 180x180 pixels
- `favicon.ico` - 32x32 pixels

### Icon Requirements
- Use PNG format for best compatibility
- Ensure icons have transparent backgrounds
- Use the KnowTon logo or brand identity
- Icons should be square (1:1 aspect ratio)
- Optimize file sizes (< 50KB per icon)

### Generation Tools
- [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)

### Quick Generation
```bash
# Using PWA Asset Generator
npx pwa-asset-generator logo.svg public --icon-only --padding "10%"
```

## Current Status
⚠️ Placeholder icons needed - Add actual brand icons before production deployment
