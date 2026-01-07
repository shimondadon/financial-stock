# Deploy to Free Server (No Git Required)

## Option 1: Render.com (Recommended - Easy ZIP Upload)

### Steps:

1. **Prepare the deployment package:**
   - Create a ZIP file of your project folder
   - Include: `server.js`, `alphavantage_enhanced.js`, `index.html`, `package.json`, `.gitignore`
   - Exclude: `node_modules`, `cache`, `.idea`

2. **Sign up and deploy:**
   - Go to: https://render.com
   - Sign up for a free account (no credit card required)
   - Click "New +" → "Web Service"
   - Choose "Deploy from ZIP"
   - Upload your ZIP file
   - Configure:
     - **Name**: alphavantage-financial
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Free
   - Click "Create Web Service"

3. **Access your app:**
   - URL will be: `https://alphavantage-financial.onrender.com`
   - Wait 2-3 minutes for first deployment

### Notes:
- Free tier spins down after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- 750 hours/month free (enough for constant usage)

---

## Option 2: Railway.app (Very Easy)

### Steps:

1. **Sign up:**
   - Go to: https://railway.app
   - Sign up with email (no credit card for $5 free credit)

2. **Deploy:**
   - Click "New Project" → "Deploy from Local"
   - Use Railway CLI OR use their web interface:
     - Install Railway CLI: `npm install -g @railway/cli`
     - In your project folder: `railway login`
     - Then: `railway init`
     - Then: `railway up`
   
   **OR use their GitHub-free option:**
   - Create project → "Empty Project"
   - Add "Variables" in settings:
     - `PORT` will be auto-set
   - Use Railway's file upload feature

3. **Access your app:**
   - Railway will provide a public URL
   - Example: `https://alphavantage-financial-production.up.railway.app`

### Notes:
- $5 free credit per month
- No sleep/wake delay
- Better performance than Render free tier

---

## Option 3: Glitch.com (Easiest - Browser-Based)

### Steps:

1. **Sign up:**
   - Go to: https://glitch.com
   - Sign up with email

2. **Create project:**
   - Click "New Project" → "hello-express"
   - Delete the default files

3. **Upload your files:**
   - Click "Tools" → "Import/Export" → "Import from GitHub"
   - OR manually upload each file:
     - Click on file name to edit
     - Copy/paste content from your files
     - Upload: `package.json`, `server.js`, `alphavantage_enhanced.js`, `index.html`

4. **Configure:**
   - Glitch auto-detects Node.js and runs `npm start`
   - Your app will be live immediately

5. **Access your app:**
   - URL: `https://your-project-name.glitch.me`

### Notes:
- Always online (no sleep for active projects)
- Very easy file management
- Can edit code directly in browser
- 4000 requests/hour limit

---

## Option 4: Cyclic.sh (ZIP Upload)

### Steps:

1. **Sign up:**
   - Go to: https://www.cyclic.sh
   - Sign up with email

2. **Deploy:**
   - Click "Deploy" → "Upload Files"
   - Upload your ZIP file (or drag & drop files)
   - Cyclic will auto-detect Node.js

3. **Access your app:**
   - URL: `https://your-app-name.cyclic.app`

### Notes:
- 100% uptime (no cold starts)
- Very generous free tier
- Easy deployment

---

## Quick ZIP Package Creation

### What to include in your ZIP:
```
alphavantage-enhanced/
├── server.js
├── alphavantage_enhanced.js
├── index.html
├── package.json
├── README.md
└── .gitignore
```

### What to EXCLUDE:
- `node_modules/` (will be installed on server)
- `cache/` (will be created on server)
- `.idea/` (IDE files)
- `package-lock.json` (optional)

### Windows PowerShell Command to Create ZIP:
```powershell
Compress-Archive -Path .\server.js, .\alphavantage_enhanced.js, .\index.html, .\package.json, .\README.md, .\.gitignore -DestinationPath alphavantage-deployment.zip -Force
```

---

## Environment Variables (if needed)

Most platforms will auto-set `PORT`, but if you need to configure:

- **Render.com**: Add in "Environment" tab
- **Railway.app**: Add in "Variables" section
- **Glitch.com**: Create `.env` file
- **Cyclic.sh**: Add in "Variables" section

---

## Troubleshooting

### App not starting:
- Check logs on the platform
- Ensure `package.json` has correct start script
- Verify Node version (needs >=18.0.0)

### Cache directory issues:
- The app creates `cache/` automatically
- No manual setup needed
- Platforms provide persistent storage

### API Key:
- Your API key is in the code (okay for free tier)
- For production, use environment variables

---

## Recommendation

**For easiest deployment: Use Render.com**
1. Create ZIP file
2. Upload to Render
3. Done in 5 minutes!

**For best performance: Use Railway.app**
- No cold starts
- Faster response times
- Better free tier limits

**For quickest test: Use Glitch.com**
- Live in 2 minutes
- Edit code in browser
- Perfect for demos

