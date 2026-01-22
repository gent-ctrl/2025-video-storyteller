# How to Enable Gemini 3 Flash Preview API Access

## The Problem
You can see `gemini-3-flash-preview` in Vertex AI Studio UI, but your API calls return 404. This means the model needs to be explicitly enabled for API access in your project.

## Solution Steps

### Step 1: Enable the Model in Vertex AI Model Garden

1. **Go to Vertex AI Model Garden:**
   ```
   https://console.cloud.google.com/vertex-ai/publishers/google/model-garden?project=rewrite-captions
   ```

2. **Search for "Gemini 3"** in the search box

3. **Click on "Gemini 3 Flash"**

4. **Click "ENABLE" or "DEPLOY"** button

5. **Accept any terms** if prompted

6. **Wait 2-3 minutes** for activation

### Step 2: Check Generative AI Studio

1. **Go to Generative AI Studio:**
   ```
   https://console.cloud.google.com/vertex-ai/generative/language?project=rewrite-captions
   ```

2. **Click on the Model dropdown**

3. **Verify you can select `gemini-3-flash-preview`**

4. **Try sending a test prompt** in the UI to confirm it works

### Step 3: Verify API Access via Cloud Shell

Open Cloud Shell (top right in Google Cloud Console) and run:

```bash
# Set project
gcloud config set project rewrite-captions

# Test if you can access the model via API
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://us-central1-aiplatform.googleapis.com/v1/projects/rewrite-captions/locations/us-central1/publishers/google/models/gemini-3-flash-preview:generateContent \
  -d '{
    "contents": [{
      "role": "user",
      "parts": [{
        "text": "Hello, this is a test"
      }]
    }]
  }'
```

**If this works**, you'll see a JSON response with generated text.
**If it fails**, you'll see a 404 or permission error.

### Step 4: Request Access (If Needed)

If the model is still not accessible:

1. **Go to:**
   ```
   https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/overview
   ```

2. **Look for "Request Access" or "Join Allowlist"** links

3. **Fill out the form** explaining your use case:
   - Project: GT Video Storyteller
   - Use case: Video analysis and storytelling
   - Expected volume: Testing/Development

4. **Wait for approval** (usually 1-2 business days)

### Step 5: Alternative - Use Gemini API Directly

If Vertex AI API access is delayed, you can use the Gemini API instead:

1. **Go to:**
   ```
   https://aistudio.google.com/app/apikey
   ```

2. **Create API key** for your project

3. **Use the Gemini API SDK** instead of Vertex AI

**We would need to modify the backend code to use `@google/generative-ai` instead of `@google-cloud/vertexai`**

## Temporary Workaround

While waiting for API access, use `gemini-2.0-flash-exp` which is fully working and supports:
- ✅ Video processing (up to 45 min)
- ✅ All the same features
- ✅ Great quality
- ✅ Faster than Pro models

Once Gemini 3 Flash is enabled, we switch with 1 line of code!

---

## Quick Check Commands

Run these to verify status:

```bash
# Check enabled APIs
gcloud services list --enabled | grep aiplatform

# Check IAM permissions
gcloud projects get-iam-policy rewrite-captions | grep video-storyteller-sa

# List available models (if this works)
gcloud ai models list --region=us-central1
```



