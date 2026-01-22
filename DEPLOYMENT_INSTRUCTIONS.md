# Deployment Instructions for 2025 Video Storyteller

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `2025-video-storyteller`
3. Description: "AI Video Storyteller with all dates fixed to 2025"
4. Make it **Public**
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 2: Push Code to GitHub

After creating the repository, run these commands in PowerShell:

```powershell
cd "D:\PW Dropbox\tik tek\AI Stuff\Video Generation\2025-video-storyteller"
git remote add origin https://github.com/YOUR_USERNAME/2025-video-storyteller.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Step 3: Deploy Backend to Render

1. Go to https://dashboard.render.com/
2. Click "New +" → "Web Service"
3. Click "Connect a repository" (you may need to grant access to the new repo)
4. Select `2025-video-storyteller` repository
5. Configure the service:
   - **Name**: `2025-video-storyteller-backend`
   - **Region**: Choose closest to you
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server-gemini3.js`
   - **Instance Type**: Free (or paid if you prefer)
6. Add Environment Variables:
   - Click "Add Environment Variable"
   - `GOOGLE_AI_API_KEY` = (copy from your original backend)
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
7. Click "Create Web Service"
8. Wait for deployment to complete (~2-3 minutes)
9. **Copy the backend URL** (e.g., `https://2025-video-storyteller-backend.onrender.com`)

## Step 4: Update Frontend with Backend URL

**IMPORTANT**: If Render assigns a different URL than expected, you'll need to update the frontend:

1. Open `frontend/src/App.tsx`
2. Find line 69:
   ```typescript
   const API_BASE_URL = 'https://2025-video-storyteller-backend.onrender.com/api';
   ```
3. Update with your actual Render URL (add `/api` at the end)
4. Commit and push:
   ```powershell
   git add frontend/src/App.tsx
   git commit -m "Update API URL with actual Render backend URL"
   git push
   ```

## Step 5: Deploy Frontend to Netlify

1. Go to https://app.netlify.com/
2. Click "Add new site" → "Import an existing project"
3. Click "Deploy with GitHub"
4. Select `2025-video-storyteller` repository
5. Configure build settings (should auto-detect from `netlify.toml`):
   - **Base directory**: `frontend`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `frontend/dist`
6. Click "Deploy site"
7. Wait for deployment (~2-3 minutes)
8. Once deployed, click "Site settings" → "Change site name"
9. Enter: `2025-video-storyteller` (or closest available)
10. Your site will be at: `https://2025-video-storyteller.netlify.app`

## Step 6: Test the Application

Visit your Netlify URL and test:

1. **Winter video** → Should get December/January/February **2025**
2. **Summer video** → Should get June/July/August **2025**
3. **Neutral video** → Should get any month in **2025**
4. **Verify**: No dates outside of 2025 should appear

## Troubleshooting

### Backend Issues
- Check Render logs: Dashboard → Your service → Logs
- Verify environment variables are set correctly
- Make sure `GOOGLE_AI_API_KEY` is valid

### Frontend Issues
- Check Netlify deploy logs
- Verify API URL in `App.tsx` matches your Render backend
- Test backend directly: `https://YOUR-BACKEND.onrender.com/api/stats`

### CORS Issues
- Backend already has CORS enabled for all origins
- If issues persist, check Render logs for errors

## Summary

After completing these steps, you'll have:
- ✅ GitHub repo: `https://github.com/YOUR_USERNAME/2025-video-storyteller`
- ✅ Backend: `https://2025-video-storyteller-backend.onrender.com`
- ✅ Frontend: `https://2025-video-storyteller.netlify.app`
- ✅ All video stories dated in 2025 only

## Original App

Your original app remains unchanged at:
- Backend: `https://video-storyteller-backend.onrender.com`
- Frontend: `https://frabjous-praline-7144e9.netlify.app`
- Date range: 2016-2025
