# Fix Vertex AI Permissions

## The Problem
Your service account `video-storyteller-sa@rowrite-captions.iam.gserviceaccount.com` needs additional permissions to use Vertex AI.

## Solution: Run These Commands

Open **Google Cloud Shell** (top right in Google Cloud Console) and run:

```bash
# Set your project
gcloud config set project rowrite-captions

# Grant Vertex AI User role to your service account
gcloud projects add-iam-policy-binding rowrite-captions \
    --member="serviceAccount:video-storyteller-sa@rowrite-captions.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Also grant Service Account User role (sometimes needed)
gcloud projects add-iam-policy-binding rowrite-captions \
    --member="serviceAccount:video-storyteller-sa@rowrite-captions.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

# Verify the API is enabled
gcloud services enable aiplatform.googleapis.com

# Check if billing is enabled (IMPORTANT!)
gcloud beta billing projects describe rowrite-captions
```

## Alternative: Use GUI

### In Google Cloud Console:

1. **Go to IAM & Admin → IAM**
   - URL: https://console.cloud.google.com/iam-admin/iam?project=rowrite-captions

2. **Find your service account:**
   - `video-storyteller-sa@rowrite-captions.iam.gserviceaccount.com`

3. **Click the pencil/edit icon**

4. **Add these roles:**
   - ✅ Vertex AI User
   - ✅ Service Account User (if not already there)

5. **Click SAVE**

## Check Billing (CRITICAL!)

Vertex AI requires **active billing**. 

1. Go to: https://console.cloud.google.com/billing
2. Make sure your project `rowrite-captions` has a billing account linked
3. If not, link a billing account

## Test After Fixing

After running the commands above, wait 1-2 minutes, then try uploading a video again in the app.

---

**Most Common Issue:** Billing not enabled on the project. Vertex AI won't work without it!



