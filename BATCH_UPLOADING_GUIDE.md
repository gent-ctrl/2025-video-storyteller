# Batch Uploading Guide - GT Video Storyteller

## How Batch Uploading Works

Your app **already supports batch uploading**! Here's how it works:

### Current Implementation

#### 1. **Frontend (What Users See)**
- Users can **drag & drop or select up to 10 videos** at once
- Each video shows individual status: Pending → Uploading → Processing → Completed
- Progress is tracked separately for each video
- Stories appear as each video completes

#### 2. **Backend Processing**
- All videos **upload to the backend simultaneously**
- Videos are then **processed sequentially** (one at a time)
- Each video gets its own job entry
- Processing happens in the background while the API responds immediately

#### 3. **Real-Time Updates**
- Frontend **polls every 3 seconds** for updates
- Each video's status updates independently
- Users see live progress for all videos

---

## Current Architecture

```
User Uploads 5 Videos
        ↓
Frontend: Upload all at once
        ↓
Backend: Receives all 5 videos
        ↓
Backend: Returns immediately with job ID
        ↓
Background: Process videos one by one
        ↓
        Video 1 → Gemini 3 Pro → Story 1
        Video 2 → Gemini 3 Pro → Story 2
        Video 3 → Gemini 3 Pro → Story 3
        ...
        ↓
Frontend: Polls and updates UI as each completes
```

---

## Limitations & Improvements

### Current Limitations

1. **Sequential Processing**: Videos process one at a time
   - **Why:** Keeps costs predictable, easier to debug
   - **Impact:** 5 videos × 2 min each = 10 minutes total

2. **No Queue System** (simple mode):
   - Jobs are processed in-memory
   - If server restarts, in-progress jobs are lost
   - Works fine for single-user/testing

3. **Max 10 Videos**: Frontend limits uploads to 10 videos per batch

---

## Improvement Options

### Option 1: Parallel Processing (Already Possible!)

The backend **already supports concurrent processing** - just need to enable it in production:

**For Production (with Redis queue):**
```bash
# In backend/.env
MAX_CONCURRENT_JOBS=3  # Process 3 videos simultaneously
```

This would reduce processing time significantly:
- 5 videos @ 3 concurrent = ~4 minutes (instead of 10)

**Trade-offs:**
- ✅ **Faster** for users
- ❌ **Higher costs** (more API calls at once)
- ❌ **More load** on your infrastructure

### Option 2: Priority Queue

Add priority levels for different users:
```javascript
// VIP users
priority: 'high'  // Processed first

// Regular users
priority: 'normal'  // Standard queue

// Bulk uploads
priority: 'low'  // Process when idle
```

### Option 3: Notification System

Instead of polling, send notifications:
- **Email:** Send email when all videos complete
- **Webhook:** Call user's URL when done
- **WebSocket:** Real-time push updates

### Option 4: Increase Batch Size

Currently limited to 10 videos. You could:
- Increase to 50 or 100 videos
- Add chunking (process in batches of 10)
- Implement resume functionality if batch fails

---

## Recommended Setup by Scale

### Small Scale (1-50 videos/day)
**Current setup is perfect!**
- ✅ Sequential processing (1 at a time)
- ✅ Polling every 3 seconds
- ✅ Simple, cost-effective

### Medium Scale (50-500 videos/day)
**Deploy with Redis + increase concurrency:**
```env
MAX_CONCURRENT_JOBS=5
```
- ✅ Process 5 videos simultaneously
- ✅ Redis queue for reliability
- ✅ Deploy to Cloud Run with autoscaling

### Large Scale (500+ videos/day)
**Full production setup:**
- **Concurrent Processing:** 10-20 jobs
- **Multiple Workers:** Scale horizontally
- **Cloud Tasks:** For job distribution
- **Pub/Sub:** For real-time notifications
- **Database:** PostgreSQL for job persistence

---

## How to Enable Parallel Processing

If you want to process multiple videos at once:

### 1. **Deploy with Redis** (production setup)

Use the full `server.js` instead of `server-gemini3.js`:

```bash
# Start Redis (or use Cloud Memorystore)
redis-server

# Update backend to use Redis queue
cd backend
npm run dev  # Uses server.js with Bull queue
```

### 2. **Configure Concurrency**

In your `.env`:
```env
MAX_CONCURRENT_JOBS=3  # Process 3 videos at once
```

### 3. **Deploy to Cloud Run**

Cloud Run will auto-scale based on load:
```bash
gcloud run deploy --max-instances 10
```

---

## User Experience Comparison

### Sequential (Current - Simple Mode)
```
Upload 5 videos → 2+4+2+3+2 = 13 minutes total
User sees: Video 1 complete → Video 2 complete → ...
```

### Parallel (3 concurrent)
```
Upload 5 videos → (2,4,2) in parallel, then (3,2) = ~6 minutes
User sees: Videos 1,2,3 complete together → Videos 4,5 complete
```

### Parallel (5 concurrent)
```
Upload 5 videos → All process together = ~4 minutes
User sees: All videos complete at roughly the same time
```

---

## Cost Implications

### Gemini 3 Pro Pricing: $2 per 1M input tokens

**Example: 10 videos @ 3 min each**

Sequential (13 min):
- API calls: 10 videos × $0.30 = **$3.00**
- Time: 13 minutes

Parallel (3 concurrent, 6 min):
- API calls: 10 videos × $0.30 = **$3.00** (same!)
- Time: 6 minutes

**Conclusion:** Parallel processing is **faster with same cost** - the only difference is infrastructure load.

---

## What You Have Now

✅ **Batch upload UI** (up to 10 videos)
✅ **Individual progress tracking**
✅ **Sequential processing** (reliable, simple)
✅ **Real-time polling** (updates every 3s)
✅ **Copy button** for easy story sharing
✅ **Error handling** per video
✅ **Works perfectly** for testing and low-volume use

---

## Recommendations

### For Now (Testing/Low Volume):
**Keep current setup** - it's perfect!
- Simple
- Reliable
- Cost-effective
- Easy to debug

### When You Scale (100+ videos/day):
1. Deploy with Redis queue
2. Set `MAX_CONCURRENT_JOBS=5`
3. Deploy to Cloud Run with autoscaling
4. Add database for job persistence

### Future Enhancements:
- Add "Download All Stories" button
- Email notification when batch completes
- Admin dashboard to monitor queue
- Resume failed videos
- Batch export to PDF/Word

---

## Quick Test

Try it now:
1. Go to http://localhost:5173
2. **Upload 3-5 videos at once**
3. Watch them process sequentially
4. See individual progress for each
5. Copy stories as they complete!

Your batch system is already working! 🎉



