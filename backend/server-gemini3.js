import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Google AI (Gemini 3 Pro)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// In-memory job storage
const jobs = new Map();

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const STORY_PROMPT = `Based on the video, create a news story that strictly follows the format and structure of the example below.

- Invent a plausible location and a date following these rules:
  * The year must be 2025
  * The month should match the video content:
    - Winter scenes (snow, ice, cold weather) → December, January, or February
    - Summer scenes (beach, heat, outdoor activities) → June, July, or August
    - Spring scenes (flowers, rain, mild weather) → March, April, or May
    - Fall scenes (autumn leaves, harvest) → September, October, or November
    - Indoor/neutral content → Any month is acceptable
  * Pick a realistic day for that month (1-28/29/30/31 depending on month)
- The title must be 45 characters or less and enclosed in double quotes.
- The main story (between the date and the final disclaimer) must have at least 3 paragraphs.
- The output must be a continuous stream.
- Use a single blank line to separate the title, date, each paragraph, and the final disclaimer.

**EXAMPLE:**

"Chain-Reaction Crash on Icy Hill Leaves Dozens Stranded"

Bozeman, Montana — January 15, 2019

A sheet of invisible black ice turned a quiet mountain roadway into a chaotic crash zone Thursday morning, as car after car slid helplessly down a steep hill, slamming into vehicles already wrecked at the bottom.

The viral video shows the terrifying sequence unfolding in real time: a red sedan loses control first, spinning sideways across the road. A white SUV approaches moments later, taps the brakes, and instantly begins sliding as if on glass, colliding violently with the stranded sedan. Within seconds, another crossover comes down the hill with zero traction, tires locked, skidding directly into the growing pileup.

Drivers exiting their vehicles can be seen slipping on the ice themselves, shouting warnings to oncoming traffic as more cars crest the hill unaware of the danger. Fortunately, authorities report that despite the dramatic footage, injuries were minor—thanks largely to the low speeds and quick response from nearby motorists who helped divert traffic.

Officials are urging drivers to stay off steep grades during freezing rain conditions, as black ice often forms without any visible indication and can render brakes and steering nearly useless.

This video is created using AI, and the story is for your entertainment.`;

// Process video with Gemini 3 Pro
async function processVideo(videoBuffer, mimeType, originalFilename) {
  console.log('🤖 Processing with Gemini 3 Pro...');
  
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
  
  // Convert buffer to base64
  const base64Video = videoBuffer.toString('base64');
  
  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Video,
        mimeType: mimeType,
      },
    },
    { text: STORY_PROMPT },
  ]);

  const response = await result.response;
  let storyText = response.text();
  
  // Remove quotation marks from the title (first line)
  const lines = storyText.split('\n');
  if (lines.length > 0 && lines[0].startsWith('"') && lines[0].endsWith('"')) {
    lines[0] = lines[0].slice(1, -1); // Remove first and last character (quotes)
    storyText = lines.join('\n');
  }
  
  return storyText;
}

// Upload endpoint
app.post('/api/upload', upload.array('videos', 10), async (req, res) => {
  try {
    console.log('📥 Upload request received');
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No video files provided' });
    }

    console.log(`📦 Processing ${req.files.length} file(s)`);
    const jobId = uuidv4();
    const uploadedVideos = [];

    // Create job
    const job = {
      id: jobId,
      status: 'processing',
      videos: [],
      createdAt: new Date().toISOString(),
    };
    jobs.set(jobId, job);

    // Respond immediately
    res.json({
      jobId,
      message: `${req.files.length} video(s) queued for processing`,
      videos: req.files.map(f => ({ 
        id: uuidv4(), 
        name: f.originalname, 
        status: 'pending' 
      })),
    });

    // Process videos in background
    (async () => {
      for (const file of req.files) {
        const videoId = uuidv4();
        const filename = `${jobId}/${videoId}-${file.originalname}`;
        
        const videoData = {
          id: videoId,
          originalName: file.originalname,
          status: 'uploading',
          createdAt: new Date().toISOString(),
        };
        job.videos.push(videoData);

        try {
          console.log(`⬆️  Uploading ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);
          
          console.log(`📦 Processing ${file.originalname}...`);
          
          videoData.status = 'processing';
          
          const story = await processVideo(file.buffer, file.mimetype, file.originalname);
          
          videoData.status = 'completed';
          videoData.story = story;
          videoData.completedAt = new Date().toISOString();
          
          console.log(`✨ Story generated for ${file.originalname}`);
          
        } catch (error) {
          console.error(`❌ Error processing ${file.originalname}:`, error.message);
          videoData.status = 'failed';
          videoData.error = error.message;
        }
      }
      
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      console.log(`🎉 Job ${jobId} completed!`);
    })();

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Stats
app.get('/api/stats', (req, res) => {
  res.json({
    totalJobs: jobs.size,
    mode: 'Google AI Studio API',
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GT Video Storyteller Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🤖 Model: Gemini 3 Pro Preview (via AI Studio API)`);
  console.log(`✨ Running with AI Studio API - Pay per use!`);
});

