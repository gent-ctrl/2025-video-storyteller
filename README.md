# 2025 Video Storyteller

AI-powered video storytelling application that generates news stories from video content with **all dates set to 2025**.

## Features

- Upload up to 10 videos for batch processing
- AI-generated news stories using Google's Gemini 3 Pro
- Smart seasonal date matching (winter videos → winter months, etc.)
- **All dates fixed to 2025** for consistent temporal context
- Real-time processing status updates
- Beautiful, responsive UI built with React and Tailwind CSS

## Date Assignment

Unlike the original version that uses dates from 2016-2025, this version assigns **only 2025 dates** to all stories:

- **Winter videos** (snow, ice, cold) → December, January, or February 2025
- **Summer videos** (beach, heat, outdoor) → June, July, or August 2025
- **Spring videos** (flowers, rain, mild) → March, April, or May 2025
- **Fall videos** (autumn leaves, harvest) → September, October, or November 2025
- **Neutral/indoor videos** → Any month in 2025

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Deployed on Netlify

### Backend
- Node.js with Express
- Google Gemini 3 Pro AI model
- Video processing with multer
- Deployed on Render

## Deployment

- **Frontend**: Netlify
- **Backend**: Render
- **Repository**: GitHub

## Environment Variables

Backend requires:
- `GOOGLE_AI_API_KEY` - Your Google AI API key for Gemini 3 Pro
- `NODE_ENV` - Set to `production`
- `PORT` - Port number (default: 3000)

## Quick Start

### Backend
```bash
cd backend
npm install
npm run dev:gemini3
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Related

This is a specialized version of the AI Video Storyteller. See the [original repository](https://github.com/gent-ctrl/video-storyteller-backend) for the version with 2016-2025 date range.

## License

MIT
