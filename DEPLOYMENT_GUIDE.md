# GT Video Storyteller - Google Cloud Deployment Guide

## Prerequisites

- Google Cloud Platform account with billing enabled
- Node.js 18+ installed locally
- Redis instance (Cloud Memorystore or local)
- gcloud CLI installed and configured

## Step 1: Google Cloud Project Setup

### 1.1 Create a New Project

```bash
gcloud projects create gt-video-storyteller --name="GT Video Storyteller"
gcloud config set project gt-video-storyteller
```

### 1.2 Enable Required APIs

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Enable Cloud Storage API
gcloud services enable storage.googleapis.com

# Enable Cloud Run (if deploying to Cloud Run)
gcloud services enable run.googleapis.com

# Enable Cloud Build
gcloud services enable cloudbuild.googleapis.com
```

### 1.3 Create Service Account

```bash
# Create service account
gcloud iam service-accounts create video-storyteller-sa \
    --display-name="Video Storyteller Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding gt-video-storyteller \
    --member="serviceAccount:video-storyteller-sa@gt-video-storyteller.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding gt-video-storyteller \
    --member="serviceAccount:video-storyteller-sa@gt-video-storyteller.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Download service account key
gcloud iam service-accounts keys create ./backend/service-account-key.json \
    --iam-account=video-storyteller-sa@gt-video-storyteller.iam.gserviceaccount.com
```

## Step 2: Cloud Storage Setup

### 2.1 Create Storage Bucket

```bash
# Create bucket for video uploads
gsutil mb -p gt-video-storyteller -l us-central1 gs://gt-video-storyteller-uploads

# Set lifecycle policy to delete files after 7 days (optional)
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 7}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://gt-video-storyteller-uploads
```

## Step 3: Redis Setup

### Option A: Cloud Memorystore (Recommended for Production)

```bash
gcloud redis instances create video-queue-redis \
    --size=1 \
    --region=us-central1 \
    --redis-version=redis_7_0 \
    --tier=basic

# Get connection info
gcloud redis instances describe video-queue-redis --region=us-central1
```

### Option B: Local Redis (Development Only)

```bash
# Install Redis locally
# On macOS:
brew install redis
brew services start redis

# On Ubuntu:
sudo apt-get install redis-server
sudo systemctl start redis
```

## Step 4: Backend Configuration

### 4.1 Configure Environment Variables

```bash
cd backend
cp env.example .env
```

Edit `.env` with your values:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=gt-video-storyteller
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json

# Cloud Storage
GCS_BUCKET_NAME=gt-video-storyteller-uploads

# Server Configuration
PORT=3000
NODE_ENV=production

# Redis Configuration
REDIS_HOST=10.x.x.x  # Use Cloud Memorystore IP or localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Gemini 3 Pro Settings
MAX_CONCURRENT_JOBS=5
VIDEO_MAX_SIZE_MB=500
```

### 4.2 Install Dependencies

```bash
npm install
```

### 4.3 Test Locally

```bash
npm run dev
```

## Step 5: Frontend Configuration

### 5.1 Install Dependencies

```bash
cd frontend
npm install
```

### 5.2 Test Locally

```bash
npm run dev
```

Visit `http://localhost:5173` to test the app.

## Step 6: Deploy to Google Cloud

### Option A: Deploy to Cloud Run (Recommended)

#### Backend Deployment

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

Deploy:

```bash
cd backend

# Build and deploy
gcloud run deploy video-storyteller-backend \
    --source . \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars GOOGLE_CLOUD_PROJECT_ID=gt-video-storyteller,GOOGLE_CLOUD_LOCATION=us-central1,GCS_BUCKET_NAME=gt-video-storyteller-uploads,REDIS_HOST=YOUR_REDIS_IP,MAX_CONCURRENT_JOBS=5,VIDEO_MAX_SIZE_MB=500 \
    --memory 2Gi \
    --timeout 3600 \
    --cpu 2 \
    --min-instances 1 \
    --max-instances 10
```

#### Frontend Deployment

Build and deploy to Firebase Hosting or Cloud Storage + Cloud CDN:

```bash
cd frontend

# Build
npm run build

# Deploy to Firebase Hosting (recommended)
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

Or deploy to Cloud Storage:

```bash
# Create bucket for frontend
gsutil mb -p gt-video-storyteller gs://gt-video-storyteller-frontend

