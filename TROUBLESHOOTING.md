# Troubleshooting: CONSUMER_INVALID Error

## The Problem
Error: `"reason":"CONSUMER_INVALID"` means your project `rowrite-captions` is not registered as a valid consumer of the Vertex AI API.

## Solution Steps

### Step 1: Enable Vertex AI API Properly

1. **Go to Vertex AI API page:**
   - URL: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=rowrite-captions

2. **Click "ENABLE"** (if it shows Enable)
   - If it says "MANAGE" or "API Enabled", it's already enabled

3. **Wait 2-3 minutes** for the API to fully activate

### Step 2: Verify Billing

1. **Go to Billing:**
   - URL: https://console.cloud.google.com/billing/linkedaccount?project=rowrite-captions

2. **Confirm:**
   - ✅ A billing account is linked
   - ✅ The billing account is ACTIVE (not suspended)
   - ✅ Payment method is valid

3. **If no billing account is linked:**
   - Click "Link a billing account"
   - Select your billing account
   - Confirm

### Step 3: Check API Enablement Status

1. **Go to APIs & Services → Dashboard:**
   - URL: https://console.cloud.google.com/apis/dashboard?project=rowrite-captions

2. **Look for:**
   - "Vertex AI API" or "Cloud AI Platform API"
   - Should show as "Enabled"

3. **If not listed:**
   - The API isn't enabled. Go back to Step 1.

### Step 4: Verify in Cloud Shell (Alternative)

Open Cloud Shell and run:

```bash
# Set project
gcloud config set project rowrite-captions

# Check if API is enabled
gcloud services list --enabled | grep aiplatform

# If not shown, enable it:
gcloud services enable aiplatform.googleapis.com

# Verify billing is linked
gcloud beta billing projects describe rowrite-captions
```

Look for: `billingEnabled: true`

### Step 5: Common Issues

**Issue:** API was just enabled
- **Solution:** Wait 5-10 minutes for full activation

**Issue:** Billing account suspended
- **Solution:** Check billing.google.com and resolve any payment issues

**Issue:** Organization policy blocking API
- **Solution:** Contact your organization admin

**Issue:** Wrong project selected
- **Solution:** Verify you're in project `rowrite-captions`

## After Fixing

1. Wait 2-5 minutes
2. Restart the backend: Stop and start the terminal
3. Try uploading again

## Still Not Working?

Run this test to see the exact error:

```bash
gcloud ai models list --region=us-central1 --project=rowrite-captions
```

If this fails, the API isn't properly enabled or billing has an issue.



