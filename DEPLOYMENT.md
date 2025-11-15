# Deployment Guide - Flat Earth Engine

## 🚀 Quick Deploy Options

### Option 1: Vercel (Recommended)

**Why Vercel:**
- Zero-config deployment for Vite projects
- Automatic HTTPS
- Global CDN
- Free tier available

**Steps:**
1. Push your code to GitHub (already done)
2. Visit [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your GitHub repository: `eshe-huli/flat-earth-engine`
5. Vercel auto-detects Vite configuration
6. Click "Deploy"

**Build Settings (auto-detected):**
```
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**Deploy URL:** `https://flat-earth-engine.vercel.app` (or custom domain)

---

### Option 2: Netlify

**Why Netlify:**
- Simple drag-and-drop deployment
- Continuous deployment from Git
- Free tier with 100GB bandwidth

**Steps:**
1. Visit [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select `eshe-huli/flat-earth-engine`
4. Configure build settings:
   ```
   Build command: npm run build
   Publish directory: dist
   ```
5. Click "Deploy site"

**Deploy URL:** `https://flat-earth-engine.netlify.app` (or custom domain)

---

### Option 3: GitHub Pages

**Why GitHub Pages:**
- Free hosting on github.io
- Integrated with GitHub
- Simple setup

**Steps:**

1. **Install GitHub Pages plugin:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json:**
   ```json
   {
     "scripts": {
       "build": "tsc && vite build",
       "deploy": "npm run build && gh-pages -d dist"
     },
     "homepage": "https://eshe-huli.github.io/flat-earth-engine"
   }
   ```

3. **Update vite.config.ts:**
   ```typescript
   import { defineConfig } from 'vite';

   export default defineConfig({
     base: '/flat-earth-engine/',
     build: {
       outDir: 'dist',
     },
   });
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

**Deploy URL:** `https://eshe-huli.github.io/flat-earth-engine`

---

### Option 4: Cloudflare Pages

**Why Cloudflare Pages:**
- Ultra-fast global CDN
- Unlimited bandwidth (free tier)
- Advanced analytics

**Steps:**
1. Visit [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect GitHub account
3. Select `eshe-huli/flat-earth-engine`
4. Build settings:
   ```
   Framework preset: Vite
   Build command: npm run build
   Build output: /dist
   ```
5. Click "Save and Deploy"

**Deploy URL:** `https://flat-earth-engine.pages.dev` (or custom domain)

---

## 🔧 Pre-Deployment Checklist

### 1. Production Build Test
```bash
npm run build
npm run preview
# Visit http://localhost:4173
```

**Expected output:**
- ✅ Build completes without errors
- ✅ Bundle size: ~49 KB (gzipped: ~15 KB)
- ✅ All 5 view modes work
- ✅ No console errors

### 2. Performance Optimization

**Already optimized:**
- ✅ Vite code splitting
- ✅ Tree shaking enabled
- ✅ Minification enabled
- ✅ GLSL shaders imported as raw strings

**Optional optimizations:**
```typescript
// vite.config.ts - Add compression
import { defineConfig } from 'vite';
import { compression } from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    compression({ algorithm: 'gzip' }),
    compression({ algorithm: 'brotli' }),
  ],
});
```

### 3. Browser Compatibility

**Requirements:**
- WebGL 2.0 support (Chrome 56+, Firefox 51+, Safari 15+)
- ES2020+ JavaScript features
- CSS Grid and Flexbox

**Fallback message** (already implemented in index.html):
```html
<p>Make sure your browser supports WebGL 2.0</p>
```

---

## 🌐 Custom Domain Setup

### For Vercel/Netlify/Cloudflare:

1. **Add domain in platform dashboard**
2. **Update DNS records:**
   ```
   Type: CNAME
   Name: www (or @)
   Value: [platform-provided-url]
   ```
3. **Wait for SSL certificate** (automatic, 5-10 minutes)

---

## 📊 Monitoring & Analytics

### Add Google Analytics (Optional)

**In index.html before `</head>`:**
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Performance Monitoring

Use built-in FPS counter (already implemented):
- Display in UI: `<span id="fps">60</span>`
- Monitor via browser DevTools → Performance tab

---

## 🔒 Security Headers (Optional)

### Add to netlify.toml:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "no-referrer"
    Permissions-Policy = "accelerometer=(), camera=(), geolocation=(), microphone=()"
```

### Add to vercel.json:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

---

## 🧪 Testing Deployment

### Automated Tests (Future Enhancement)
```bash
# Install testing libraries
npm install --save-dev @playwright/test

# Create e2e test
# tests/e2e.spec.ts
import { test, expect } from '@playwright/test';

test('Flat Earth Engine loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#canvas')).toBeVisible();
  await expect(page.locator('#loading')).toHaveClass(/hidden/);
});

test('All view modes work', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-view="climate"]');
  // Add assertions
});
```

---

## 📦 Environment Variables (If Needed)

### For future API integrations:

**Create .env.production:**
```env
VITE_API_URL=https://api.example.com
VITE_ANALYTICS_ID=GA_MEASUREMENT_ID
```

**Access in code:**
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

**Configure in deployment platform:**
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- Cloudflare: Settings → Environment Variables

---

## 🎯 Post-Deployment

### 1. Verify Functionality
- [ ] Test all 5 view modes (Earth, EM Field, Solar, Climate, GPS)
- [ ] Test time controls (play/pause, scrub, speed)
- [ ] Test camera controls (pan, zoom)
- [ ] Test parameter sliders
- [ ] Test screenshot export
- [ ] Check mobile responsiveness
- [ ] Verify WebGL performance (60 FPS)

### 2. Share Links
```
Production URL: https://your-domain.com
GitHub Repo: https://github.com/eshe-huli/flat-earth-engine
Documentation: https://your-domain.com/README.md
```

### 3. Maintenance

**Regular updates:**
```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Rebuild and redeploy
npm run build && npm run deploy
```

---

## 🚨 Troubleshooting

### Issue: Build fails with "Module not found"
**Solution:** Check import paths are correct, run `npm install`

### Issue: WebGL context lost
**Solution:** Already handled in code with error messages

### Issue: Performance issues on mobile
**Solution:**
- Reduce number of GPS stations (currently 1000)
- Reduce streamline count (currently 24)
- Adjust in `src/main.ts`:
  ```typescript
  this.gps.generateStations(500); // Reduce to 500
  this.fieldRenderer.generateStreamlines(this.emField, 12); // Reduce to 12
  ```

### Issue: Blank screen in production
**Solution:**
- Check browser console for errors
- Verify WebGL 2.0 support
- Check base URL in vite.config.ts matches deployment path

---

## ✅ Deployment Complete!

Once deployed, your Flat Earth Engine will be live and accessible worldwide with:
- ⚡ Fast loading (<2s on 4G)
- 🌍 Global CDN distribution
- 🔒 HTTPS encryption
- 📱 Mobile-friendly responsive design
- 🎨 All 5 interactive visualization modes
- 🚀 60 FPS GPU-accelerated rendering

**Example Production URL:**
```
https://flat-earth-engine.vercel.app
```

**Share your deployment!** 🎉