# Enable public access
gsutil iam ch allUsers:objectViewer gs://gt-video-storyteller-frontend

# Upload files
gsutil -m rsync -r dist/ gs://gt-video-storyteller-frontend

# Configure as website
gsutil web set -m index.html -e index.html gs://gt-video-storyteller-frontend
```

### Option B: Deploy to Compute Engine or GKE

See Google Cloud documentation for VM or Kubernetes deployment.

## Step 7: Scaling Configuration

### 7.1 Adjust Concurrent Processing

Edit `MAX_CONCURRENT_JOBS` in your `.env`:

- **Small scale** (1-10 users): `MAX_CONCURRENT_JOBS=3`
- **Medium scale** (10-100 users): `MAX_CONCURRENT_JOBS=5-10`
- **Large scale** (100+ users): `MAX_CONCURRENT_JOBS=20+` with autoscaling

### 7.2 Monitor Costs

Gemini 3 Pro pricing (as of Dec 2025):
- **Input**: ~$0.000125 per 1K characters
- **Output**: ~$0.000375 per 1K characters
- **Video**: Charged per second of video processed

**Estimated costs per video:**
- 1-minute video: ~$0.10-0.30
- 5-minute video: ~$0.50-1.50
- 10-minute video: ~$1.00-3.00

### 7.3 Set Budget Alerts

```bash
# Create budget alert
gcloud billing budgets create \
    --billing-account=YOUR_BILLING_ACCOUNT \
    --display-name="Video Storyteller Budget" \
    --budget-amount=1000USD \
    --threshold-rule=percent=50 \
    --threshold-rule=percent=90 \
    --threshold-rule=percent=100
```

## Step 8: Security Best Practices

### 8.1 Never Expose Service Account Keys

- Keep `service-account-key.json` in `.gitignore`
- Use Cloud Run's built-in service account instead when possible
- Rotate keys regularly

### 8.2 Add CORS Configuration

In `backend/server.js`, update CORS:

```javascript
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true
}));
```

### 8.3 Add Rate Limiting

Install and configure:

```bash
npm install express-rate-limit
```

Add to `server.js`:

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## Step 9: Monitoring & Logging

### 9.1 Enable Cloud Logging

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=video-storyteller-backend" --limit 50 --format json
```

### 9.2 Set Up Alerts

Create alerts for:
- High error rates
- Slow response times
- Queue backup
- Storage quota

## Step 10: Testing

### 10.1 Test Single Video Upload

```bash
curl -X POST http://YOUR_BACKEND_URL/api/upload \
  -F "videos=@test-video.mp4"
```

### 10.2 Test Batch Upload

Upload multiple videos through the frontend interface.

### 10.3 Monitor Queue

```bash
curl http://YOUR_BACKEND_URL/api/stats
```

## Troubleshooting

### Issue: "Quota exceeded"

**Solution:** Request quota increase in Google Cloud Console under "Vertex AI quotas".

### Issue: "Authentication failed"

**Solution:** Verify service account permissions and key file path.

### Issue: "Video too large"

**Solution:** Increase `VIDEO_MAX_SIZE_MB` or add client-side compression.

### Issue: "Slow processing"

**Solution:** 
- Increase `MAX_CONCURRENT_JOBS`
- Scale up Cloud Run instances
- Check Redis connection

## Cost Optimization Tips

1. **Use Cloud Storage lifecycle policies** to auto-delete old videos
2. **Set min-instances=0** for Cloud Run during low traffic
3. **Use Gemini 3 Flash** instead of Pro for faster/cheaper results
4. **Implement client-side video compression** before upload
5. **Cache common results** in Redis
6. **Set up autoscaling** based on queue depth

## Next Steps

- Add user authentication (Firebase Auth, Auth0)
- Implement video preview before processing
- Add download/export functionality for stories
- Set up CI/CD pipeline (Cloud Build, GitHub Actions)
- Add analytics (Google Analytics, Mixpanel)
- Implement video thumbnail generation

## Support

For issues:
1. Check Cloud Logging for error details
2. Verify service account permissions
3. Test Vertex AI API access separately
4. Review Redis connection

Happy deploying! 🚀




