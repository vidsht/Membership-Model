# 🚀 Hostinger + Render Deployment Guide

## Your Setup:
- **Frontend**: Hostinger (Static Files)
- **Backend**: Render.com (Node.js API)

## 📋 Complete Deployment Workflow

### 1. Build Frontend for Hostinger
```bash
npm run build-frontend
```
This creates a `frontend/build` folder with all static files.

### 2. Upload to Hostinger
**Manual Upload:**
1. Open Hostinger File Manager
2. Navigate to `public_html` folder
3. Upload ALL contents from `frontend/build` folder
4. Make sure `index.html` is in the root of `public_html`

**File Structure on Hostinger should be:**
```
public_html/
├── index.html
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
├── logo.png
├── manifest.json
└── .htaccess
```

### 3. Update .htaccess on Hostinger
Make sure your `.htaccess` file in `public_html` contains:
```apache
RewriteEngine On

# Handle React Router (SPA routing)
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Cache Control for HTML files
<FilesMatch "\.html$">
  Header set Cache-Control "public, max-age=300, must-revalidate"
</FilesMatch>

# Cache Control for JS and CSS files
<FilesMatch "\.(js|css)$">
  Header set Cache-Control "public, max-age=3600, must-revalidate"
</FilesMatch>

# Cache Control for Images
<FilesMatch "\.(jpg|jpeg|png|gif|webp|svg|ico|avif)$">
  Header set Cache-Control "public, max-age=86400"
</FilesMatch>

# Cache Control for Fonts
<FilesMatch "\.(woff|woff2|ttf|eot|otf)$">
  Header set Cache-Control "public, max-age=2592000"
  Header set Access-Control-Allow-Origin "*"
</FilesMatch>

# JSON files
<FilesMatch "\.json$">
  Header set Cache-Control "public, max-age=300, must-revalidate"
</FilesMatch>
```

### 4. Deploy Backend to Render
Your backend is already on Render. When you push changes:
1. Push to GitHub
2. Render auto-deploys
3. Backend will be available at: `https://membership-model.onrender.com`

### 5. Force All Users to Refresh
After uploading to Hostinger, run:
```bash
npm run force-refresh-render
```

This will:
- ✅ Contact your Render backend
- ✅ Trigger global refresh for all users
- ✅ Users get notification and auto-refresh
- ✅ Everyone gets the new version

## 🎯 Complete Deployment Commands

### For Development Testing:
```bash
npm run deploy-local              # Build and test locally
npm run force-refresh            # Force refresh local users
```

### For Production (Hostinger + Render):
```bash
# Step 1: Build frontend
npm run build-frontend

# Step 2: Upload build folder contents to Hostinger public_html

# Step 3: Force all users to refresh
npm run force-refresh-render
```

### Quick Production Deploy:
```bash
npm run deploy-production       # Builds frontend + updates cache
# Then manually upload to Hostinger
npm run post-deploy            # Forces all users to refresh
```

## 🔧 Environment Variables

Make sure your frontend build has the correct API URL:

**In `frontend/.env`:**
```
VITE_API_URL=https://membership-model.onrender.com/api
```

**In your Render backend environment:**
```
FRONTEND_URL=https://membership.indiansinghana.com
NODE_ENV=production
```

## 📱 Verification Steps

After deployment:

1. **Test API Connection:**
   ```bash
   curl https://membership-model.onrender.com/api/cache-version
   ```

2. **Test Frontend:**
   - Visit https://membership.indiansinghana.com
   - Open Developer Tools → Console
   - Should see: "🔧 Global refresh detector initialized"

3. **Test Force Refresh:**
   ```bash
   npm run force-refresh-render
   ```
   - Visit the site
   - Should see red notification bar
   - Page should auto-refresh after 3 seconds

## 🚨 Troubleshooting

### Frontend Issues:
- **404 errors**: Check .htaccess is uploaded
- **API errors**: Verify VITE_API_URL in build
- **Routing issues**: Ensure React Router setup in .htaccess

### Backend Issues:
- **CORS errors**: Check CORS settings in server.js
- **503 errors**: Restart Render service

### Force Refresh Not Working:
```bash
# Check if backend is accessible
curl https://membership-model.onrender.com/api/cache-version

# Manually trigger cache bust
npm run cache-bust-render
```

## 📋 Deployment Checklist

- [ ] Build frontend: `npm run build-frontend`
- [ ] Upload to Hostinger public_html
- [ ] Verify .htaccess is correct
- [ ] Test site loads: https://membership.indiansinghana.com
- [ ] Force user refresh: `npm run force-refresh-render`
- [ ] Verify users get update notification
- [ ] Confirm new version is live

**Your deployment workflow is now optimized for Hostinger + Render! 🎉**