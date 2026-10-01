# Google Drive Integration Guide

## Setting Up a Google Service Account (Free)

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name it (e.g., "LongQuiz OMR") and click **Create**

### Step 2: Enable the Google Drive API
1. In your project, go to **APIs & Services** → **Library**
2. Search for **"Google Drive API"**
3. Click **Enable**

### Step 3: Create a Service Account
1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"Service Account"**
3. Name it (e.g., "longquiz-drive")
4. Click **Create and Continue** → **Done**

### Step 4: Download the Service Account Key
1. Click on the created service account
2. Go to **Keys** tab → **Add Key** → **Create new key**
3. Select **JSON** → **Create**
4. Save the downloaded file as `service_account.json` in the `backend/` directory

### Step 5: Create a Google Drive Folder
1. Open [Google Drive](https://drive.google.com/)
2. Create a new folder (e.g., "LongQuiz Scans")
3. Right-click the folder → **Share**
4. Share with the service account email (found in `service_account.json` under `client_email`)
5. Give **Editor** access
6. Copy the folder ID from the URL: `https://drive.google.com/drive/folders/<FOLDER_ID>`

### Step 6: Configure Environment Variables
Add to your `backend/.env` file:
```
GDRIVE_FOLDER_ID=<your-folder-id>
GDRIVE_SERVICE_ACCOUNT_FILE=service_account.json
```

## Storage Limits
- Google Drive free tier: **15 GB**
- Average scanned sheet (JPEG): ~200-500 KB
- Estimated capacity: **30,000-75,000 scanned sheets**

## Troubleshooting
- **403 Forbidden**: Ensure the folder is shared with the service account email
- **File not found**: Verify the `GDRIVE_FOLDER_ID` matches the folder URL
- **Auth errors**: Check that the service account JSON file is valid and in the correct path
