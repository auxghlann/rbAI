# 🖱️ Heroku Deployment Guide (Web Dashboard)

Complete guide for deploying rbAI to Heroku using the **Web Dashboard** (No CLI Required!)

**Perfect for**: Users who prefer GUI over command line, GitHub Student Pack users with $13/month credit.

---

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Cost Breakdown](#cost-breakdown)
- [Deployment Steps](#deployment-steps)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Heroku (Main Application)                          │
│                                                     │
│  ├─ Web Dyno: Backend (FastAPI)                    │
│  ├─ Web Dyno: Frontend (React + Nginx)             │
│  └─ Heroku Postgres (Database)                     │
│                                                     │
└────────────────────┬────────────────────────────────┘
                     │
                     │ HTTPS/HTTP
                     │ (API calls with auth)
                     ↓
┌─────────────────────────────────────────────────────┐
│  DigitalOcean Droplet (Execution Service)           │
│  - Code Execution Microservice                      │
│  - Docker-based isolation                           │
└─────────────────────────────────────────────────────┘
```
---

## 🚀 Deployment Steps

### Step 1: Create Backend App

1. **Go to Heroku Dashboard**
   - Visit [dashboard.heroku.com](https://dashboard.heroku.com/)
   - Click **"New"** → **"Create new app"** (top right)

2. **Configure Backend App**
   - **App name**: `rbai-server` (or your unique name)
   - **Region**: Choose **United States** or **Europe**
   - Click **"Create app"**

3. **You're now on the app dashboard!** Bookmark this page.

---

### Step 2: Add PostgreSQL Database

1. **Go to Resources Tab**
   - In your `rbai-server` app dashboard
   - Click **"Resources"** tab

2. **Add Postgres Addon**
   - In "Add-ons" search box, type: `postgres`
   - Select **"Heroku Postgres"**
   - Choose plan: **"Mini"** ($5/month - covered by credit)
     - Or **"Hobby Dev"** (Free, but limited to 10k rows)
   - Click **"Submit Order Form"**

3. **Verify Database Added**
   - You should see "Heroku Postgres" in Resources tab
   - Click on it to view database details

---

### Step 3: Connect Backend to GitHub

1. **Go to Deploy Tab**
   - Click **"Deploy"** tab in your backend app

2. **Choose Deployment Method**
   - Click **"GitHub"** (Connect to GitHub)
   - If first time: Click **"Connect to GitHub"** and authorize Heroku

3. **Search for Repository**
   - In "Search for a repository to connect to"
   - Enter: `rbAI` or `auxghlann/rbAI`
   - Click **"Search"**
   - Click **"Connect"** next to your repository

4. **Important: Configure Monorepo**
   - Since your code is in `rbai_server/` subdirectory, we need special config
   - Scroll down to **"Manual deploy"** section (we'll auto-deploy later)

---

### Step 4: Configure Backend Build Settings

1. **Go to Settings Tab**
   - Click **"Settings"** tab

2. **Add Buildpack**
   - Scroll down to **"Buildpacks"** section
   - Click **"Add buildpack"**
   - Select **"heroku/python"**
   - Click **"Save changes"**

3. **Configure Subdirectory (Monorepo Support)**
   - We need to create required files in `rbai_server/` first (next step)

---

### Step 5: Prepare Backend Code Files

You need to create two files in your `rbai_server/` directory:

#### Create `Procfile` in `rbai_server/`

Create a new file named `Procfile` (no extension) with this content:

```procfile
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
release: python scripts/init_backend.py
```

#### Create `runtime.txt` in `rbai_server/`

Create a file named `runtime.txt` with:

```txt
python-3.10.14
```

#### Commit and Push to GitHub

```powershell
# In your rbAI directory
cd rbai_server
# (Create Procfile and runtime.txt files)

git add Procfile runtime.txt
git commit -m "Add Heroku deployment files"
git push origin main
```

---

### Step 6: Set Backend Environment Variables

1. **Go to Settings Tab**
   - In your `rbai-server` app
   - Click **"Settings"** tab

2. **Reveal Config Vars**
   - Scroll to **"Config Vars"** section
   - Click **"Reveal Config Vars"**

3. **Add Required Variables**
   
   Click **"Add"** for each variable:

   | KEY | VALUE |
   |-----|-------|
   | `GROQ_API_KEY` | Your Groq API key |
   | `SECRET_KEY` | Random 32+ character string* |
   | `FRONTEND_URL` | `https://rbai-client.herokuapp.com` |
   | `ALLOWED_ORIGINS` | `https://rbai-client.herokuapp.com,http://localhost:5173` |

   **Note**: `DATABASE_URL` is automatically set by Postgres addon - don't add it manually!

   *Generate SECRET_KEY: Open PowerShell and run:
   ```powershell
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
   ```

4. **Save Each Variable**
   - After adding each key-value pair, it auto-saves

---

### Step 7: Deploy Backend (Manual Deploy)

Since we're using a monorepo (code in subdirectory), we need a workaround:

#### Option A: Using GitHub Actions (Recommended)

The repository includes GitHub Actions workflows for automatic deployment:

- **Backend**: `.github/workflows/deploy-backend.yml`
- **Frontend**: `.github/workflows/deploy-frontend.yml`

These workflows automatically deploy when you push changes to the `master` branch.

**Setup**:
1. Get Heroku API Key: 
   - Dashboard → Account Settings → API Key → Reveal → Copy
2. Add to GitHub Secrets:
   - GitHub repo → Settings → Secrets and variables → Actions → New repository secret
   - Name: `HEROKU_API_KEY`
   - Value: (paste your key)
3. Push changes to `master` branch to trigger auto-deploy

The workflows will:
- Trigger on pushes to `master` that modify `rbai_server/**` or `rbai_client/**`
- Can also be manually triggered via "Actions" tab → "Run workflow"
- Deploy only the relevant subdirectory using git subtree

#### Option B: Using Heroku CLI (Simpler for First Deploy)

If you prefer to avoid GitHub Actions for now, use the CLI just for deployment:

```powershell
# Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
# Login
heroku login

# Add git remote
heroku git:remote -a rbai-server

# Deploy backend subdirectory
git subtree push --prefix rbai_server heroku main
```

After first deploy via CLI, you can enable automatic deploys in dashboard.

---

### Step 8: Scale Backend Dyno

1. **Go to Resources Tab**
   - In your `rbai-server` app
   - Click **"Resources"** tab

2. **Change Dyno Type**
   - Click the **pencil/edit icon** next to `web` dyno
   - Click **"Change Dyno Type"**
   - Select **"Eco"** ($5/month - covered by credit)
   - Click **"Confirm"**

3. **Enable Dyno**
   - Toggle the dyno to **ON** (if not already)

4. **Verify Backend Running**
   - Click **"Open app"** (top right)
   - Should see FastAPI or a health endpoint
   - Or visit: `https://rbai-server.herokuapp.com/health`

---

### Step 9: Create Frontend App

1. **Go to Heroku Dashboard Home**
   - Click "Heroku" logo (top left) to go back to main dashboard

2. **Create New App**
   - Click **"New"** → **"Create new app"**
   - **App name**: `rbai-client`
   - **Region**: Same as backend (United States/Europe)
   - Click **"Create app"**

---

### Step 10: Prepare Frontend Code Files

#### Update `rbai_client/src/config.ts`

Make sure it uses production backend URL:

```typescript
// Use Heroku backend URL in production
export const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://rbai-server.herokuapp.com' 
    : 'http://localhost:8000');
```

#### Verify NGINX Configuration Exists

The frontend uses NGINX for serving static files. The configuration is already in the repository:

- **File**: `rbai_client/config/nginx.conf.erb`
- **Purpose**: Configures routing, caching, and clean URLs

#### Verify `package.json` has build script

In `rbai_client/package.json`, ensure:

```json
{
  "scripts": {
    "build": "vite build",
    "heroku-postbuild": "npm run build"
  }
}
```

#### Commit and Push

```powershell
cd rbai_client
# Verify config.ts is updated

cd ..
git add rbai_client/src/config.ts
git commit -m "Update frontend config for Heroku deployment"
git push origin main
```

> **Note**: The NGINX configuration (`config/nginx.conf.erb`) is already in the repository.

---

### Step 11: Configure Frontend Build Settings

1. **Go to Settings Tab** (in `rbai-client` app)

2. **Add Buildpacks (in order)**
   - Click **"Add buildpack"**
   - Select **"heroku/nodejs"** → Save
   - Click **"Add buildpack"** again
   - Enter URL: `heroku-community/nginx`
   - Click **"Save changes"**

3. **Set Config Vars**
   - Scroll to **"Config Vars"**
   - Click **"Reveal Config Vars"**
   - Add:

   | KEY | VALUE |
   |-----|-------|
   | `VITE_API_URL` | `https://rbai-server.herokuapp.com` |

---

### Step 12: Connect Frontend to GitHub

1. **Go to Deploy Tab**
   - Click **"Deploy"** tab

2. **Connect to GitHub**
   - Click **"GitHub"**
   - Search for: `rbAI`
   - Click **"Connect"**

3. **Deploy Frontend**
   
   **Option A: GitHub Actions** (if you set up `HEROKU_API_KEY` in Step 7):
   - Push changes to `master` branch
   - GitHub Actions will automatically deploy frontend
   - Check "Actions" tab to see deployment status

   **Option B: Manual CLI Deploy**:
   ```powershell
   heroku git:remote -a rbai-client
   git subtree push --prefix rbai_client heroku master
   ```

---

### Step 13: Scale Frontend Dyno

1. **Resources Tab** → Edit `web` dyno
2. **Change to Eco** ($5/month)
3. **Enable** dyno

4. **Test Frontend**
   - Click **"Open app"**
   - Should see your login page!

---

### Step 14: Automatic Deploys

**If using GitHub Actions** (recommended):
- Automatic deploys are already configured via the workflows
- Push changes to `master` branch to auto-deploy
- Backend auto-deploys when `rbai_server/**` changes
- Frontend auto-deploys when `rbai_client/**` changes

**If using Heroku Dashboard deploys**:
1. Go to each app's **Deploy** tab
2. Scroll to **"Automatic deploys"**
3. Choose branch: `master`
4. Click **"Enable Automatic Deploys"**

> **Note**: Heroku's automatic deploys from dashboard don't work well with monorepos (subdirectories). Use GitHub Actions for subdirectory deployments.

---

### Step 15: Deploy Execution Service

**Heroku cannot run Docker-in-Docker**, so deploy execution service separately:

#### Quick DigitalOcean Droplet Setup (Dashboard)

1. **Create Droplet**
   - Go to [cloud.digitalocean.com](https://cloud.digitalocean.com/)
   - Click **"Create"** → **"Droplets"**
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic - Regular - $6/month
   - **Region**: Singapore (or nearest to your users)
   - **Authentication**: SSH Key (recommended) or Password
   - **Hostname**: `rbai-execution`
   - Click **"Create Droplet"**

2. **Get Droplet IP**
   - Copy the public IPv4 address (e.g., `147.182.xxx.xxx`)

3. **SSH into Droplet**
   ```powershell
   # Use PowerShell SSH or PuTTY
   ssh root@YOUR_DROPLET_IP
   ```

4. **Install Docker**
   ```bash
   # Update system
   apt update && apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Verify
   docker --version
   ```

5. **Deploy Execution Service**
   ```bash
   # Clone repo
   git clone https://github.com/auxghlann/rbAI.git
   cd rbAI/rbAI_execution_service
   
   # Create .env file
   nano .env
   ```

   Add to `.env`:
   ```env
   EXECUTION_API_KEY=your-secure-random-key-32chars
   ALLOWED_ORIGINS=https://rbai-server.herokuapp.com
   ```

   Save (Ctrl+X, Y, Enter)

   ```bash
   # Build and run
   docker build -t rbai-execution .
   docker run -d \
     --name rbai-execution \
     -p 8080:8080 \
     --restart unless-stopped \
     -v /var/run/docker.sock:/var/run/docker.sock \
     --env-file .env \
     rbai-execution
   
   # Verify running
   docker ps
   curl http://localhost:8080/health
   ```

6. **Connect to Heroku Backend**
   - Go to `rbai-server` app → Settings → Config Vars
   - Add:

   | KEY | VALUE |
   |-----|-------|
   | `EXECUTION_SERVICE_URL` | `http://YOUR_DROPLET_IP:8080` |
   | `EXECUTION_API_KEY` | Same key from execution `.env` |

7. **Restart Backend**
   - Go to **"More"** (top right) → **"Restart all dynos"**

---

## ✅ Deployment Checklist

### GitHub Setup (Optional but Recommended)
- [ ] Added `HEROKU_API_KEY` to GitHub Secrets
- [ ] Verified `.github/workflows/deploy-backend.yml` exists
- [ ] Verified `.github/workflows/deploy-frontend.yml` exists
- [ ] Tested automatic deployment by pushing to `master`

### Backend Setup
- [ ] Created `rbai-server` app on Heroku
- [ ] Added Heroku Postgres addon (Mini or Hobby Dev)
- [ ] Created `Procfile` and `runtime.txt` in repo
- [ ] Connected GitHub repository
- [ ] Set all environment variables (GROQ_API_KEY, SECRET_KEY, FRONTEND_URL)
- [ ] Added Python buildpack
- [ ] Deployed code (GitHub Actions or CLI)
- [ ] Scaled to Eco dyno
- [ ] Verified `/health` endpoint works

### Frontend Setup
- [ ] Created `rbai-client` app on Heroku
- [ ] Verified `config/nginx.conf.erb` exists in repo
- [ ] Updated `config.ts` with production backend URL
- [ ] Connected GitHub repository
- [ ] Added Node.js and NGINX buildpacks
- [ ] Set VITE_API_URL config var
- [ ] Deployed code
- [ ] Scaled to Eco dyno
- [ ] Verified login page loads

### Database
- [ ] Postgres addon provisioned
- [ ] DATABASE_URL automatically set
- [ ] Database initialized (via release command in Procfile)

### Execution Service
- [ ] Created DigitalOcean droplet ($6/month)
- [ ] Installed Docker on droplet
- [ ] Deployed execution service container
- [ ] Added EXECUTION_SERVICE_URL to backend config vars
- [ ] Added matching EXECUTION_API_KEY
- [ ] Tested code execution works

### Final Verification
- [ ] Students can login at frontend URL
- [ ] Activities load correctly
- [ ] Code execution works end-to-end
- [ ] Analytics dashboard displays
- [ ] No errors in backend logs (Settings → View logs)

---

## 🔍 Monitoring & Maintenance (Dashboard)

### View Logs

1. **Go to your app** (backend or frontend)
2. **Click "More"** (top right) → **"View logs"**
3. Or install **"Papertrail"** addon for better log viewing:
   - Resources tab → Search "Papertrail" → Add free plan

### Database Management

1. **View Database**
   - Resources tab → Click "Heroku Postgres"
   - See connection info, size, table count

2. **Database Backups**
   - In Postgres addon page → "Durability" tab
   - Backups happen automatically daily
   - Click "Create Manual Backup" for immediate backup

3. **Connect to Database**
   - Install Heroku CLI for this feature
   - Or use dataclips for read-only queries

### Restart Apps

1. **Go to app dashboard**
2. **Click "More"** (top right)
3. **Click "Restart all dynos"**

### Check App Status

1. **Activity Tab** - See recent deployments
2. **Resources Tab** - See dyno status (on/off)
3. **Metrics Tab** - See performance graphs (requires paid dyno)

---

## 🆘 Troubleshooting

### Issue: Build Failed

**Check**:
1. Activity tab → Click on failed build → View build log
2. Common causes:
   - Missing `Procfile` or `runtime.txt`
   - Wrong buildpack order
   - npm install errors (check `package.json`)

**Fix**:
- Make sure files are in correct subdirectory
- Commit and push files to GitHub
- Trigger manual deploy again

### Issue: Application Error (H10)

**Symptom**: "Application error" when opening app

**Check**:
1. More → View logs
2. Look for errors like "Port binding timeout"

**Fix**:
- Make sure your app binds to `$PORT` environment variable
- Backend should use: `--port $PORT`
- Frontend buildpack should handle this automatically

### Issue: Database Connection Error

**Check**:
1. Resources tab → Verify Postgres addon exists
2. Settings → Config Vars → Verify `DATABASE_URL` is set

**Fix**:
- Don't manually edit DATABASE_URL (auto-set by addon)
- Make sure your code reads `os.getenv("DATABASE_URL")`

### Issue: Frontend Can't Reach Backend

**Check**:
1. Frontend config vars → `VITE_API_URL` correct?
2. Backend config vars → `FRONTEND_URL` includes frontend domain?
3. Backend config vars → `ALLOWED_ORIGINS` includes frontend URL?

**Fix**:
1. Update backend FRONTEND_URL and ALLOWED_ORIGINS
2. Rebuild frontend:
   - Make a small change to code
   - Commit and push (triggers redeploy)

### Issue: Code Execution Not Working

**Remember**: Execution service runs on separate droplet!

**Check**:
1. SSH into droplet: `docker ps` (should see container running)
2. Backend config vars → `EXECUTION_SERVICE_URL` and `EXECUTION_API_KEY` set?

**Fix**:
- Restart execution container: `docker restart rbai-execution`
- Check droplet firewall allows traffic on port 8080

---

## 📊 Cost Monitoring

### View Billing

1. **Click account menu** (top right)
2. **Account Settings**
3. **Billing** tab
4. See:
   - Current month usage
   - GitHub Student Pack credit remaining
   - Breakdown by app

### Expected Monthly Cost

With Student Pack:
- **2 Eco Dynos**: $10 (backend + frontend)
- **Postgres Mini**: $5
- **Student Credit**: -$13
- **Your Cost**: ~$2/month or $0 if using free DB tier

### Digital Ocean Cost
- **Droplet**: $6/month (from $200 credit)
- **Credit lasts**: ~33 months at $6/month

---

## 🎯 Next Steps After Deployment

1. **Test Everything**
   - Create test account
   - Run code execution
   - Check analytics work

2. **Set Up Monitoring**
   - Add Papertrail addon (free tier)
   - Use UptimeRobot for uptime monitoring

3. **Enable Auto-Deploys**
   - Deploy tab → Enable automatic deploys
   - Or set up GitHub Actions workflow

4. **Share With Users**
   - Your app is at: `https://rbai-client.herokuapp.com`
   - Backend API: `https://rbai-server.herokuapp.com`

---

## 🔗 Useful Resources

- [Heroku Dashboard](https://dashboard.heroku.com/)
- [Heroku Postgres Dashboard](https://data.heroku.com/)
- [GitHub Student Pack](https://education.github.com/pack)
- [DigitalOcean Cloud](https://cloud.digitalocean.com/)

---

**Questions?** Check [DEPLOYMENT_QUICKSTART.md](DEPLOYMENT_QUICKSTART.md) for comparison of all deployment options.

**Prefer Command Line?** See [DEPLOYMENT_HEROKU.md](DEPLOYMENT_HEROKU.md) for CLI version.
