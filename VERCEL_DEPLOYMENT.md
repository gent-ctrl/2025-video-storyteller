# Deploy to Vercel - Complete Guide

This guide will help you deploy the full AI Video Storyteller app (frontend + backend) to Vercel.

## 🎯 What You'll Get

- **Frontend**: React app with drag & drop video upload
- **Backend**: Serverless API routes for video processing with Gemini 3 Flash
- **Single URL**: Everything runs on one Vercel domain
- **Automatic Deployments**: Push to GitHub = automatic updates

---

## 📋 Prerequisites

1. **GitHub Account**: https://github.com
2. **Vercel Account**: https://vercel.com (sign up with GitHub)
3. **Google AI API Key**: Your existing key `AIzaSyCUigDVrKZ6kLfGK6cdaL5CoDMhF1-Ard4`

---

## 🚀 Step-by-Step Deployment

### Step 1: Push to GitHub

1. Open PowerShell and navigate to the project:
   ```powershell
   cd "D:\PW Dropbox\tik tek\AI Stuff\Video Generation\gt-video-storyteller"
   ```

2. Check if Git is initialized:
   ```powershell
   git status
   ```

3. If not a Git repo yet, initialize it:
   ```powershell
   git init
   git add .
   git commit -m "Initial commit - Vercel ready"
   ```

4. Connect to your GitHub repository:
   ```powershell
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
   git branch -M main
   git push -u origin main
   ```

   **Example (if using existing repo)**:
   ```powershell
   git remote set-url origin https://github.com/gent-ctrl/video-storyteller-backend.git
   git add .
   git commit -m "Convert to Vercel serverless deployment"
   git push
   ```

---

### Step 2: Import Project to Vercel

1. Go to: https://vercel.com/new

2. Click **"Import Git Repository"**

3. Select your GitHub repository:
   - If you don't see it, click "Adjust GitHub App Permissions"
   - Give Vercel access to your repository

4. **Configure Project**:
   - **Framework Preset**: Leave as "Other" or "Vite"
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: Will use the one from `vercel.json`
   - **Output Directory**: Will use `frontend/dist` from `vercel.json`

5. Click **"Deploy"** (don't worry about environment variables yet)

---

### Step 3: Add Environment Variables (API Key)

⚠️ **IMPORTANT**: Your API key must be added after the first deployment.

1. After deployment, go to your project dashboard

2. Click on **"Settings"** tab

3. Click on **"Environment Variables"** in the sidebar

4. Add the following variable:
   ```
   Name:  GOOGLE_AI_API_KEY
   Value: AIzaSyCUigDVrKZ6kLfGK6cdaL5CoDMhF1-Ard4
   ```

5. Select environments:
   - ✅ **Production**
   - ✅ **Preview** (optional)
   - ✅ **Development** (optional)

6. Click **"Save"**

---

### Step 4: Redeploy with API Key

1. Go to the **"Deployments"** tab

2. Click on the latest deployment

3. Click the **"⋯"** (three dots) menu

4. Click **"Redeploy"**

5. Wait ~2-3 minutes for the build to complete

---

## ✅ Verify Deployment

Once deployed, you'll get a URL like: `https://your-project-name.vercel.app`

### Test the App:

1. Open the URL in your browser
2. Upload a video (drag & drop or click to browse)
3. Wait for the AI to generate a story
4. Check that:
   - ✅ Video uploads successfully
   - ✅ Story generates with contextual dates (2016-2026)
   - ✅ Copy button works
   - ✅ Batch uploads work

### Check API Health:

Visit: `https://your-project-name.vercel.app/api/stats`

You should see:
```json
{
  "totalJobs": 0,
  "mode": "Google AI Studio API (Vercel Serverless)"
}
```

---

## 🔄 Automatic Updates

Every time you push to GitHub, Vercel will automatically:
1. Detect the changes
2. Build the new version
3. Deploy it (takes ~2-3 minutes)
4. Update your live site

### To Update:

```powershell
cd "D:\PW Dropbox\tik tek\AI Stuff\Video Generation\gt-video-storyteller"
git add .
git commit -m "Your update message"
git push
```

That's it! Vercel handles the rest.

---

## 📊 Project Structure (Vercel)

```
gt-video-storyteller/
├── api/                    # Backend serverless functions
│   ├── upload.js          # Video upload & processing
│   ├── stats.js           # Stats endpoint
│   └── job/
│       └── [jobId].js     # Job status endpoint
├── frontend/              # React app
│   ├── src/
│   │   └── App.tsx       # Main app (API_BASE_URL = '/api')
│   └── dist/             # Built files (auto-generated)
├── vercel.json           # Vercel configuration
└── package.json          # API dependencies
```

---

## 🎨 Custom Domain (Optional)

1. Go to your project dashboard
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain
4. Follow Vercel's DNS instructions

---

## 🐛 Troubleshooting

### Issue: "API Key Not Working"

**Solution**: Make sure you added `GOOGLE_AI_API_KEY` in Vercel Settings → Environment Variables, then redeploy.

### Issue: "Build Failed"

**Solution**: Check the build logs in Vercel dashboard. Common fixes:
- Make sure all files are committed to Git
- Check that `frontend/package.json` has all dependencies
- Verify `vercel.json` is at the root

### Issue: "Video Upload Fails"

**Solution**: 
- Check Vercel function logs (Dashboard → Functions)
- Verify API key is set correctly
- Try a smaller video first (<50MB)

### Issue: "404 on API Routes"

**Solution**: Make sure:
- `vercel.json` has the correct rewrites
- API files are in `/api` folder (not `/backend/api`)
- You redeployed after adding API files

---

## 💰 Vercel Pricing

**Hobby Plan** (Free):
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Serverless functions
- ⏱️ 10-second function timeout

**Pro Plan** ($20/month):
- Everything in Hobby
- ⏱️ 60-second function timeout (better for large videos)
- More bandwidth

**Note**: The 300-second `maxDuration` in `vercel.json` only works on Pro plan. Free tier is limited to 10 seconds per function call.

---

## 🎉 You're Done!

Your app is now live on Vercel! Share your URL and enjoy automatic deployments every time you push to GitHub.

**Questions?** Check the Vercel docs: https://vercel.com/docs
