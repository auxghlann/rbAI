# 🚀 Complete Deployment with Docker Compose (DigitalOcean/VPS)

Deploy the entire rbAI application (backend + frontend + database) to a single VPS using Docker Compose.

**Perfect for**: Cost-effective deployment with full control, GitHub Student Pack users with $200 DigitalOcean credit.

---

## 📋 Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Initial Server Setup](#initial-server-setup)
- [Deployment Steps](#deployment-steps)
- [Configuration](#configuration)
- [Domain Setup (Optional)](#domain-setup-optional)
- [SSL/HTTPS Setup](#ssl-https-setup)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Overview

### Architecture

```
┌──────────────────────────────────────────────────────┐
│  DigitalOcean Droplet / VPS ($6-12/month)            │
│  Ubuntu 22.04 LTS                                    │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  Docker Compose                                 │ │
│  │                                                 │ │
│  │  ├─ Frontend Container (NGINX)                 │ │
│  │  │  └─ Port 80/443                             │ │
│  │  │                                              │ │
│  │  ├─ Backend Container (FastAPI)                │ │
│  │  │  └─ Port 8000                               │ │
│  │  │  └─ Mounts Docker socket for code execution│ │
│  │  │                                              │ │
│  │  └─ Database Volume                            │ │
│  │     └─ Persistent SQLite storage               │ │
│  │                                                 │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### What You Get

✅ **All-in-one deployment**: Backend, frontend, and database  
✅ **Code execution works**: Docker socket access included  
✅ **Persistent data**: Database stored in Docker volume  
✅ **Auto-restart**: Containers restart on failure or reboot  
✅ **Simple updates**: One command to redeploy  
✅ **Cost-effective**: $6-12/month total

---

## 📚 Prerequisites

### 1. DigitalOcean Account

**Option A: GitHub Student Pack** (Recommended - $200 credit):
1. Visit [GitHub Student Pack](https://education.github.com/pack)
2. Verify student status
3. Find DigitalOcean offer → "Get access"
4. Create/link account → Receive $200 credit

**Option B: Regular Account**:
1. Sign up at [DigitalOcean](https://www.digitalocean.com/)
2. Add payment method
3. Optionally use referral link for initial credit

### 2. Domain Name (Optional but Recommended)

**Free options**:
- [Freenom](https://www.freenom.com/) - Free `.tk`, `.ml`, `.ga`, `.cf`, `.gq` domains
- [Github Education](https://education.github.com/pack) - Free `.me` domain via Namecheap

**Paid options** (~$10-15/year):
- [Namecheap](https://www.namecheap.com/)
- [Google Domains](https://domains.google/)
- [Cloudflare](https://www.cloudflare.com/products/registrar/)

### 3. SSH Key (Recommended)

```powershell
# Windows PowerShell
ssh-keygen -t ed25519 -C "your-email@example.com"

# Press Enter to save to default location
# Set a passphrase or press Enter to skip
```

Your public key is at: `C:\Users\YourName\.ssh\id_ed25519.pub`

---

## 🛠️ Initial Server Setup

### Step 1: Create a Droplet

1. **Go to DigitalOcean Dashboard** → [Create Droplet](https://cloud.digitalocean.com/droplets/new)

2. **Choose Configuration**:
   - **Image**: Ubuntu 22.04 LTS x64
   - **Droplet Type**: Basic
   - **CPU Options**: Regular (Disk)
   - **Size**: $6/month (1 GB RAM, 1 vCPU, 25 GB SSD) - Good for testing
     - Or $12/month (2 GB RAM, 1 vCPU, 50 GB SSD) - Better for production

3. **Choose Region**:
   - Select closest to your users (e.g., New York, San Francisco, London)

4. **Authentication**:
   - **Recommended**: SSH Key (upload your public key from Prerequisites)
   - **Alternative**: Password (less secure)

5. **Additional Options** (optional):
   - ✅ IPv6
   - ✅ Monitoring (free)

6. **Hostname**: `rbai-app` (or your preference)

7. **Click "Create Droplet"**

Wait ~60 seconds for droplet to be ready. Note the **IP address** displayed.

### Step 2: Initial Server Connection

```powershell
# Connect to your droplet
ssh root@YOUR_DROPLET_IP

# If using SSH key, it will connect directly
# If using password, enter the root password sent to your email
```

### Step 3: Update System

```bash
# Update package lists
apt update

# Upgrade installed packages
apt upgrade -y

# Install essential tools
apt install -y curl git vim htop ufw
```

### Step 4: Configure Firewall

```bash
# Allow SSH (important - do this first!)
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS (for later SSL setup)
ufw allow 443/tcp

# Allow backend API (optional - only if accessing directly)
ufw allow 8000/tcp

# Enable firewall
ufw --force enable

# Check status
ufw status
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
8000/tcp                   ALLOW       Anywhere
```

### Step 5: Install Docker

```bash
# Install Docker using official script
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Start Docker service
systemctl start docker
systemctl enable docker

# Verify installation
docker --version
docker compose version
```

Expected output:
```
Docker version 24.x.x, build xxxxx
Docker Compose version v2.x.x
```

### Step 6: Create Application User (Optional but Recommended)

```bash
# Create non-root user
adduser rbai

# Add to docker group
usermod -aG docker rbai

# Add to sudo group (for system management)
usermod -aG sudo rbai

# Switch to new user
su - rbai
```

From now on, use the `rbai` user for deployment. To switch users:
```bash
su - rbai
```

---

## 🚀 Deployment Steps

### Step 1: Clone Repository

```bash
# Choose deployment location
cd ~

# Clone your repository
git clone https://github.com/YOUR_USERNAME/rbAI.git
cd rbAI
```

**If using private repository**:
```bash
# Generate SSH key on server
ssh-keygen -t ed25519 -C "rbai-server"

# Display public key
cat ~/.ssh/id_ed25519.pub

# Add this key to GitHub: Settings → SSH and GPG Keys → New SSH Key
# Then clone with SSH:
git clone git@github.com:YOUR_USERNAME/rbAI.git
cd rbAI
```

### Step 2: Configure Environment Variables

```bash
# Create environment file
nano .env
```

Add the following (replace with your actual values):

```env
# API Keys
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Environment
ENVIRONMENT=production

# Database (for SQLite in docker-compose.prod.yml)
DATABASE_PATH=/app/db/rbai.db

# Frontend API URL (use your domain or droplet IP)
VITE_API_URL=http://YOUR_DROPLET_IP:8000
```

**Save and exit**: `Ctrl+X`, then `Y`, then `Enter`

**Important**: If you have a domain name, use it instead of the IP:
```env
VITE_API_URL=http://yourdomain.com:8000
# Or with SSL: https://yourdomain.com
```

### Step 3: Create Database Volume

```bash
# Create persistent volume for database
docker volume create rbai_server_db

# Verify volume created
docker volume ls
```

### Step 4: Review docker-compose.prod.yml

```bash
# Check the configuration
cat docker-compose.prod.yml
```

The file should look correct. Key points:
- ✅ Backend on port 8000
- ✅ Frontend on port 80
- ✅ Database volume mounted
- ✅ Docker socket mounted for code execution

### Step 5: Build and Start Services

```bash
# Build images (first time only, takes 5-10 minutes)
docker compose -f docker-compose.prod.yml build

# Start services in detached mode
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
```

Expected output:
```
NAME                 IMAGE               STATUS          PORTS
rbai-client-prod     rbai-frontend       Up 10 seconds   0.0.0.0:80->80/tcp
rbai-server-prod     rbai-backend        Up 10 seconds   0.0.0.0:8000->8000/tcp
```

### Step 6: Check Logs

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs

# Follow logs (Ctrl+C to exit)
docker compose -f docker-compose.prod.yml logs -f

# View only backend logs
docker compose -f docker-compose.prod.yml logs backend

# View only frontend logs
docker compose -f docker-compose.prod.yml logs frontend
```

Look for:
- ✅ Backend: "Application startup complete"
- ✅ Frontend: NGINX started successfully
- ❌ No errors about missing environment variables

### Step 7: Initialize Database

```bash
# Access backend container
docker exec -it rbai-server-prod bash

# Inside container, run initialization
python scripts/init_backend.py

# Exit container
exit
```

### Step 8: Test Deployment

**Test backend API**:
```bash
# From your server
curl http://localhost:8000/health

# Expected response:
# {"status":"ok","service":"rbAI API"}
```

**Test frontend**:
```bash
# From your server
curl http://localhost:80

# Should return HTML content
```

**Test from your computer**:

Open browser and visit:
- Frontend: `http://YOUR_DROPLET_IP`
- Backend API: `http://YOUR_DROPLET_IP:8000/docs`

You should see the login page!

---

## 🔧 Configuration

### Update Frontend API URL

If you're getting CORS errors or the frontend can't connect to backend:

1. **Edit .env file**:
```bash
nano .env
```

2. **Update VITE_API_URL**:
```env
# Use droplet IP
VITE_API_URL=http://YOUR_DROPLET_IP:8000

# Or use domain (if configured)
VITE_API_URL=http://yourdomain.com:8000
```

3. **Rebuild frontend**:
```bash
docker compose -f docker-compose.prod.yml up -d --build frontend
```

### Add CORS Origins

If frontend is on different domain/port than backend:

1. **Edit backend environment** in `.env`:
```env
ALLOWED_ORIGINS=http://YOUR_DROPLET_IP,http://yourdomain.com
```

2. **Restart backend**:
```bash
docker compose -f docker-compose.prod.yml restart backend
```

---

## 🌐 Domain Setup (Optional)

### Step 1: Point Domain to Droplet

In your domain registrar's DNS settings:

**Add A Record**:
- **Type**: A
- **Name**: @ (root domain) or `app` (for subdomain)
- **Value**: YOUR_DROPLET_IP
- **TTL**: 3600 (or default)

**Add A Record for www** (optional):
- **Type**: A
- **Name**: www
- **Value**: YOUR_DROPLET_IP
- **TTL**: 3600

Wait 5-60 minutes for DNS propagation.

**Test DNS**:
```bash
# From your computer
nslookup yourdomain.com
```

Should return your droplet IP.

### Step 2: Update Frontend Configuration

```bash
# Edit .env on server
nano .env
```

Update:
```env
VITE_API_URL=http://yourdomain.com:8000
```

Rebuild frontend:
```bash
docker compose -f docker-compose.prod.yml up -d --build frontend
```

---

## 🔒 SSL/HTTPS Setup

### Option 1: Using Nginx Proxy Manager (Easiest)

**Install Nginx Proxy Manager**:

```bash
# Create directory for NPM
mkdir ~/nginx-proxy-manager
cd ~/nginx-proxy-manager

# Create docker-compose.yml for NPM
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  app:
    image: 'jc21/nginx-proxy-manager:latest'
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
      - '81:81'
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
EOF

# Start NPM
docker compose up -d
```

**Configure via Web UI**:
1. Open `http://YOUR_DROPLET_IP:81`
2. Default login:
   - Email: `admin@example.com`
   - Password: `changeme`
3. Change password immediately
4. Add Proxy Hosts:
   - **Frontend**: `yourdomain.com` → `rbai-client-prod:80`
   - **Backend**: `api.yourdomain.com` → `rbai-server-prod:8000`
5. Request SSL certificates (automatic Let's Encrypt)

### Option 2: Manual Certbot Setup

```bash
# Install Certbot
apt install -y certbot

# Stop services temporarily
cd ~/rbAI
docker compose -f docker-compose.prod.yml stop frontend

# Get certificate
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Start services
docker compose -f docker-compose.prod.yml start frontend

# Certificates are at: /etc/letsencrypt/live/yourdomain.com/
```

You'll need to configure NGINX in the frontend container to use these certificates.

---

## 📊 Monitoring & Maintenance

### Check Service Status

```bash
# View running containers
docker compose -f docker-compose.prod.yml ps

# View resource usage
docker stats

# View logs
docker compose -f docker-compose.prod.yml logs -f --tail=100
```

### Update Application

```bash
# Navigate to repo
cd ~/rbAI

# Pull latest changes
git pull origin master

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Check logs for errors
docker compose -f docker-compose.prod.yml logs -f
```

### Backup Database

```bash
# Create backup directory
mkdir -p ~/backups

# Backup database volume
docker run --rm \
  -v rbai_server_db:/data \
  -v ~/backups:/backup \
  alpine tar czf /backup/rbai-db-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .

# List backups
ls -lh ~/backups/
```

### Restore Database

```bash
# Stop backend
docker compose -f docker-compose.prod.yml stop backend

# Restore from backup
docker run --rm \
  -v rbai_server_db:/data \
  -v ~/backups:/backup \
  alpine sh -c "cd /data && tar xzf /backup/rbai-db-TIMESTAMP.tar.gz"

# Start backend
docker compose -f docker-compose.prod.yml start backend
```

### Auto-restart on Server Reboot

Docker Compose services with `restart: unless-stopped` will automatically start on reboot.

**Verify**:
```bash
# Reboot server
sudo reboot

# After reboot, check containers
docker compose -f ~/rbAI/docker-compose.prod.yml ps
```

---

## 🐛 Troubleshooting

### Containers Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Remove containers and restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Check system resources
df -h  # Disk space
free -h  # Memory
```

### Frontend Can't Connect to Backend

**Check VITE_API_URL**:
```bash
# View frontend environment
docker exec rbai-client-prod env | grep VITE

# Should show your backend URL
```

**Fix**:
1. Edit `.env` and set correct `VITE_API_URL`
2. Rebuild: `docker compose -f docker-compose.prod.yml up -d --build frontend`

### Code Execution Not Working

**Check Docker socket permissions**:
```bash
# Verify socket is mounted
docker exec rbai-server-prod ls -l /var/run/docker.sock

# Should show: srw-rw---- 1 root docker
```

**Fix user permissions**:
```bash
# The backend user needs to be in docker group
# This is configured in docker-compose.prod.yml with user: "1000:0"
```

### Database Errors

```bash
# Check volume exists
docker volume ls | grep rbai_server_db

# Check database file inside container
docker exec rbai-server-prod ls -la /app/db/

# Reinitialize database
docker exec -it rbai-server-prod python scripts/init_backend.py
```

### Port Already in Use

```bash
# Check what's using port 80
sudo lsof -i :80

# Check what's using port 8000
sudo lsof -i :8000

# Stop conflicting service or change ports in docker-compose.prod.yml
```

### High Memory Usage

```bash
# Check container memory
docker stats

# Restart containers
docker compose -f docker-compose.prod.yml restart

# If OOM (Out of Memory), upgrade droplet to 2GB RAM
```

---

## 📋 Deployment Checklist

### Server Setup
- [ ] Created DigitalOcean droplet (1-2 GB RAM)
- [ ] Updated system packages
- [ ] Configured firewall (SSH, HTTP, HTTPS)
- [ ] Installed Docker and Docker Compose
- [ ] Created application user (optional)

### Application Deployment
- [ ] Cloned repository to server
- [ ] Created `.env` file with API keys
- [ ] Created database volume
- [ ] Built Docker images
- [ ] Started services with docker-compose
- [ ] Initialized database
- [ ] Verified backend `/health` endpoint
- [ ] Verified frontend loads in browser

### Optional Configuration
- [ ] Configured domain name (DNS)
- [ ] Set up SSL/HTTPS
- [ ] Configured automatic backups
- [ ] Set up monitoring/alerts

### Testing
- [ ] Can access frontend via browser
- [ ] Can login to application
- [ ] Activities load correctly
- [ ] Code execution works
- [ ] Analytics display properly

---

## 💰 Cost Breakdown

### DigitalOcean Droplet

| Droplet Size | RAM | vCPU | Storage | Cost/Month | Suitable For |
|--------------|-----|------|---------|------------|--------------|
| Basic | 1 GB | 1 | 25 GB | $6 | Testing, light use |
| Basic | 2 GB | 1 | 50 GB | $12 | Production, 10-50 users |
| Basic | 4 GB | 2 | 80 GB | $24 | Production, 50-200 users |

**With GitHub Student Pack**: $200 credit covers:
- $6/month = 33 months
- $12/month = 16 months
- $24/month = 8 months

### Optional Add-ons

- **Domain**: $10-15/year (or free via Student Pack)
- **Backups**: $1.20/month (20% of droplet cost)
- **Monitoring**: Free (DigitalOcean built-in)

### Total Cost

**Testing/Personal**: $6/month ($72/year)  
**Production (recommended)**: $12/month ($144/year)  
**High-traffic**: $24/month ($288/year)

---

## 🔗 Useful Resources

- [DigitalOcean Dashboard](https://cloud.digitalocean.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Nginx Proxy Manager](https://nginxproxymanager.com/)
- [GitHub Student Pack](https://education.github.com/pack)

---

## 🎉 Next Steps

1. **Monitor your application**: Check logs regularly
2. **Set up automated backups**: Schedule daily database backups
3. **Configure SSL**: Secure your application with HTTPS
4. **Set up monitoring**: Use DigitalOcean monitoring or external services
5. **Document your setup**: Keep notes on configuration and passwords
6. **Test disaster recovery**: Practice restoring from backup

**Questions?** Check the [main README](../../README.md) or [troubleshooting section](#troubleshooting).

---

**Deployment Status**: ✅ Complete  
**Estimated Setup Time**: 30-45 minutes  
**Difficulty**: Beginner to Intermediate
