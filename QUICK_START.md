# Quick Start Guide - GT Video Storyteller

This is a condensed guide to get you up and running quickly. For detailed instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

## Prerequisites

✅ Google Cloud account with billing  
✅ Node.js 18+  
✅ Redis (local or Cloud Memorystore)  
✅ gcloud CLI installed  

## 1. Google Cloud Setup (5 minutes)

```bash
# Set your project ID
export PROJECT_ID="gt-video-storyteller"

# Create and configure project
gcloud projects create $PROJECT_ID
gcloud config set project $PROJECT_ID

# Enable APIs
gcloud services enable aiplatform.googleapis.com storage.googleapis.com

# Create service account
gcloud iam service-accounts create video-storyteller-sa
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:video-storyteller-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:video-storyteller-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Download key
gcloud iam service-accounts keys create ./backend/service-account-key.json \
    --iam-account=video-storyteller-sa@${PROJECT_ID}.iam.gserviceaccount.com

# Create storage bucket
gsutil mb -p $PROJECT_ID -l us-central1 gs://${PROJECT_ID}-uploads
```

## 2. Local Development Setup (3 minutes)

### Backend

```bash
cd backend
npm install
cp env.example .env

# Edit .env:
# - GOOGLE_CLOUD_PROJECT_ID=gt-video-storyteller
# - GCS_BUCKET_NAME=gt-video-storyteller-uploads
# - REDIS_HOST=localhost (or your Redis IP)

# Start Redis
redis-server  # or: brew services start redis

# Start backend
npm run dev
```

Backend runs on **http://localhost:3000**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

## 3. Test It! (1 minute)

1. Open http://localhost:5173
2. Drag & drop a video file
3. Click "Generate Stories"
4. Watch the magic happen! ✨

## 4. Deploy to Production (10 minutes)

### Deploy Backend to Cloud Run

```bash
cd backend
gcloud run deploy video-storyteller-backend \
    --source . \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=us-central1,GCS_BUCKET_NAME=${PROJECT_ID}-uploads,REDIS_HOST=YOUR_REDIS_IP \
    --memory 2Gi \
    --timeout 3600 \
    --min-instances 1 \
    --max-instances 10
```

### Deploy Frontend to Firebase

```bash
cd frontend
npm run build

npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

**Done!** 🎉

## Common Issues

| Problem | Solution |
|---------|----------|
| "Authentication failed" | Check service account key path in .env |
| "Bucket not found" | Verify bucket name matches in .env |
| "Redis connection refused" | Ensure Redis is running: `redis-cli ping` |
| "Quota exceeded" | Request increase in GCP Console |

## Cost Calculator

**Per video estimates:**
- 1 min: $0.10-0.30
- 5 min: $0.50-1.50
- 10 min: $1.00-3.00

**Monthly estimates (100 users, 10 videos/day each):**
- Gemini API: ~$1,500-3,000
- Cloud Storage: ~$20-50
- Cloud Run: ~$100-300
- Redis: ~$50-100
- **Total: ~$1,700-3,500/month**

## Scaling Tips

| Traffic | Config |
|---------|--------|
| Light (<100 videos/day) | min-instances=0, MAX_CONCURRENT_JOBS=3 |
| Medium (100-1000/day) | min-instances=1, MAX_CONCURRENT_JOBS=5 |
| Heavy (1000+/day) | min-instances=3, MAX_CONCURRENT_JOBS=10+ |

## Next Steps

- [ ] Add authentication (Firebase Auth)
- [ ] Set up monitoring (Cloud Logging)
- [ ] Configure budget alerts
- [ ] Add rate limiting
- [ ] Implement video compression
- [ ] Set up CI/CD

## Support

📚 Full docs: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)  
🐛 Issues: Check Cloud Logging first  
💬 Questions: Review the troubleshooting section  

**Happy building!** 🚀



