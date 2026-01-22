# GT Video Storyteller - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  React Frontend (Vite + TypeScript + Tailwind CSS)        │  │
│  │  - Batch video upload UI                                  │  │
│  │  - Real-time progress tracking                            │  │
│  │  - Story display                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              │ HTTP/REST API                      │
│                              ▼                                    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    BACKEND API SERVER                            │
│                 (Node.js + Express + Multer)                     │
│                                                                   │
│  Endpoints:                                                       │
│  • POST /api/upload        - Upload videos                       │
│  • GET  /api/job/:id       - Get job status                      │
│  • GET  /api/stats         - Queue statistics                    │
│                                                                   │
└───────────────┬────────────────┬──────────────┬─────────────────┘
                │                │              │
                │                │              │
        ┌───────▼─────┐  ┌───────▼───────┐  ┌─▼──────────────────┐
        │   Redis     │  │  Google Cloud │  │   Google Cloud     │
        │   Queue     │  │    Storage    │  │   Vertex AI        │
        │             │  │               │  │                    │
        │  Bull Jobs  │  │  Video Files  │  │  Gemini 3 Pro      │
        │  • pending  │  │  (temporary)  │  │  - Video analysis  │
        │  • active   │  │               │  │  - Story gen       │
        │  • complete │  │               │  │                    │
        └─────────────┘  └───────────────┘  └────────────────────┘
```

## Request Flow

### 1. Upload Phase

```
User uploads videos
       │
       ▼
Frontend validates files (type, size)
       │
       ▼
POST /api/upload with FormData
       │
       ▼
Backend receives files via Multer
       │
       ▼
Files uploaded to Cloud Storage
       │
       ▼
Jobs created in Redis Queue
       │
       ▼
Job ID returned to frontend
       │
       ▼
Frontend starts polling for status
```

### 2. Processing Phase

```
Queue worker picks up job
       │
       ▼
Video retrieved from Cloud Storage
       │
       ▼
Video sent to Gemini 3 Pro via Vertex AI
       │
       ▼
AI processes video and generates story
       │
       ▼
Story saved to job data
       │
       ▼
Job status updated to "completed"
       │
       ▼
Frontend receives update via polling
       │
       ▼
Story displayed to user
```

## Component Details

### Frontend (`frontend/`)

**Tech Stack:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling

**Key Features:**
- Multi-file drag & drop
- Real-time status updates
- Progress indicators
- Story preview with formatting

**State Management:**
```typescript
interface VideoFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  story?: string;
  error?: string;
  progress: number;
}
```

### Backend (`backend/`)

**Tech Stack:**
- Node.js 18+
- Express for REST API
- Multer for file uploads
- Bull for job queue
- Google Cloud SDK

**Key Components:**

1. **File Upload Handler**
   - Validates file type and size
   - Uploads to Cloud Storage
   - Creates queue jobs

2. **Queue Processor**
   - Processes up to N videos concurrently
   - Calls Vertex AI API
   - Updates job status

3. **Status Tracker**
   - In-memory job storage (use DB in production)
   - Provides job status via API

### Queue System (Bull + Redis)

**Why Bull?**
- Reliable job processing
- Priority support
- Retry logic
- Progress tracking
- Concurrency control

**Configuration:**
```javascript
const queue = new Queue('video-processing', {
  redis: { host, port, password },
  settings: {
    maxStalledCount: 3,
    stalledInterval: 30000,
  }
});

queue.process(MAX_CONCURRENT_JOBS, async (job) => {
  // Process video
});
```

### Google Cloud Storage

**Purpose:**
- Temporary video storage
- Accessible by Vertex AI
- Auto-cleanup with lifecycle policies

**Bucket Structure:**
```
gs://gt-video-storyteller-uploads/
  ├── job-id-1/
  │   ├── video-id-1-filename.mp4
  │   └── video-id-2-filename.mp4
  └── job-id-2/
      └── video-id-3-filename.mp4
```

### Google Cloud Vertex AI

**Model:** Gemini 3 Pro

**Capabilities:**
- Video understanding (up to 45 min with audio)
- Batch processing (up to 10 videos)
- Multimodal analysis
- High-quality text generation

**API Call:**
```javascript
const model = vertexAI.getGenerativeModel({
  model: 'gemini-3-pro'
});

const response = await model.generateContent({
  contents: [{
    role: 'user',
    parts: [
      { fileData: { fileUri: gcsUri, mimeType } },
      { text: prompt }
    ]
  }]
});
```

## Scaling Strategy

### Vertical Scaling
- Increase Cloud Run instance size
- Add more CPU/memory
- Increase MAX_CONCURRENT_JOBS

### Horizontal Scaling
- Add more Cloud Run instances
- Distribute load with Cloud Load Balancer
- Scale Redis with Cloud Memorystore HA

### Queue Optimization
```
Light load:
  MAX_CONCURRENT_JOBS = 3
  min-instances = 0
  
