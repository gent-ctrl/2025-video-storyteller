# Deploy AI Video Storyteller - Step by Step Guide

## Overview

You'll deploy:
1. **Backend** → Google Cloud Run (serverless)
2. **Frontend** → Firebase Hosting (or Vercel/Netlify)

Total time: ~30 minutes

---

## Part 1: Deploy Backend to Cloud Run

### Step 1: Prepare Backend for Deployment

#### A. Create production Dockerfile

Your backend already has a Dockerfile, but let's create one specifically for the Gemini 3 version:

**File: `backend/Dockerfile.gemini3`**

```dockerfile
FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY server-gemini3.js ./
COPY .env ./
COPY service-account-key.json ./

# Expose port
EXPOSE 8080

# Set production port
ENV PORT=8080

# Start server
CMD ["node", "server-gemini3.js"]
```

#### B. Update package.json for production

Add a start script:

```json
{
  "scripts": {
    "start": "node server-gemini3.js",
    "dev:gemini3": "nodemon server-gemini3.js"
  }
}
```

#### C. Create .dockerignore

**File: `backend/.dockerignore`**

```
node_modules
npm-debug.log
.git
.gitignore
*.md
temp/
test*.js
```

### Step 2: Deploy Backend to Cloud Run

Open **Google Cloud Shell** or your terminal with gcloud CLI:

```bash
# 1. Set your project
gcloud config set project rewrite-captions

# 2. Navigate to backend
cd "D:\PW Dropbox\tik tek\AI Stuff\Video Generation\gt-video-storyteller\backend"

# 3. Deploy to Cloud Run
gcloud run deploy video-storyteller-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT_ID=rewrite-captions,GOOGLE_CLOUD_LOCATION=us-central1,GCS_BUCKET_NAME=gt-video-storyteller-uploads,GOOGLE_AI_API_KEY=AIzaSyCUigDVrKZ6kLfGK6cdaL5CoDMhF1-Ard4 \
  --memory 2Gi \
  --timeout 3600 \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 5
```

**Important flags explained:**
- `--allow-unauthenticated`: Anyone can access the API
- `--memory 2Gi`: 2GB RAM (enough for video processing)
- `--timeout 3600`: 60 min timeout (Gemini can take time)
- `--min-instances 0`: Scales to zero when not used (saves money)
- `--max-instances 5`: Max 5 instances for traffic spikes

### Step 3: Get Your Backend URL

After deployment completes, you'll see:

```
Service [video-storyteller-backend] revision [video-storyteller-backend-00001-xyz] has been deployed and is serving 100 percent of traffic.
Service URL: https://video-storyteller-backend-abc123-uc.a.run.app
```

**Copy this URL!** You'll need it for the frontend.

### Step 4: Test Backend

```bash
# Test health endpoint
curl https://video-storyteller-backend-abc123-uc.a.run.app/health

# Should return:
{"status":"healthy","timestamp":"2025-12-25T..."}
```

---

## Part 2: Deploy Frontend

### Option A: Firebase Hosting (Recommended - Free & Fast)

#### Step 1: Build Frontend

```bash
# Navigate to frontend
cd ../frontend

# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Build production bundle
npm run build
```

#### Step 2: Configure Frontend API URL

Before building, update the API URL to point to your Cloud Run backend:

**File: `frontend/src/App.tsx`**

Find this line:
```typescript
const API_BASE_URL = '/api';
```

Change to:
```typescript
const API_BASE_URL = 'https://video-storyteller-backend-abc123-uc.a.run.app/api';
```

**Then rebuild:**
```bash
npm run build
```

#### Step 3: Initialize Firebase

```bash
# Initialize Firebase Hosting
firebase init hosting

# Answer the prompts:
? Select project: rewrite-captions (or create new)
? What do you want to use as your public directory? dist
? Configure as a single-page app? Yes
? Set up automatic builds with GitHub? No
? File dist/index.html already exists. Overwrite? No
```

#### Step 4: Deploy to Firebase

```bash
firebase deploy --only hosting

# After deployment, you'll get:
✔  Deploy complete!
Hosting URL: https://rewrite-captions.web.app
```

**That's your live URL!** 🎉

---

### Option B: Vercel (Alternative - Also Free)

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Update API URL

Same as Firebase - update `API_BASE_URL` in `frontend/src/App.tsx`:

```typescript
const API_BASE_URL = 'https://video-storyteller-backend-abc123-uc.a.run.app/api';
```

#### Step 3: Deploy

```bash
cd frontend

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Follow prompts:
? Set up and deploy? Yes
? Which scope? Your account
? Link to existing project? No
? What's your project's name? ai-video-storyteller
? In which directory is your code located? ./
? Want to override settings? No

# You'll get:
✅ Production: https://ai-video-storyteller.vercel.app
```

---

### Option C: Netlify (Alternative - Also Free)

#### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

#### Step 2: Update API URL

Same as above - update `API_BASE_URL`:

```typescript
const API_BASE_URL = 'https://video-storyteller-backend-abc123-uc.a.run.app/api';
```

#### Step 3: Deploy

```bash
cd frontend

# Build
npm run build

# Deploy
netlify deploy --prod

# Follow prompts:
? Path to deploy? dist

# You'll get:
✅ Live URL: https://ai-video-storyteller.netlify.app
```

---

