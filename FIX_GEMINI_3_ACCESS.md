# Fix Gemini 3 Flash API Access

## The Issue
Gemini 3 Flash Preview shows in Model Garden but returns 404 via API. This is because it may require:
1. Provisioned throughput (paid capacity)
2. OR on-demand access needs to be explicitly enabled

## Solution: Use Google AI Studio API (Faster Alternative)

Since Vertex AI requires provisioned throughput for Gemini 3, the FASTEST way to access it is through **Google AI Studio** which has immediate API access.

### Step 1: Get API Key from AI Studio

1. Go to: https://aistudio.google.com/app/apikey

2. Click "Create API Key"

3. Select your project: **rewrite-captions** (or create in new project)

4. Copy the API key

### Step 2: We'll Switch Backend to Use Gemini API

The Google Generative AI SDK works the same but uses AI Studio's API which has immediate access to Gemini 3.

---

## Alternative: Enable On-Demand Access (If Available)

1. **Click "Open in Vertex AI Studio"** from the Model Garden page

2. In Vertex AI Studio, look for **"Enable on-demand"** or similar option

3. If available, enable it - this gives you pay-per-use access without provisioning

---

## Alternative: Provision Throughput (For Production)

If you want to use Vertex AI:

1. Click **"Place order"** button on the Model Garden page

2. Select:
   - Model: gemini-3-flash-preview
   - Location: us-central1
   - Provisioned tokens/sec: Minimum (start small)

3. This reserves capacity but costs money even when not in use

**NOT recommended for testing/development**

---

## Best Option: Use AI Studio API

This is the recommended approach for now:
- ✅ Immediate access to Gemini 3
- ✅ No provisioning needed
- ✅ Pay per use
- ✅ Same features
- ✅ Can switch to Vertex AI later

I can modify the backend to use this approach if you want!