Medium load:
  MAX_CONCURRENT_JOBS = 5-10
  min-instances = 1
  
Heavy load:
  MAX_CONCURRENT_JOBS = 20+
  min-instances = 3-5
  autoscaling based on queue depth
```

## Security Architecture

### Authentication Flow (Future)
```
User login
    │
    ▼
Firebase Auth / Auth0
    │
    ▼
JWT token issued
    │
    ▼
Token sent with requests
    │
    ▼
Backend validates token
    │
    ▼
Request processed
```

### Data Security
- Service account with minimal permissions
- Signed URLs for Cloud Storage access
- CORS configuration for frontend domain
- Rate limiting per IP/user
- Video files auto-deleted after 7 days

### API Security
```javascript
// Rate limiting
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 100 }));

// CORS
app.use(cors({ origin: ['https://yourdomain.com'] }));

// File validation
upload.fileFilter = (req, file, cb) => {
  const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
  cb(null, allowed.includes(file.mimetype));
};
```

## Monitoring & Observability

### Metrics to Track
- **Queue depth**: Number of pending jobs
- **Processing time**: Time per video
- **Success rate**: Completed vs failed jobs
- **API latency**: Response times
- **Error rates**: Failed requests
- **Cost per video**: Gemini API usage

### Logging Strategy
```javascript
// Structured logging
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  jobId: job.id,
  videoId: video.id,
  event: 'processing_started',
  metadata: { fileSize, duration }
}));
```

### Alerts Setup
- Queue backup (>100 pending jobs)
- High error rate (>10% failures)
- Slow processing (>5 min per video)
- Budget threshold (>80% spent)

## Cost Architecture

### Cost Breakdown (per 1000 videos, avg 3 min each)

| Service | Cost | Notes |
|---------|------|-------|
| Gemini 3 Pro | $600-1,800 | Largest cost component |
| Cloud Storage | $5-15 | With 7-day lifecycle |
| Cloud Run | $30-100 | With autoscaling |
| Redis (Memorystore) | $50 | Basic tier |
| Networking | $10-30 | Egress charges |
| **Total** | **$695-1,995** | ~$0.70-2.00 per video |

### Optimization Strategies
1. Use Gemini 3 Flash for lower priority
2. Implement client-side compression
3. Batch similar videos in same request
4. Cache common results
5. Set aggressive lifecycle policies

## Deployment Options

### Option 1: Cloud Run (Recommended)
✅ Fully managed  
✅ Auto-scaling  
✅ Pay per use  
✅ Easy deployment  
❌ Cold starts  

### Option 2: Compute Engine
✅ Full control  
✅ No cold starts  
❌ Manual scaling  
❌ Higher baseline cost  

### Option 3: Google Kubernetes Engine (GKE)
✅ Enterprise-grade  
✅ Advanced orchestration  
❌ Complex setup  
❌ Higher cost  

## Disaster Recovery

### Backup Strategy
- Redis persistence enabled
- Job data backed up to Cloud SQL (recommended)
- Videos in Cloud Storage with versioning

### Failure Scenarios

| Failure | Impact | Recovery |
|---------|--------|----------|
| Redis down | Queue stops | Auto-reconnect, jobs resume |
| Cloud Storage unavailable | Uploads fail | Retry with exponential backoff |
| Vertex AI rate limit | Processing paused | Queue holds jobs, retries later |
| Backend crash | In-progress jobs lost | Bull recovers jobs after restart |

## Future Enhancements

### Phase 1 (MVP+)
- [ ] User authentication
- [ ] Database for job persistence
- [ ] Video thumbnails
- [ ] Export to PDF/Word

### Phase 2 (Growth)
- [ ] Multiple story styles
- [ ] Custom prompts
- [ ] Collaborative editing
- [ ] Analytics dashboard

### Phase 3 (Scale)
- [ ] CDN integration
- [ ] Multi-region deployment
- [ ] A/B testing framework
- [ ] Mobile apps

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Upload time (100MB) | <30s | ~15s |
| Queue latency | <10s | ~5s |
| Processing time (3min video) | <2min | ~90s |
| API response time | <500ms | ~200ms |
| Concurrent users | 100+ | TBD |
| Uptime | 99.9% | TBD |

---

**Architecture Version:** 1.0  
**Last Updated:** December 2025  
**Author:** GT