## Part 3: Configure CORS (Important!)

Your backend needs to accept requests from your frontend domain.

### Update Backend CORS Settings

**File: `backend/server-gemini3.js`**

Find this line:
```javascript
app.use(cors());
```

Change to:
```javascript
app.use(cors({
  origin: [
    'https://rewrite-captions.web.app',           // Firebase
    'https://ai-video-storyteller.vercel.app',    // Vercel
    'http://localhost:5173'                        // Local dev
  ],
  credentials: true
}));
```

**Redeploy backend:**
```bash
cd backend
gcloud run deploy video-storyteller-backend --source .
```

---

## Part 4: Final Configuration

### Update Environment Variables

If you didn't use `--set-env-vars` during Cloud Run deployment, you can add them via console:

1. Go to: https://console.cloud.google.com/run?project=rewrite-captions
2. Click on `video-storyteller-backend`
3. Click **"EDIT & DEPLOY NEW REVISION"**
4. Go to **"Variables & Secrets"** tab
5. Add these environment variables:
   - `GOOGLE_CLOUD_PROJECT_ID`: `rewrite-captions`
   - `GOOGLE_CLOUD_LOCATION`: `us-central1`
   - `GCS_BUCKET_NAME`: `gt-video-storyteller-uploads`
   - `GOOGLE_AI_API_KEY`: `AIzaSyCUigDVrKZ6kLfGK6cdaL5CoDMhF1-Ard4`
6. Click **"DEPLOY"**

---

## Part 5: Test Your Live App! 🚀

### Step 1: Visit Your Frontend URL

Go to:
- Firebase: `https://rewrite-captions.web.app`
- Vercel: `https://ai-video-storyteller.vercel.app`
- Netlify: `https://ai-video-storyteller.netlify.app`

### Step 2: Upload a Video

1. Upload a test video
2. Click "Generate Stories"
3. Wait for it to process
4. See your story!

### Step 3: Check Backend Logs

View logs in Google Cloud Console:
```bash
# Or via command line:
gcloud run logs read video-storyteller-backend --project=rewrite-captions --limit=50
```

---

## Cost Breakdown (After Deployment)

### Free Tier Usage (0-100 videos/month):

**Google Cloud:**
- Cloud Run: $0 (free tier covers light usage)
- Gemini API: $12-15 for 100 videos
- Cloud Storage: $0.02
- **Total: ~$12-15/month**

**Frontend Hosting:**
- Firebase/Vercel/Netlify: $0 (free tier)

### Light Usage (100-500 videos/month):

**Google Cloud:**
- Cloud Run: $20-40
- Gemini API: $60-75
- Cloud Storage: $0.50
- **Total: ~$80-115/month**

**Frontend:** Still free!

---

## Troubleshooting

### Backend Not Responding

```bash
# Check if service is running
gcloud run services list --project=rewrite-captions

# Check logs
gcloud run logs read video-storyteller-backend --limit=20
```

### CORS Errors in Browser

- Make sure you updated CORS settings in backend
- Make sure you redeployed after CORS changes
- Check browser console for exact error

### Timeout Errors

- Videos taking too long (> 60 min)
- Increase timeout: `--timeout 3600` (already set)
- Consider switching to Gemini 3 Flash (faster)

### API Key Not Working

- Make sure environment variables are set in Cloud Run
- Redeploy with correct `--set-env-vars`
- Check Cloud Run → Edit & Deploy → Variables tab

---

## Security Best Practices

### 1. Add Rate Limiting

Install rate limiter:
```bash
cd backend
npm install express-rate-limit
```

Add to `server-gemini3.js`:
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20 // limit each IP to 20 requests per 15 min
});

app.use('/api/', limiter);
```

### 2. Set Up Budget Alerts

```bash
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT \
  --display-name="AI Video Storyteller Budget" \
  --budget-amount=100USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90
```

### 3. Monitor Usage

Go to: https://console.cloud.google.com/monitoring?project=rewrite-captions

Set up alerts for:
- High error rates
- Unusual spending
- Service downtime

---

## Post-Deployment Checklist

- [ ] Backend deployed to Cloud Run
- [ ] Backend URL working (test `/health`)
- [ ] Frontend built and deployed
- [ ] Frontend can reach backend (test upload)
- [ ] CORS configured correctly
- [ ] Environment variables set
- [ ] Rate limiting enabled
- [ ] Budget alerts configured
- [ ] Monitoring set up
- [ ] Domain name configured (optional)

---

## Optional: Custom Domain

### For Backend:
```bash
gcloud run domain-mappings create --service=video-storyteller-backend \
  --domain=api.yourdomain.com \
  --region=us-central1
```

### For Frontend (Firebase):
```bash
firebase hosting:channel:deploy production --project=rewrite-captions
# Then add custom domain in Firebase Console
```

---

## Quick Deploy Commands Summary

```bash
# Backend
cd backend
gcloud run deploy video-storyteller-backend --source . --region=us-central1

# Frontend (Firebase)
cd frontend
npm run build
firebase deploy --only hosting

# Frontend (Vercel)
cd frontend
vercel --prod

# Frontend (Netlify)
cd frontend
npm run build
netlify deploy --prod
```

---

## You're Live! 🎉

Your app is now online and accessible to anyone!

**Share your URL and start processing videos!** 🎬✨



