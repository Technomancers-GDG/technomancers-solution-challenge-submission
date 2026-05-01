# 🚢 Disruption-Aware Logistics: Deployment Guide

Getting the SOLV frontend and backend up and running is pretty straightforward. You have a few great ways to host the platform—from serving it bundled in FastAPI to dropping it into a Docker container. Here’s everything you need to know.

## 🏃 Local Development

Running it locally during development is simple:

```bash
cd frontend
npm install
npm run dev
```

Your React app will spring to life at `http://localhost:5173`. 
*(Need to test the built version locally? Run `npm run build` followed by `npm run preview`, and head over to `http://localhost:4173`!)*

---

## 📦 What gets built?

When you run `npm run build`, Vite takes your app and creates a highly optimized build inside the `dist/` directory.

We’ve split out all the core dependencies (like React & ReactDOM) and advanced views into their own separate chunks. This keeps the initial load incredibly fast. 

---

## 🚀 Deployment Options

### Option 1: FastAPI Static Files (Quick & Easy)

If you're already running the FastAPI backend (and it's currently our primary delivery method!), serving the frontend straight from FastAPI is highly recommended.

**How it works**
We configure the FastAPI `main.py` application to mount your `frontend/dist` directory:

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# This effortlessly serves the React app from the root path
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
```

**Result**: 
- Frontend served at `http://localhost:8000/`
- API routes live safely under `http://localhost:8000/api/...`

### Option 2: Nginx (Production-Ready)

Hosting SOLV on a Linux VPS? An Nginx reverse proxy handles routing flawlessly and keeps everything blazing fast.

**Crucial Steps:**
1. Proxy `/` to serve the static frontend app from your build files.
2. Proxy `/api/` traffic to your local FastAPI backend instance running on port 8000.
3. Keep WebSockets working properly by upgrading headers on the `/ws` route.

*Be sure to enable `gzip` on your server block to squeeze those assets down by ~70%!*

### Option 3: Docker (Run Anywhere)

If you prefer an isolated container environment, we’ve laid out a multi-stage `Dockerfile`. 
It builds the React app cleanly, then transfers the final static layout over to a Python slim container. 

```bash
# Build & Run magic:
docker build -t solv-app .
docker run -p 8000:8000 solv-app
```

---

## 🔧 Environment Configuration

You'll need environment variables to tell the frontend where to find the API. Set up `.env` files locally or configure your production host.

**Development (`.env.local`)**
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITE_ENVIRONMENT=development
```

**Production (`.env.production`)**
```bash
VITE_API_BASE_URL=https://api.solv.example.com
VITE_WS_BASE_URL=wss://api.solv.example.com
```

Pick the flavor of deployment that best suits your team, and ship it!
VITE_WS_BASE_URL=wss://api.solv.example.com
VITE_ENVIRONMENT=production
VITE_ENABLE_TESTING=false
VITE_APP_VERSION=1.0.0
```

**Note**: Create `.env.local` or `.env.production` based on `.env.example`

---

## Performance Optimization

### Caching Headers

Set these headers for static assets:

```
# HTML - No cache
Cache-Control: no-cache, no-store, must-revalidate

# CSS & JS with content hash - Long-term cache
Cache-Control: public, max-age=31536000, immutable

# Images - 30 days
Cache-Control: public, max-age=2592000
```

### Compression

Enable gzip compression for:
- `.css` files
- `.js` files
- `.json` responses
- `.html` files

Example (Nginx):
```nginx
gzip on;
gzip_types text/css application/javascript application/json text/html;
gzip_min_length 1024;
gzip_vary on;
```

### Content Delivery Network (CDN)

For production, use a CDN like Cloudflare or AWS CloudFront:

1. Upload `dist/` contents to CDN
2. Configure CDN origin to backend server
3. Point domain to CDN
4. Cache rules:
   - `index.html`: No cache
   - `/assets/*`: Cache 1 year
   - `/api/*`: No cache (proxy to origin)

---

## Testing

### Unit Tests

```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

### Build Verification

```bash
npm run build            # Build production bundle
npm run preview          # Test locally on port 4173
```

Then visit `http://localhost:4173` and verify:
- [ ] Page loads without errors
- [ ] All tabs accessible
- [ ] WebSocket connection works
- [ ] API calls succeed
- [ ] Language switching works
- [ ] Responsive on mobile (test with DevTools)

---

## Troubleshooting

### WebSocket Connection Fails

**Symptoms**: Error when connecting to WebSocket, simulation doesn't update

**Solutions**:
1. Check backend is running: `http://localhost:8000/api/dashboard`
2. Verify WS_BASE_URL is correct in environment
3. Check browser console for errors (F12 → Console)
4. For reverse proxy (Nginx): Ensure WebSocket upgrade headers are set

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### API Calls Fail with CORS Error

**Symptoms**: Console shows "CORS policy" error

**Solutions**:
1. Check backend CORS configuration
2. Verify API_BASE_URL matches backend origin
3. For development, the proxy in `vite.config.js` handles CORS

### Bundle Size Too Large

