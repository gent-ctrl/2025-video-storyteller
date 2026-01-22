import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// In-memory job storage (shared across functions via module scope)
global.jobs = global.jobs || new Map();

const STORY_PROMPT = `Based on the video, create a news story that strictly follows the format and structure of the example below.

- Invent a plausible location and a date following these rules:
  * The year must be randomly selected between 2016 and 2026
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

// Process video with Gemini
async function processVideo(videoBuffer, mimeType) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
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
  
  // Remove quotation marks from title
  const lines = storyText.split('\n');
  if (lines.length > 0 && lines[0].startsWith('"') && lines[0].endsWith('"')) {
    lines[0] = lines[0].slice(1, -1);
    storyText = lines.join('\n');
  }
  
  return storyText;
}

// Configure multer for serverless
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Helper to run multer in serverless
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Run multer middleware
    await runMiddleware(req, res, upload.array('videos', 10));

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No video files provided' });
    }

    const jobId = uuidv4();
    const job = {
      id: jobId,
      status: 'processing',
      videos: [],
      createdAt: new Date().toISOString(),
    };
    global.jobs.set(jobId, job);

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
        const videoData = {
          id: videoId,
          originalName: file.originalname,
          status: 'processing',
          createdAt: new Date().toISOString(),
        };
        job.videos.push(videoData);

        try {
          const story = await processVideo(file.buffer, file.mimetype);
          videoData.status = 'completed';
          videoData.story = story;
          videoData.completedAt = new Date().toISOString();
        } catch (error) {
          console.error(`Error processing ${file.originalname}:`, error.message);
          videoData.status = 'failed';
          videoData.error = error.message;
        }
      }
      
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
    })();

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
}

export const config = {
  api: {
    bodyParser: false, // Disable body parsing, multer will handle it
    responseLimit: false,
  },
};
