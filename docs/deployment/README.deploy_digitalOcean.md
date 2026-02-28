# 🚀 DigitalOcean Droplet - Execution Service Deployment

Complete guide for deploying the rbAI Code Execution Microservice on DigitalOcean Droplets.

**Perfect for**: Docker-in-Docker code execution with GitHub Student Pack $200 credit

**For main app deployment**: See [DEPLOYMENT_DIGITALOCEAN_APP_PLATFORM.md](DEPLOYMENT_DIGITALOCEAN_APP_PLATFORM.md)

---

## 📋 Table of Contents
- [Overview](#overview)
- [Cost Breakdown](#cost-breakdown)
- [Prerequisites](#prerequisites)
- [Droplet Setup](#droplet-setup)
- [Deployment Steps](#deployment-steps)
- [Configuration](#configuration)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Overview

### Architecture

```
┌──────────────────────────────────────────────────────┐
│  DigitalOcean App Platform / Heroku / Railway        │
│                                                      │
│  ├─ Frontend (React)                                 │
│  ├─ Backend (FastAPI)  ───────┐                     │
│  └─ PostgreSQL Database       │                     │
│                                │                     │
└────────────────────────────────┼──────────────────────┘
                                 │
                                 │ HTTPS/HTTP
                                 │ (API calls with auth)
                                 ↓
┌──────────────────────────────────────────────────────┐
│  DigitalOcean Droplet (THIS GUIDE)                   │
│  Ubuntu 22.04 LTS (Basic - $6/month from credit)     │
│                                                      │
│  ├─ Docker Engine                                    │
│  ├─ Execution Microservice (FastAPI)                 │
│  │  └─ Port 8080 (exposed)                          │
│  │                                                   │
│  └─ Execution Containers (Python, Java)             │
│     └─ Isolated, resource-limited                   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**This guide covers**: Droplet setup for code execution service only

**For complete DigitalOcean deployment**: 
- Main app: [DEPLOYMENT_DIGITALOCEAN_APP_PLATFORM.md](DEPLOYMENT_DIGITALOCEAN_APP_PLATFORM.md)
- Execution: This guide

---

## 📚 Prerequisites

### 1. DigitalOcean Account with Student Credit

**Get $200 Credit**:
1. Visit [GitHub Student Pack](https://education.github.com/pack)
2. Verify student status
3. Find DigitalOcean offer
4. Click "Get access to DigitalOcean"
5. Create account or link existing one
6. Credit automatically applied

**Verify Credit**:
```
Login → Billing → Balance
Should show: $200.00 credit
```

### 2. SSH Key (Recommended)

**Generate SSH key** (if you don't have one):
```powershell
# Windows PowerShell
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Save to default location: C:\Users\YourName\.ssh\id_rsa
# Press Enter for no passphrase (or set one for security)
```

**Add to DigitalOcean**:
1. Go to Settings → Security → SSH Keys
2. Click "Add SSH Key"
3. Paste contents of `~/.ssh/id_rsa.pub`
4. Name it "My Laptop"

---

## 🛠️ Droplet Setup

### Step 1: Create Droplet

1. **Login to DigitalOcean**
   - Go to [cloud.digitalocean.com](https://cloud.digitalocean.com)

2. **Create → Droplets**

3. **Choose Region**
   - Select closest to your users
   - Example: New York, San Francisco, Singapore

4. **Choose Image**
   - **Ubuntu 22.04 LTS** (recommended)
   - Architecture: x64

5. **Choose Size**
   - **Basic Plan**
   - **Regular - $6/month**
   - 1 GB RAM / 1 vCPU / 25 GB SSD

6. **Choose Authentication**
   - ✅ **SSH Key** (recommended - safer)
   - Or: Password (simpler, less secure)

7. **Finalize Details**
   - Hostname: `rbai-execution-service`
   - Tags: `rbai`, `execution`, `production`
   - Backups: OFF (save $1.20/month, use snapshots if needed)
   - Monitoring: ON (free)

8. **Create Droplet**
   - Wait ~60 seconds for creation
   - Note the **Public IPv4 address** (e.g., `165.232.123.45`)

---

### Step 2: Configure Firewall

**Option A: DigitalOcean Cloud Firewall (Recommended)**

1. **Networking → Firewalls → Create Firewall**

   1. **Name**: `rbai-execution-firewall`

2. **Inbound Rules**:
   ```
   Type        Protocol    Ports     Sources
   SSH         TCP         22        Your IP (or All IPv4/IPv6 for flexibility)
   Custom      TCP         8080      All IPv4, All IPv6
   ```

3. **Outbound Rules**: Leave as default (All TCP/UDP/ICMP allowed)

4. **Apply to Droplets**: Select `rbai-execution-service`

5. **Create Firewall**

**Option B: UFW (Ubuntu Firewall) - On Droplet**
```bash
# SSH into droplet first, then:
sudo ufw allow 22/tcp
sudo ufw allow 8080/tcp
sudo ufw enable
sudo ufw status
```

---

## 📦 Deployment Steps

### Step 1: Connect to Droplet

#### On Windows (PowerShell):
```powershell
# Using SSH key
ssh root@YOUR_DROPLET_IP

# Or with password
ssh root@YOUR_DROPLET_IP
# Enter password when prompted
```

#### On Linux/Mac:
```bash
ssh root@YOUR_DROPLET_IP
```

**First-time connection**: Type `yes` when asked about fingerprint.

---

### Step 2: Initial Server Setup

```bash
# Update system
apt update && apt upgrade -y

# Create non-root user for security
adduser rbai
usermod -aG sudo rbai

# Add SSH key to new user (if using SSH keys)
rsync --archive --chown=rbai:rbai ~/.ssh /home/rbai

# Switch to new user
su - rbai
```

**Optional but recommended**: From now on, use `ssh rbai@YOUR_DROPLET_IP` instead of `root`.

---

### Step 3: Install Docker

```bash
# Install Docker using official script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group (no sudo needed)
sudo usermod -aG docker $USER

# Apply group changes
newgrp docker

# Verify installation
docker --version
docker run hello-world

# Enable Docker to start on boot
sudo systemctl enable docker
```

---

### Step 4: Clone Repository

```bash
# Install Git (if not already installed)
sudo apt install -y git

# Clone your repository
git clone https://github.com/YOUR_USERNAME/rbAI.git

# Navigate to execution service
cd rbAI/rbAI_execution_service
```

**Private repository?** Use personal access token:
```bash
git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/rbAI.git
```

---

### Step 5: Configure Environment Variables

```bash
# Create .env file
cp .env.example .env

# Edit with nano
nano .env
```

**Set these values**:
```bash
# Generate secure API key
EXECUTION_API_KEY=your-super-secure-random-api-key-change-this

# Your main backend URLs (for CORS)
# App Platform:
ALLOWED_ORIGINS=https://rbai-backend-xxxxx.ondigitalocean.app

# Or Heroku:
# ALLOWED_ORIGINS=https://rbai-backend.herokuapp.com

# Or Railway:
# ALLOWED_ORIGINS=https://your-app.railway.app

# Or multiple (comma-separated):
# ALLOWED_ORIGINS=https://backend.herokuapp.com,https://backend.railway.app

# Port (default is fine)
PORT=8080

# Optional: Logging level
LOG_LEVEL=info
```

**Generate secure API key**:
```bash
# On the droplet
openssl rand -hex 32
```

**Save and exit**: `Ctrl+X`, then `Y`, then `Enter`

---

### Step 6: Build and Run with Docker

```bash
# Build Docker image
docker build -t rbai-execution-service .

# Run container with Docker socket mounted
docker run -d \
  --name rbai-executor \
  -p 8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --env-file .env \
  --restart unless-stopped \
  rbai-execution-service

# Verify container is running
docker ps

# Check logs
docker logs rbai-executor

# Follow logs in real-time
docker logs -f rbai-executor
```

**Container options explained**:
- `-d`: Run in background (detached)
- `--name`: Name for easy reference
- `-p 8080:8080`: Expose port
- `-v /var/run/docker.sock`: Mount Docker socket (enables Docker-in-Docker)
- `--env-file`: Load environment variables
- `--restart unless-stopped`: Auto-restart on crashes or reboots

---

### Step 7: Test the Service

```bash
# Test health endpoint (from droplet)
curl http://localhost:8080/health

# Test from your local machine
curl http://YOUR_DROPLET_IP:8080/health

# Should return:
# {"status":"healthy","timestamp":"...","docker_available":true}
```

**Test code execution**:
```bash
curl -X POST http://YOUR_DROPLET_IP:8080/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-from-env" \
  -d '{
    "code": "print(\"Hello from DigitalOcean!\")",
    "language": "python",
    "timeout": 30
  }'

# Should return:
# {"success":true,"output":"Hello from DigitalOcean!\n","exit_code":0,...}
```

✅ **Success!** Your execution service is live.

---

### Step 8: Connect to Main Backend

Now link your main backend to this execution service.

**On DigitalOcean App Platform**:
1. Apps → rbai-backend → Settings → Environment Variables
2. Add:
   - `EXECUTION_SERVICE_URL` = `http://YOUR_DROPLET_IP:8080`
   - `EXECUTION_API_KEY` = `your-api-key-from-env`
3. Save (auto-redeploys)

**On Heroku**:
```bash
heroku config:set \
  EXECUTION_SERVICE_URL=http://YOUR_DROPLET_IP:8080 \
  EXECUTION_API_KEY=your-api-key-from-env \
  -a rbai-backend

# Restart backend
heroku restart -a rbai-backend
```

**On Railway**:
1. Go to your backend service
2. Variables tab
3. Add:
   - `EXECUTION_SERVICE_URL` = `http://YOUR_DROPLET_IP:8080`
   - `EXECUTION_API_KEY` = `your-api-key-from-env`
4. Redeploy automatically happens

**⚠️ Important**: The `EXECUTION_API_KEY` must match on both sides!

---

## 🔧 Configuration

### Environment Variables

**`.env` file on Droplet**:
```bash
EXECUTION_API_KEY=your-secure-api-key-here
ALLOWED_ORIGINS=https://your-backend.herokuapp.com,https://your-app.railway.app
PORT=8080
LOG_LEVEL=info
```

### Updating Configuration

```bash
# SSH into droplet
ssh rbai@YOUR_DROPLET_IP

# Edit .env
cd rbAI/rbAI_execution_service
nano .env

# Restart container to apply changes
docker restart rbai-executor

# Verify changes
docker logs rbai-executor
```

---

## 🔍 Monitoring & Maintenance

### DigitalOcean Dashboard Monitoring

**Built-in metrics** (no setup needed):
- CPU usage
- RAM usage
- Disk usage
- Bandwidth
- Droplet availability

**Access**: Droplets → Your Droplet → Graphs

### View Logs

```bash
# View recent logs
docker logs rbai-executor

# Follow logs in real-time
docker logs -f rbai-executor

# Last 100 lines
docker logs --tail 100 rbai-executor

# Filter for errors
docker logs rbai-executor 2>&1 | grep ERROR
```

### Check Resource Usage

```bash
# Docker stats (live updating)
docker stats rbai-executor

# Droplet resource usage
htop
# Or
top

# Disk usage
df -h

# Memory usage
free -h
```

### Update Code

```bash
# SSH into droplet
ssh rbai@YOUR_DROPLET_IP
cd rbAI/rbAI_execution_service

# Pull latest code
git pull origin main

# Rebuild image
docker build -t rbai-execution-service .

# Stop old container
docker stop rbai-executor
docker rm rbai-executor

# Run new container
docker run -d \
  --name rbai-executor \
  -p 8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --env-file .env \
  --restart unless-stopped \
  rbai-execution-service

# Verify
docker logs -f rbai-executor
```

**Or use script**:
```bash
#!/bin/bash
# save as update.sh
cd ~/rbAI/rbAI_execution_service
git pull origin main
docker build -t rbai-execution-service .
docker stop rbai-executor && docker rm rbai-executor
docker run -d \
  --name rbai-executor \
  -p 8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --env-file .env \
  --restart unless-stopped \
  rbai-execution-service
docker logs -f rbai-executor
```

```bash
# Make executable
chmod +x update.sh

# Run updates
./update.sh
```

---

## 🔄 Backup & Recovery

### Create Snapshot (Backup)

**From DigitalOcean Dashboard**:
1. Droplets → Your Droplet → Snapshots
2. "Take Snapshot"
3. Name: `rbai-execution-backup-2026-02-24`
4. Wait 2-5 minutes

**Cost**: ~$0.05/GB/month (~$1.25/month for 25GB droplet)

**Use case**: Before major updates, save working state

### Restore from Snapshot

1. Destroy current droplet (optional)
2. Create → Droplets
3. Choose Image → Snapshots → Select your snapshot
4. Same size/region as original
5. Create Droplet
6. Update backend with new IP address

---

## 🆘 Troubleshooting

### Issue: Can't SSH into Droplet

**Symptom**: Connection timeout or refused

**Checks**:
```bash
# Verify droplet is running (from Dashboard)
# Check firewall allows SSH port 22
# Verify you're using correct IP
```

**Fix**:
- Ensure firewall allows your IP on port 22
- Use DigitalOcean Console (Droplets → Your Droplet → Access → Launch Console)

### Issue: Health Endpoint Returns 404

**Symptom**: `curl http://IP:8080/health` fails

**Check**:
```bash
# SSH into droplet
docker ps  # Is container running?
docker logs rbai-executor  # Any errors?

# Test from inside droplet
curl http://localhost:8080/health
```

**Common causes**:
- Container not running: `docker ps` shows nothing
- Port not exposed: Check firewall and docker run command
- Service crashed: Check logs for errors

**Fix**:
```bash
# Restart container
docker restart rbai-executor

# Or rebuild and rerun
docker stop rbai-executor && docker rm rbai-executor
# Run docker run command again from Step 6
```

### Issue: Code Execution Fails

**Symptom**: `/execute` endpoint returns errors

**Check logs**:
```bash
docker logs rbai-executor
```

**Common causes**:
1. **Docker socket not mounted**: Check `-v /var/run/docker.sock:/var/run/docker.sock`
2. **Images not pulled**: First run pulls images (slow)
3. **Resource limits**: Container out of memory

**Fix**:
```bash
# Manually pull images
docker pull python:3.10-slim
docker pull openjdk:17-slim

# Check Docker is accessible
docker run hello-world

# Restart with correct socket mount
docker stop rbai-executor && docker rm rbai-executor
# Use command from Step 6 with socket mount
```

### Issue: "Permission Denied" on Docker Socket

**Symptom**: Can't access Docker inside container

**Fix**:
```bash
# Check socket permissions
ls -l /var/run/docker.sock

# Should show: srw-rw---- 1 root docker
# If not:
sudo chmod 666 /var/run/docker.sock

# Or properly: ensure appuser in Dockerfile is in docker group
```

### Issue: High CPU/Memory Usage

**Check**:
```bash
docker stats rbai-executor
htop
```

**Causes**:
- Multiple execution containers running
- Memory leak
- Too many concurrent requests

**Fix**:
```bash
# Clean up stopped containers
docker container prune -f

# Restart service
docker restart rbai-executor

# Upgrade droplet size if needed
# Dashboard → Droplet → Resize
```

---

## 💳 Managing Credit & Billing

### Check Credit Balance

1. **Dashboard → Billing → Balance**
2. Shows: Remaining credit, monthly burn rate

### Set Billing Alerts

1. **Dashboard → Billing → Alerts**
2. **Add Alert**:
   - Name: "90% Credit Used"
   - Threshold: $180 (90% of $200)
3. **Add Another Alert**:
   - Name: "95% Credit Used"
   - Threshold: $190

### Stop Charges

**Option 1: Power Off** (Still charges for storage)
```
Dashboard → Droplets → Your Droplet → Power → Power Off
Cost: ~$1.20/month for storage
```

**Option 2: Destroy Droplet** (Stops ALL charges ✅)
```
Dashboard → Droplets → Your Droplet → Destroy
Cost: $0

⚠️ Warning: All data lost unless you created snapshot!
```

**Hourly Billing**: Charges stop immediately when destroyed.

### Recreate After Destroying

1. Create snapshot before destroying
2. When ready, create new droplet from snapshot
3. Update backend with new IP address
4. Everything restored!

---

## ✅ Deployment Checklist

- [ ] Created DigitalOcean account
- [ ] Applied GitHub Student Pack ($200 credit)
- [ ] Created droplet (Basic $6/month)
- [ ] Configured firewall (port 22, 8080)
- [ ] SSH into droplet successfully
- [ ] Installed Docker
- [ ] Cloned repository
- [ ] Created `.env` with secure API key
- [ ] Built Docker image
- [ ] Ran container with socket mount
- [ ] Tested health endpoint
- [ ] Tested code execution
- [ ] Connected to main backend (App Platform/Heroku/Railway)
- [ ] Verified end-to-end code execution
- [ ] Set billing alerts ($180, $190)
- [ ] Documented droplet IP in safe place

---

## 🎯 Next Steps

1. **Deploy Main App** (if not already done)
   - **DigitalOcean App Platform**: [DEPLOYMENT_DIGITALOCEAN_APP_PLATFORM.md](DEPLOYMENT_DIGITALOCEAN_APP_PLATFORM.md)
   - **Heroku**: [DEPLOYMENT_HEROKU.md](DEPLOYMENT_HEROKU.md)
   - **Railway**: [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)

2. **Connect to Main App**
   - Update main backend with `EXECUTION_SERVICE_URL`
   - Match `EXECUTION_API_KEY` on both sides

3. **Test End-to-End**
   - Login to frontend
   - Run code execution in activity
   - Verify it works!

4. **Set Up Monitoring**
   - Check DigitalOcean graphs daily
   - Monitor logs for errors

5. **Optional: Domain Name**
   - Point domain to droplet IP
   - Set up SSL with certbot
   - Use `https://execution.yourdomain.com`

---

## 📚 Useful Commands Reference

```bash
# Connect to droplet
ssh rbai@YOUR_DROPLET_IP

# Container management
docker ps                      # List running containers
docker logs -f rbai-executor   # View logs
docker restart rbai-executor   # Restart container
docker stats rbai-executor     # Resource usage

# Updates
cd ~/rbAI/rbAI_execution_service
git pull
docker build -t rbai-execution-service .
docker stop rbai-executor && docker rm rbai-executor
# Run docker run command again

# Monitoring
htop                           # System resources
df -h                          # Disk usage
free -h                        # Memory usage
docker system df               # Docker disk usage

# Cleanup
docker container prune -f      # Remove stopped containers
docker image prune -a -f       # Remove unused images
docker system prune -a -f      # Full cleanup

# Firewall (if using UFW)
sudo ufw status                # Check firewall
sudo ufw allow 8080/tcp        # Open port
sudo ufw reload                # Apply changes
```

---

## 🔗 Additional Resources

- [DigitalOcean Docs](https://docs.digitalocean.com/)
- [Docker on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [GitHub Student Pack](https://education.github.com/pack)
- [DigitalOcean Community Tutorials](https://www.digitalocean.com/community/tutorials)

---

**Questions?** 
- **Overview**: [DEPLOYMENT_QUICKSTART.md](DEPLOYMENT_QUICKSTART.md)
- **Main app on DigitalOcean**: [DEPLOYMENT_DIGITALOCEAN_APP_PLATFORM.md](DEPLOYMENT_DIGITALOCEAN_APP_PLATFORM.md)

**Ready to deploy?** Start with Droplet Setup and work through sequentially. Your $200 credit makes this FREE for 33+ months! 🎉