**Symptoms**: Slow page load, large download

**Solutions**:
1. Check code splitting: Run `npm run build` and review chunk sizes
2. Lazy load heavy components (Map, Analytics)
3. Remove unused dependencies: `npm prune`
4. Enable production mode: `NODE_ENV=production npm run build`

### Styles Not Loading

**Symptoms**: Page appears unstyled

**Solutions**:
1. Check CSS file is in dist/assets
2. Verify no inline style errors
3. Clear browser cache (Ctrl+Shift+Delete)
4. Check Content Security Policy (CSP) headers

---

## Security Checklist

- [ ] HTTPS enabled in production
- [ ] CORS properly configured (backend should restrict origins)
- [ ] Content Security Policy (CSP) headers set
- [ ] X-Frame-Options header set (prevent clickjacking)
- [ ] X-Content-Type-Options: nosniff
- [ ] Environment variables not committed to git
- [ ] Dependencies are from trusted sources
- [ ] No sensitive data in frontend code
- [ ] Input validation on all forms
- [ ] API authentication tokens managed securely

---

## Monitoring

### Application Monitoring

Use tools like:
- **Sentry**: Error tracking and performance monitoring
- **Google Analytics**: User behavior tracking
- **New Relic**: Full-stack monitoring

### Health Checks

```bash
# Check if app is running
curl http://localhost:8000/

# Check API health
curl http://localhost:8000/api/dashboard
```

### Logs

Check browser console (F12 → Console):
- Network errors
- JavaScript errors
- WebSocket connection status
- API call results

Server logs:
```bash
# If using systemd
journalctl -u solv-backend -f

# If running directly
# Look for output in terminal
```

---

## Maintenance

### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update minor/patch versions
npm update

# Update to latest major version (careful!)
npm install package@latest
```

### Security Updates

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Or manually review and fix critical issues
```

### Backup

Before deploying:
```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Support

For issues or questions:

1. Check `FRONTEND_IMPLEMENTATION_PLAN.md` for architecture details
2. Check `PHASE_10_IMPLEMENTATION.md` for optimization details
3. Review browser console for error messages
4. Check server logs for API errors
5. Contact the development team

---

## Additional Resources

- **Vite Documentation**: https://vitejs.dev/
- **React Documentation**: https://react.dev/
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **WCAG 2.1 Accessibility**: https://www.w3.org/WAI/WCAG21/quickref/
- **HTTP Caching**: https://web.dev/http-cache/

---

## Hackathon Deployment (Render Free Tier + Cron Job)

For hackathon submissions where judges may visit your link at any time, use this zero-budget setup to keep the app awake 24/7.

### Step 1: Push to GitHub

Make sure your repo includes:
- `render.yaml` — Render Blueprint (already in repo root)
- `build.sh` — Build script (already in repo root)
- All source code, Excel data files, and the `data/` directory

```bash
git add render.yaml build.sh
git commit -m "Add Render deployment config"
git push origin main
```

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and sign up (free, no credit card required)
2. Click **New +** → **Blueprint**
3. Connect your GitHub repository
4. Render reads `render.yaml` and creates the service automatically
5. Wait for the first deploy to complete (2–3 minutes)
6. Copy your app's URL: `https://solv-hackathon.onrender.com`

**URLs after deploy:**
- Admin Panel: `https://solv-hackathon.onrender.com/`
- Driver App: `https://solv-hackathon.onrender.com/driver`
- API Health: `https://solv-hackathon.onrender.com/api/health`
- Swagger Docs: `https://solv-hackathon.onrender.com/docs`

### Step 3: Keep It Awake with cron-job.org

Render's free tier sleeps after 15 minutes of inactivity. Set up a free cron job to ping it every 10 minutes:

1. Go to [cron-job.org](https://cron-job.org) and create a free account
2. Click **Create cronjob**
3. Fill in:
   - **Title**: Solv Hackathon Uptime
   - **URL**: `https://solv-hackathon.onrender.com/api/health`
   - **Schedule**: Every 10 minutes
4. Save and enable the job

Your app will now stay warm and respond instantly when judges click the link.

### Step 4: Share with Judges

Include these in your submission:
- **Live App**: `https://solv-hackathon.onrender.com`
- **GitHub Repo**: `https://github.com/Technomancers-GDG/solv-v2`
- **API Docs**: `https://solv-hackathon.onrender.com/docs`

### Troubleshooting

| Issue | Solution |
|---|---|
| Build fails on Render | Check Render dashboard logs; usually a missing dependency in `requirements.txt` |
| Frontend shows blank page | Ensure `frontend/dist` and `driver-app-main/dist` were built in `build.sh` |
| API works but UI doesn't | Check browser DevTools → Network for 404s on `/assets/` or `/driver-assets/` |
| App is slow on first load | This is normal if the cron job hasn't pinged it yet; wait 10–15 seconds |
| SQLite data resets | Expected on free tier — `DEMO_MODE=true` auto-seeds data on every restart |

---

**Last Updated**: April 25, 2026  
**Version**: 1.0.0  
**Status**: Production Ready ✅
