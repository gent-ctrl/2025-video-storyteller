import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { Storage } from '@google-cloud/storage';
import { VertexAI } from '@google-cloud/vertexai';
import Queue from 'bull';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

// Initialize Vertex AI with Gemini 3 Pro
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID,
  location: process.env.GOOGLE_CLOUD_LOCATION,
});

// Initialize Redis Queue
const videoQueue = new Queue('video-processing', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

// In-memory job storage (use database in production)
const jobs = new Map();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (process.env.VIDEO_MAX_SIZE_MB || 500) * 1024 * 1024, // Default 500MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, WebM, and QuickTime are allowed.'));
    }
  },
});

// Prompt template
const STORY_PROMPT = `Based on the video, create a news story that strictly follows the format and structure of the example below.

- Invent a plausible location and a date no later than November 2025.
- The title must be 45 characters or less and enclosed in double quotes.
- The main story (between the date and the final disclaimer) must have at least 3 paragraphs.
- The output must be a continuous stream.
- Use a single blank line to separate the title, date, each paragraph, and the final disclaimer.

**EXAMPLE:**

"Chain-Reaction Crash on Icy Hill Leaves Dozens Stranded"

Bozeman, Montana — December 4, 2025

A sheet of invisible black ice turned a quiet mountain roadway into a chaotic crash zone Thursday morning, as car after car slid helplessly down a steep hill, slamming into vehicles already wrecked at the bottom.

The viral video shows the terrifying sequence unfolding in real time: a red sedan loses control first, spinning sideways across the road. A white SUV approaches moments later, taps the brakes, and instantly begins sliding as if on glass, colliding violently with the stranded sedan. Within seconds, another crossover comes down the hill with zero traction, tires locked, skidding directly into the growing pileup.

Drivers exiting their vehicles can be seen slipping on the ice themselves, shouting warnings to oncoming traffic as more cars crest the hill unaware of the danger. Fortunately, authorities report that despite the dramatic footage, injuries were minor—thanks largely to the low speeds and quick response from nearby motorists who helped divert traffic.

Officials are urging drivers to stay off steep grades during freezing rain conditions, as black ice often forms without any visible indication and can render brakes and steering nearly useless.

This video is created using AI, and the story is for your entertainment.`;

// Process video with Gemini 3 Pro
async function processVideoWithGemini(gcsUri, mimeType) {
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-3-pro',
  });

  const filePart = {
    fileData: {
      fileUri: gcsUri,
      mimeType: mimeType,
    },
  };

  const textPart = {
    text: STORY_PROMPT,
  };

  const request = {
    contents: [{ role: 'user', parts: [filePart, textPart] }],
  };

  const response = await model.generateContent(request);
  return response.response.candidates[0].content.parts[0].text;
}

// Queue processor
videoQueue.process(process.env.MAX_CONCURRENT_JOBS || 5, async (job) => {
  const { jobId, videoId, gcsUri, mimeType } = job.data;

  try {
    // Update job status
    jobs.get(jobId).videos.find(v => v.id === videoId).status = 'processing';
    job.progress(10);

    // Process video with Gemini 3 Pro
    const story = await processVideoWithGemini(gcsUri, mimeType);
    job.progress(90);

    // Update job with result
    const video = jobs.get(jobId).videos.find(v => v.id === videoId);
    video.status = 'completed';
    video.story = story;
    video.completedAt = new Date().toISOString();
    job.progress(100);

    // Check if all videos in batch are complete
    const allVideos = jobs.get(jobId).videos;
    const allComplete = allVideos.every(v => v.status === 'completed' || v.status === 'failed');
    if (allComplete) {
      jobs.get(jobId).status = 'completed';
      jobs.get(jobId).completedAt = new Date().toISOString();
    }

    return { success: true, story };
  } catch (error) {
    console.error(`Error processing video ${videoId}:`, error);
    
    const video = jobs.get(jobId).videos.find(v => v.id === videoId);
    video.status = 'failed';
    video.error = error.message;
    
    throw error;
  }
});

// API Routes

// Upload videos (batch)
app.post('/api/upload', upload.array('videos', 10), async (req, res) => {
  try {
    console.log('📥 Upload request received');
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No video files provided' });
    }

    console.log(`📦 Uploading ${req.files.length} file(s)`);
    const jobId = uuidv4();
    const uploadedVideos = [];

    // Upload all videos to Cloud Storage
    for (const file of req.files) {
      console.log(`⬆️  Uploading ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);
      const videoId = uuidv4();
      const filename = `${jobId}/${videoId}-${file.originalname}`;
      const blob = bucket.file(filename);

      const startTime = Date.now();
      await blob.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
        resumable: false, // Faster for small files
      });
      const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Uploaded ${file.originalname} in ${uploadTime}s`);

      const gcsUri = `gs://${process.env.GCS_BUCKET_NAME}/${filename}`;

      uploadedVideos.push({
        id: videoId,
        originalName: file.originalname,
        gcsUri,
        mimeType: file.mimetype,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      // Add to queue
      await videoQueue.add({
        jobId,
        videoId,
        gcsUri,
        mimeType: file.mimetype,
      });
    }

    // Store job info
    const job = {
      id: jobId,
      status: 'processing',
      videos: uploadedVideos,
      createdAt: new Date().toISOString(),
    };
    jobs.set(jobId, job);

    res.json({
      jobId,
      message: `${uploadedVideos.length} video(s) uploaded and queued for processing`,
      videos: uploadedVideos.map(v => ({ id: v.id, name: v.originalName, status: v.status })),
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get job status
app.get('/api/job/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

// Get specific video result
app.get('/api/job/:jobId/video/:videoId', (req, res) => {
  const { jobId, videoId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const video = job.videos.find(v => v.id === videoId);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  res.json(video);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Queue statistics
app.get('/api/stats', async (req, res) => {
  const waiting = await videoQueue.getWaitingCount();
  const active = await videoQueue.getActiveCount();
  const completed = await videoQueue.getCompletedCount();
  const failed = await videoQueue.getFailedCount();

  res.json({
    queue: { waiting, active, completed, failed },
    totalJobs: jobs.size,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GT Video Storyteller Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`☁️  Project: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
  console.log(`🤖 Model: Gemini 3 Pro`);
});

